/** Controles adicionales: no simulan un PASS si faltan datos de ejecución. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

function walk(dir, ext, max=600) {
  if (!existsSync(dir)) return [];
  let out=[];
  for (const e of readdirSync(dir,{withFileTypes:true})) {
    if(out.length>=max) break;
    const p=join(dir,e.name);
    if(e.isDirectory() && !['node_modules','dist','coverage','.git'].includes(e.name))out.push(...walk(p,ext,max-out.length));
    else if(e.isFile() && ext.some(s=>e.name.endsWith(s))) out.push(p);
  }
  return out;
}
const read=p=>readFileSync(p,'utf8');
function result(results,id,description,status,reason,type='CODIGO') {results.push({id,description,status,reason,type});}
function frontendDir(backend) {
  if(process.env.SECURITY_FRONTEND_PATH)return resolve(process.env.SECURITY_FRONTEND_PATH);
  // Repositorios hermanos del equipo, carpeta frontend ubicada en su raíz
  const sibling=resolve(backend,'..','..','A-Walking-Dictionary-NovaCode-Front-end');
  return existsSync(join(sibling,'src'))?sibling:null;
}
export async function runAdvanced({backend,url,request,results,serverAvailable}) {
  const f=frontendDir(backend);
  const dicRepo=join(backend,'src/repositories/DiccionarioRepository.js');
  if(existsSync(dicRepo)){
    const sql=read(dicRepo);
    const pass=/pool\.query\s*\(/.test(sql) && /\$1/.test(sql) && /\[\s*termino\.trim\(\)\s*\]/.test(sql) && /revisado_docente/.test(sql);
    result(results,'SQLi-01','Consulta del diccionario parametrizada y filtrada',pass?'PASS':'FAIL',pass?'La búsqueda envía termino.trim() como parámetro $1 y restringe tarjetas a revisado_docente':'No se pudo demostrar parametrización del endpoint en el repositorio','CODIGO');
  } else result(results,'SQLi-01','Consulta del diccionario parametrizada','SKIP','Archivo DiccionarioRepository.js no disponible','CODIGO');
  if(serverAvailable){
    for (const [id,q] of [['SQLi-02',"' OR 1=1 --"],['SQLi-03',"') OR ('1'='1"]]){
      try {
        const r=await request('/api/v1/dictionary?q='+encodeURIComponent(q));
        const valid=r.code===200 && Array.isArray(r.json?.data) && r.json.data.every(x=>x.estado==='revisado_docente') && r.json.data.length===0;
        result(results,id,'Entrada SQL maliciosa no altera búsqueda',valid?'PASS':'FAIL',`HTTP ${r.code}; resultados ${Array.isArray(r.json?.data)?r.json.data.length:'no-array'}; esperado: 200 y sin coincidencias para la cadena`, 'HTTP/BD');
      }catch(e){ result(results,id,'Entrada SQL maliciosa no altera búsqueda','SKIP',`No se completó la petición: ${e.name}`,'HTTP/BD'); }
    }
  }else result(results,'SQLi-02/03','Pruebas SQLi con PostgreSQL real','SKIP',`Para ejecutar: inicia backend local con BD de pruebas y ${url}/health disponible`,'HTTP/BD');
  if(f){
    const sources=walk(join(f,'src'),['.js','.jsx','.ts','.tsx']);
    const risky=[];
    for(const p of sources){const txt=read(p); if(/dangerouslySetInnerHTML\s*=|\b(?:innerHTML|outerHTML)\s*=|\beval\s*\(|new\s+Function\s*\(/.test(txt))risky.push(p.slice(f.length+1));}
    result(results,'XSS-01','Búsqueda de sinks DOM peligrosos',risky.length?'WARN':'PASS',risky.length?`Requieren revisión: ${risky.slice(0,8).join(', ')}`:`${sources.length} archivos de frontend revisados; no se encontraron sinks de alto riesgo conocidos. No prueba por sí solo ausencia de XSS`,'ESTATICO');
    const client=join(f,'src/cliente-api/httpClient.js');
    const ctx=join(f,'src/contexto/AuthProvider.jsx');
    if(existsSync(client)&&existsSync(ctx)){
      const code=read(client), auth=read(ctx);
      const bearer=/Authorization:\s*`Bearer\s+\$\{token\}`/.test(code);
      const cookies= /credentials\s*:\s*['"]include['"]|withCredentials\s*:\s*true/.test(code) || /req\.cookies|cookieParser\s*\(/.test(read(join(backend,'src/app.js')));
      result(results,'CSRF-01','Evaluación del transporte de credenciales',bearer&&!cookies?'PASS':'WARN',bearer&&!cookies?'La API usa Bearer explícito desde JavaScript y no se observó autenticación automática por cookies en los archivos inspeccionados. Riesgo CSRF clásico reducido; no evalúa todos los flujos.':'Revisar uso de cookies y transporte del token; podría requerir protección CSRF','ARQUITECTURA');
      const local=/localStorage\.setItem\(TOKEN_KEY,\s*respuesta\.token\)/.test(auth);
      result(results,'H-12b-01','Almacenamiento de JWT en navegador',local?'WARN':'PASS',local?'El JWT permanece en localStorage; riesgo residual ante XSS. No se declara corregido.':'No se detectó el patrón previo de guardado JWT en localStorage; revisar otros módulos','ESTATICO');
      result(results,'H-12b-02','Revocación inmediata de JWT','SKIP','Para comprobar revocación se necesitan usuario de prueba, JWT vigente y prueba controlada de desactivación/cambio de rol; no se simula','INTEGRACION');
    }else result(results,'CSRF-01','Evaluación del transporte de credenciales','SKIP','Archivos httpClient/AuthProvider no encontrados','ARQUITECTURA');
  }else{
    result(results,'XSS-01','Inspección XSS del frontend','SKIP','Define SECURITY_FRONTEND_PATH con la carpeta raíz del frontend','ESTATICO');
    result(results,'CSRF-01','Evaluación de CSRF','SKIP','Define SECURITY_FRONTEND_PATH para evaluar frontend y API','ARQUITECTURA');
    result(results,'H-12b-01','JWT en navegador','SKIP','Define SECURITY_FRONTEND_PATH','ESTATICO');
    result(results,'H-12b-02','Revocación de JWT','SKIP','Se requieren usuarios de prueba y escenario explícito de revocación','INTEGRACION');
  }
  if(serverAvailable){
    try {
      const r=await request('/api/v1/dictionary?q='+encodeURIComponent('<script>alert(1)</script>'));
      const contentType=r.headers.get('content-type')||'';
      const valid=r.code===200&&contentType.includes('application/json')&&Array.isArray(r.json?.data);
      result(results,'XSS-02','Payload HTML recibido como JSON en endpoint de búsqueda',valid?'PASS':'FAIL',`HTTP ${r.code}; Content-Type: ${contentType}. Esto NO verifica la ejecución de scripts en React; requiere E2E de navegador para ese alcance`, 'HTTP');
    }catch(e){result(results,'XSS-02','Payload HTML en endpoint de búsqueda','SKIP',e.message,'HTTP');}
    try {
      const r=await request('/api/v1/users/1',{headers:{origin:'https://otro-origen.invalid'}});
      const origin=r.headers.get('access-control-allow-origin');
      result(results,'CSRF-02','Origen externo no habilitado por CORS',origin==='https://otro-origen.invalid'?'FAIL':'PASS',`Access-Control-Allow-Origin: ${origin??'(ausente)'}. CORS no reemplaza protección CSRF con cookies`, 'HTTP');
    }catch(e){result(results,'CSRF-02','CORS frente a otro origen','SKIP',e.message,'HTTP');}
  }else{
    result(results,'XSS-02','Prueba HTTP con payload HTML','SKIP','Requiere backend local y acceso a BD de pruebas','HTTP');
    result(results,'CSRF-02','Prueba HTTP de origen no permitido','SKIP','Requiere backend local','HTTP');
  }
  
  
  // H-05a: verificar acceso anonimo a datos privados de Supabase.
  // Solo realiza solicitudes GET. No modifica datos ni permisos.
  const supabaseUrl = process.env.SECURITY_SUPABASE_URL;
  const anonKey = process.env.SECURITY_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    result(
      results,
      'H-05a',
      'Acceso anonimo a datos privados de Supabase',
      'SKIP',
      'Faltan SECURITY_SUPABASE_URL o SECURITY_SUPABASE_ANON_KEY',
      'SUPABASE/API'
    );
  } else {
    try {
      const baseUrl = new URL(supabaseUrl);
      const headers = {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json'
      };

      // 1. Verificar la respuesta del servicio PostgREST.
      // Esto comprueba disponibilidad y aceptacion de la solicitud,
      // pero NO certifica por si solo la validez del JWT.
      const controlUrl = new URL('/rest/v1/', baseUrl);

      const control = await fetch(controlUrl, {
        method: 'GET',
        headers: {
          ...headers,
          Accept: 'application/openapi+json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (control.status !== 200) {
        result(
          results,
          'H-05a',
          'Acceso anonimo a datos privados de Supabase',
          'WARN',
          `Consulta de control: HTTP ${control.status}. ` +
          'No se pudo confirmar la disponibilidad de PostgREST; ' +
          'no se interpreta el rechazo de la tabla como PASS.',
          'SUPABASE/API'
        );
      } else {
        // 2. Intentar leer una fila de la tabla privada usuario.
        const targetUrl = new URL('/rest/v1/usuario', baseUrl);
        targetUrl.searchParams.set('select', 'id_usuario');
        targetUrl.searchParams.set('limit', '1');

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000)
        });

        const body = await response.json().catch(() => null);
        const errorCode =
          typeof body?.code === 'string' ? body.code : null;

        if (
          [401, 403].includes(response.status) &&
          errorCode === '42501'
        ) {
          result(
            results,
            'H-05a',
            'Acceso anonimo a datos privados de Supabase',
            'PASS',
            `HTTP ${response.status}; PostgreSQL 42501: ` +
            'consulta anonima rechazada por permisos. ' +
            'No demuestra por si sola la configuracion RLS.',
            'SUPABASE/API'
          );
        } else if (
          response.status === 200 &&
          Array.isArray(body) &&
          body.length > 0
        ) {
          result(
            results,
            'H-05a',
            'Acceso anonimo a datos privados de Supabase',
            'FAIL',
            `HTTP 200: la consulta anonima devolvio ` +
            `${body.length} registro(s) de usuario.`,
            'SUPABASE/API'
          );
        } else if (
          response.status === 200 &&
          Array.isArray(body) &&
          body.length === 0
        ) {
          result(
            results,
            'H-05a',
            'Acceso anonimo a datos privados de Supabase',
            'WARN',
            'HTTP 200 con arreglo vacio. No se observaron ' +
            'registros expuestos, pero la tabla podria estar vacia.',
            'SUPABASE/API'
          );
        } else {
          result(
            results,
            'H-05a',
            'Acceso anonimo a datos privados de Supabase',
            'WARN',
            `HTTP ${response.status}; codigo: ` +
            `${errorCode || '(no disponible)'}. ` +
            'No se pudo confirmar la denegacion por permisos.',
            'SUPABASE/API'
          );
        }
      }
    } catch (error) {
      result(
        results,
        'H-05a',
        'Acceso anonimo a datos privados de Supabase',
        'SKIP',
        `No se completo la solicitud HTTP: ${error.name}`,
        'SUPABASE/API'
      );
    }
  }

  // H-05b: la configuracion RLS requiere evidencia SQL real.
  // No se declara PASS automatico sin consultar metadatos.
  result(
    results,
    'H-05b',
    'Configuracion RLS de las tablas de Supabase',
    'SKIP',
    'Verificacion manual mediante Supabase SQL Editor: ' +
    '14 tablas con RLS habilitado al momento de la revision. ' +
    'La suite CI no consulta metadatos RLS.',
    'SUPABASE/RLS'
  );
}
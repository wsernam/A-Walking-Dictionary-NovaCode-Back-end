import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] || 'security-suite/reports/security-results.json';
const output = process.argv[3] || 'security-suite/reports/security-report-owasp.html';
const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

const categories = [
 ['A01','Pérdida de control de acceso','Directo'],
 ['A02','Configuración de seguridad incorrecta','Directo'],
 ['A03','Fallas en la cadena de suministro de software','Complementario'],
 ['A04','Fallas criptográficas','Directo'],
 ['A05','Inyección','Directo'],
 ['A06','Diseño inseguro','Parcial'],
 ['A07','Fallas de autenticación','Directo'],
 ['A08','Fallas en la integridad del software o los datos','Parcial'],
 ['A09','Fallas en el registro, alerta y monitoreo de seguridad','Parcial'],
 ['A10','Manejo inadecuado de condiciones excepcionales','Parcial'],
];
const categoryMap = {
 'H-01':['A01'],'H-01b':['A01'],'H-02':['A01'],'H-03':['A01'],'H-03b':['A01'],'H-04':['A02','A07'],
 'H-06':['A04'],'H-07':['A02'],'H-08':['A10'],'H-09':['A09'],'H-11':['A04','A06'],
 'H-12':['A07'],'H-13':['A01','A06'],'HTTP-H01':['A01'],'HTTP-H02':['A01'],
 'HTTP-H03':['A01'],'HTTP-H03b':['A01'],'HTTP-H12':['A07'],'HTTP-CORS':['A02'],
 'HTTP-HELMET':['A02'],'SQLi-01':['A05'],'SQLi-02':['A05'],'SQLi-03':['A05'],
 'XSS-01':['A05'],'XSS-02':['A05'],'CSRF-01':['A01'],'CSRF-02':['A02'],
 'H-12b-01':['A07'],'H-12b-02':['A07'],'H-05a':['A01'],'H-05b':['A01'],
    'A03-01': ['A03'],
    'A08-01': ['A08'],'H-06-INT': ['A04'],

};
const guidance = {
 'H-06':'Verificar el certificado TLS del servidor PostgreSQL: sustituir cualquier configuración que desactive la validación por una cadena de confianza válida (CA apropiada). Repetir H-06 y una prueba real de conexión; no desactivar la verificación como solución.',
 'H-12b-01':'Evaluar el uso de cookies HttpOnly, Secure y SameSite para sesiones, según la arquitectura; complementar con CSP y prevención de XSS. Si se mantiene localStorage, documentar el riesgo y reducir vigencia y alcance del token.',
 'H-12b-02':'Preparar un usuario de prueba, un JWT vigente y un cambio de rol o desactivación controlada. Verificar que las solicitudes posteriores sean rechazadas según la política de revocación. Implementar versión de token o lista de revocación si se requiere invalidación inmediata.',
 'H-05a':'Investigar por qué PostgREST respondió HTTP 406 antes de concluir que el acceso anónimo está bloqueado. Confirmar URL, clave anon, tabla y cabeceras de la consulta; repetir la verificación y comprobar explícitamente acceso denegado a datos privados.',
 'H-05b':'Automatizar una consulta de metadatos RLS con credenciales seguras y de mínimos privilegios dentro del pipeline, sin imprimir secretos. Mientras tanto, adjuntar evidencia de SQL Editor de las tablas y mantener el resultado SKIP en CI.',
 
'H-06-INT':
  'Verificar la conexión PostgreSQL, la autoridad certificadora y el nombre del servidor. Mantener rejectUnauthorized:true y repetir la prueba de integración TLS. No desactivar la validación del certificado.',

};
const generic = {
 FAIL:'Investigar la evidencia de la prueba, corregir el control y volver a ejecutar la suite para confirmar PASS.',
 WARN:'Revisar la advertencia, validar el impacto real y añadir una mitigación verificable.',
 SKIP:'Habilitar los requisitos indicados en la evidencia y ejecutar la prueba; SKIP no equivale a PASS.',
 MANUAL:'Completar la verificación manual y adjuntar evidencia reproducible.',
 PASS:'Sin acción correctiva inmediata; conservar este control y ejecutarlo en cada cambio relevante.'
};
const results = data.results || [];
const counts = Object.fromEntries(['PASS','FAIL','WARN','MANUAL','SKIP'].map(s=>[s,results.filter(r=>r.status===s).length]));
const badge=s=>`<span class="status ${esc(s)}">${esc(s)}</span>`;
const summary = categories.map(([id,title,scope])=>{
 const rows=results.filter(r=>(categoryMap[r.id]||[]).includes(id));
 const n=Object.fromEntries(['PASS','FAIL','WARN','SKIP','MANUAL'].map(s=>[s,rows.filter(r=>r.status===s).length]));
 const state = rows.length===0 ? 'Sin prueba específica' : n.FAIL?'Hallazgo fallido':n.WARN||n.SKIP||n.MANUAL?'Con pendientes':'Controles probados superados';
 const ids=rows.map(r=>`${esc(r.id)} ${badge(r.status)}`).join('<br>') || '<em>No hay controles asociados en la suite</em>';
 const action=rows.filter(r=>r.status!=='PASS').map(r=>`<strong>${esc(r.id)}:</strong> ${esc(guidance[r.id]||generic[r.status])}`).join('<br>') || (rows.length?'Mantener controles; la cobertura no equivale a certificación de toda la categoría.':'Diseñar y ejecutar controles de seguridad específicos para esta categoría.');
 return `<tr><td><strong>${id}</strong><br>${esc(title)}</td><td>${ids}</td><td>${esc(scope)}</td><td>${esc(state)}<br><small>${n.PASS} PASS · ${n.FAIL} FAIL · ${n.WARN} WARN · ${n.SKIP} SKIP</small></td><td>${action}</td></tr>`;
}).join('\n');
const detail=results.map(r=>`<tr><td><strong>${esc(r.id)}</strong><br><small>${esc(r.type)}</small></td><td>${esc(r.description)}</td><td>${badge(r.status)}</td><td>${esc(r.reason)}</td><td>${esc((categoryMap[r.id]||[]).join(', ')||'Sin categoría asignada')}</td><td>${esc(guidance[r.id] || generic[r.status] || '')}</td></tr>`).join('\n');
const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NovaCode — Informe OWASP Top 10:2025</title><style>body{font:15px/1.5 system-ui,Arial,sans-serif;max-width:1350px;margin:35px auto;padding:0 25px;background:#f7f9fc;color:#18243a}h1{font-size:29px;margin-bottom:3px}h2{margin-top:35px}.meta{color:#607087}.cards{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}.card{background:#fff;padding:15px 23px;border-radius:9px;border:1px solid #e1e7ee;min-width:90px}.card strong{font-size:23px;display:block}table{border-collapse:collapse;width:100%;background:#fff;font-size:13px}th,td{border-bottom:1px solid #e1e7ee;padding:11px;text-align:left;vertical-align:top}th{background:#eaf0f7;position:sticky;top:0}td{overflow-wrap:anywhere}small{color:#617084}.status{font-size:12px;font-weight:750;border-radius:4px;padding:2px 6px;white-space:nowrap}.PASS{color:#166534;background:#eaf8ee}.FAIL{color:#991b1b;background:#fdebec}.WARN{color:#92400e;background:#fff4d9}.SKIP,.MANUAL{color:#475569;background:#edf0f4}.note{background:white;border-left:4px solid #8394ad;padding:13px 16px;margin:14px 0}footer{margin:30px 0;color:#607087}@media print{body{margin:0;padding:0}th{position:static}.cards{break-inside:avoid}tr{break-inside:avoid}table{font-size:10px}}</style></head><body>
<h1>A Walking Dictionary — Evaluación frente a OWASP Top 10:2025</h1><p class="meta">Equipo NovaCode · Ejecución: ${esc(data.date)} · Fuente: security-results.json · Generado automáticamente</p>
<div class="cards">${Object.entries(counts).map(([s,n])=>`<div class="card">${badge(s)}<strong>${n}</strong></div>`).join('')}</div>
<p class="note"><b>Interpretación:</b> PASS indica que pasó el control probado, no que la categoría completa esté libre de vulnerabilidades. FAIL, WARN y SKIP requieren seguimiento. A03 evalúa vulnerabilidades conocidas en dependencias npm y A08 verifica la integridad y consistencia del package-lock. Estas pruebas no cubren la totalidad de sus categorías. La clasificación OWASP y las recomendaciones proceden del catálogo mantenido por NovaCode, no son generadas de forma autónoma por GitHub Actions.</p>
<h2>1. Relación de las pruebas con OWASP Top 10:2025</h2><table><thead><tr><th>Categoría</th><th>IDs / estado</th><th>Alcance</th><th>Resultado de los controles asociados</th><th>Recomendaciones según el resultado</th></tr></thead><tbody>${summary}</tbody></table>
<h2>2. Resultado individual y recomendación</h2><table><thead><tr><th>ID / Tipo</th><th>Prueba</th><th>Estado</th><th>Evidencia registrada</th><th>OWASP</th><th>Recomendación</th></tr></thead><tbody>${detail}</tbody></table>
<footer>Informe generado a partir de los datos de la suite. No equivale a una certificación o prueba completa de OWASP Top 10.</footer></body></html>`;
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,html,'utf8');
console.log(`Generado ${output} con ${results.length} pruebas. Estados: ${JSON.stringify(counts)}`);

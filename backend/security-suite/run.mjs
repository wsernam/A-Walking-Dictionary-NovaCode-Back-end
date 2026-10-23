/**
 * Suite OWASP de regresión para A Walking Dictionary.
 * Sin dependencias adicionales. No escribe datos en la BD.
 * Usa análisis de código y, si está disponible, solicitudes HTTP no destructivas.
 * Los casos estáticos NO sustituyen las pruebas dinámicas ni un pentest.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAdvanced } from './advanced.mjs';

import { runSupplyIntegrity } from './supply-integrity.mjs';


const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (name) => readFileSync(join(backend, 'src', name), 'utf8');
const url = (process.env.SECURITY_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const results = [];
function check(id, description, condition, reason, type = 'CODIGO') {
  results.push({ id, description, status: condition ? 'PASS' : 'FAIL', reason, type });
}
function manual(id, description, reason) {
  results.push({ id, description, status: 'MANUAL', reason, type: 'MANUAL' });
}
function skip(id, description, reason) {
  results.push({ id, description, status: 'SKIP', reason, type: 'HTTP' });
}
async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url + path, {
      method,
      headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* respuesta no JSON */ }
    return { code: response.status, headers: response.headers, json };
  } finally { clearTimeout(timer); }
}
function eq(id, title, actual, acceptable) {
  check(id, title, acceptable.includes(actual), `HTTP obtenido: ${actual}; esperado: ${acceptable.join(' o ')}`, 'HTTP');
}
const users = src('routes/usuarioRoutes.js');
const courses = src('routes/cursoRoutes.js');
const study = src('routes/estudioRoutes.js');
const students = src('routes/estudianteRoutes.js');
const auth = src('middleware/autenticacionMiddleware.js');
const app = src('app.js');
const db = src('config/db.js');
const logs = src('middleware/registroSeguridadMiddleware.js');
const enrollment = src('services/InscripcionService.js');
const courseController = src('controllers/CursoController.js');
const studentController = src('controllers/EstudioController.js');
const userController = src('controllers/UsuarioController.js');
const authService = src('services/AutenticacionService.js');

check('H-01', 'CRUD genérico de usuarios deshabilitado', !/router\.(post|get|put|delete)\(\s*['"]\/['"]/.test(users) && /router\.get\(['"]\/:id['"],\s*authenticate/.test(users), 'Usuarios solo expone rutas explícitas autenticadas');
check('H-01b', 'Perfil: propiedad de recurso', /req\.usuario\.id_usuario\s*!==\s*id/.test(userController), 'Comprobar que el estudiante no vea perfiles ajenos');
check('H-02', 'Generación de código solo para docentes', /router\.post\(['"]\/:id\/access-code['"],\s*authenticate,\s*requireRole\(['"]docente['"]\)/.test(courses), 'Endpoint requiere JWT y rol docente');
check('H-03', 'Estudio y contexto requieren autenticación', (study.match(/authenticate,\s*requireRole\(['"]estudiante['"]\)/g) || []).length >= 2 && /router\.get\(['"]\/:id\/context['"],\s*authenticate/.test(students), 'Rutas de estudio y contexto protegidas');
check('H-03b', 'Inscripción validada contra JWT', /InscripcionRepository\.obtenerPorId/.test(studentController) && /inscripcion\.estudiante_id/.test(studentController) && /req\.usuario\.id_usuario/.test(studentController), 'El controlador verifica propiedad de la inscripción');
check('H-04', 'Bypass de autenticación deshabilitado en producción', /process\.env\.NODE_ENV\s*!==\s*['"]production['"]/.test(auth), 'DISABLE_AUTH no funciona con NODE_ENV=production');
check('H-06', 'TLS verifica el certificado de PostgreSQL', !/rejectUnauthorized\s*:\s*false/.test(db) && /rejectUnauthorized\s*:\s*true|\bca\s*:/.test(db), 'No debe desactivarse la validación del certificado');
check('H-07', 'Helmet, CORS restringido y rate limit', /app\.use\(helmet\(\)\)/.test(app) && /CORS_ORIGINS/.test(app) && /app\.use\(cors\(\{\s*origin:\s*origenesPermitidos\s*\}\)\)/.test(app) && /rateLimit\(/.test(app), 'Comprobación estática de configuración de seguridad');
check('H-08', 'Errores 5xx genéricos en producción', /res\.statusCode\s*>=\s*500/.test(app) && /Error interno del servidor/.test(app), 'Control global de serialización de respuestas 500');
check('H-09', 'Registro de eventos 401, 403 y 5xx', /statusCode\s*===\s*401/.test(logs) && /statusCode\s*===\s*403/.test(logs) && /statusCode\s*>=\s*500/.test(logs) && /app\.use\(registroSeguridad\)/.test(app), 'Registro de eventos de seguridad configurado');
check('H-11', 'Códigos con aleatoriedad criptográfica', !/Math\.random\s*\(/.test(enrollment) && /randomInt|randomBytes|randomUUID/.test(enrollment), 'Debe emplearse node:crypto, no Math.random');
check('H-12', 'JWT valida algoritmo y secreto', /algorithms:\s*\[['"]HS256['"]\]/.test(auth) && /JWT_SECRET/.test(authService) && /length\s*<\s*32/.test(authService), 'Algoritmo permitido explícitamente y secreto suficientemente largo');
check('H-13', 'Curso atribuido al docente autenticado', /requireRole\(['"]docente['"]\)/.test(courses) && /req\.usuario\.id_usuario/.test(courseController), 'La identidad del docente viene del token fuera del bypass local');

let serverAvailable = false;
try {
  const health = await request('/health');
  serverAvailable = health.code === 200;
} catch { /* instancia local no disponible */ }
if (!serverAvailable) {
  skip('HTTP', 'Pruebas contra backend local', `No responde ${url}/health; iniciar el backend con npm start y volver a ejecutar`);
} else {
  const httpChecks = [
    ['HTTP-H01', 'GET /users sin JWT', '/api/v1/users/1', 'GET', [401]],
    ['HTTP-H02', 'POST /courses/:id/access-code sin JWT', '/api/v1/courses/1/access-code', 'POST', [401]],
    ['HTTP-H03', 'POST /study/review-session sin JWT', '/api/v1/study/review-session', 'POST', [401]],
    ['HTTP-H03b', 'GET contexto de estudiante sin JWT', '/api/v1/students/1/context', 'GET', [401]],
    ['HTTP-H12', 'GET perfil con token inválido', '/api/v1/users/1', 'GET', [401]],
  ];
  for (const [id, title, path, method, acceptable] of httpChecks) {
    try {
      const headers = id === 'HTTP-H12' ? { authorization: 'Bearer token-falso-no-valido' } : {};
      const response = await request(path, { method, headers });
      eq(id, title, response.code, acceptable);
    } catch (err) {
      skip(id, title, `Error de conexión: ${err.name}`);
    }
  }
  try {
    const h = await request('/health', { headers: { origin: 'https://origen-no-autorizado.invalid' } });
    check('HTTP-CORS', 'CORS no autoriza un origen desconocido', h.headers.get('access-control-allow-origin') !== 'https://origen-no-autorizado.invalid', 'Origen externo no incluido en lista de permitidos', 'HTTP');
    check('HTTP-HELMET', 'Cabecera x-content-type-options presente', h.headers.get('x-content-type-options') === 'nosniff', 'Helmet debe establecer X-Content-Type-Options: nosniff', 'HTTP');
  } catch (err) { skip('HTTP-HEADERS', 'Cabeceras de seguridad', `Error de conexión: ${err.name}`); }
}
await runAdvanced({ backend, url, request, results, serverAvailable });

await runSupplyIntegrity({ backend, results });

const totals = Object.fromEntries(['PASS','FAIL','WARN','MANUAL','SKIP'].map(s => [s, results.filter(r => r.status === s).length]));
const escape = (v) => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const reportDir = join(backend, 'security-suite', 'reports');
mkdirSync(reportDir, { recursive: true });
const stamp = new Date().toISOString();
writeFileSync(join(reportDir, 'security-results.json'), JSON.stringify({ date: stamp, url: serverAvailable ? url : null, totals, results }, null, 2));
writeFileSync(join(reportDir, 'security-report.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><title>NovaCode — OWASP Security Suite</title><style>body{font:16px system-ui;margin:40px auto;max-width:1100px;background:#f8fafc;color:#172433}h1{font-size:29px}table{border-collapse:collapse;width:100%;background:white}th,td{padding:12px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}th{background:#e9eef4}b.PASS{color:#15803d}b.FAIL{color:#b91c1c}b.WARN{color:#b45309}b.MANUAL{color:#92400e}b.SKIP{color:#64748b}.summary{display:flex;gap:15px;margin:22px 0}.summary span{background:white;padding:15px 25px;border-radius:8px;border:1px solid #dde3ea}small{color:#64748b}</style><h1>A Walking Dictionary — OWASP Security Suite</h1><p>Equipo NovaCode · ${escape(stamp)}</p><div class="summary">${Object.entries(totals).map(([k,v])=>`<span><b class="${k}">${k}</b>: ${v}</span>`).join('')}</div><p><small>PASS: comprobación superada · FAIL: incumplimiento detectado · MANUAL: requiere validación humana · SKIP: no se ejecutó. Las pruebas de código no equivalen a escaneo de seguridad dinámico.</small></p><table><thead><tr><th>ID</th><th>Prueba</th><th>Resultado</th><th>Evidencia / nota</th></tr></thead><tbody>${results.map(r=>`<tr><td>${escape(r.id)}</td><td>${escape(r.description)}<br><small>${escape(r.type)}</small></td><td><b class="${escape(r.status)}">${escape(r.status)}</b></td><td>${escape(r.reason)}</td></tr>`).join('')}</tbody></table></html>`);
console.log('\n🔐 NOVACODE — SUITE DE SEGURIDAD OWASP\n');
for (const r of results) console.log(`  ${r.status.padEnd(6)} ${r.id.padEnd(11)} ${r.description}`);
console.log(`\nResultado: ${totals.PASS} PASS · ${totals.FAIL} FAIL · ${totals.WARN} WARN · ${totals.MANUAL} MANUAL · ${totals.SKIP} SKIP`);
console.log('Reporte: security-suite/reports/security-report.html\n');
if (totals.FAIL > 0) process.exitCode = 1;

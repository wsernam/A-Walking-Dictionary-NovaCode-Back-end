import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Dos controles acotados: A03 vulnerabilidades conocidas y A08 integridad del lockfile. */
export async function runSupplyIntegrity({ backend, results }) {
  const put = (id, description, status, reason, type) =>
    results.push({ id, description, status, reason, type });
  const packageFile = join(backend, 'package.json');
  const lockFile = join(backend, 'package-lock.json');
  if (!existsSync(packageFile) || !existsSync(lockFile)) {
    put('A03-01', 'Auditoría de vulnerabilidades en dependencias npm', 'SKIP', 'Falta package.json o package-lock.json', 'DEPENDENCIAS');
    put('A08-01', 'Integridad y consistencia del package-lock', 'SKIP', 'Falta package.json o package-lock.json', 'INTEGRIDAD');
    return;
  }

  // A08. Un hash de integridad en el lock verifica paquetes instalados desde el registro.
  // No demuestra por sí mismo integridad de GitHub Actions, despliegues o datos en PostgreSQL.
  try {
    const pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
    const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
    const entries = lock.packages;
    if (!entries || !entries['']) throw new Error('package-lock sin sección packages/raíz');
    const differences = [];
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, spec] of Object.entries(pkg[section] || {})) {
        if ((entries[''][section] || {})[name] !== spec) differences.push(`Especificación diferente: ${name}`);
      }
    }
    const registryEntries = Object.entries(entries).filter(([name, e]) =>
      name.startsWith('node_modules/') && e && !e.link &&
      typeof e.resolved === 'string' && /^https?:\/\//.test(e.resolved));
    const missingHashes = registryEntries.filter(([, e]) => !/^sha(256|384|512)-/.test(e.integrity || ''));
    const insecureUrls = registryEntries.filter(([, e]) => e.resolved.startsWith('http://'));
    const others = Object.entries(entries).filter(([name, e]) =>
      name.startsWith('node_modules/') && e && !e.link && e.resolved && !/^https?:\/\//.test(e.resolved));
    const issues = [
      ...differences,
      ...missingHashes.slice(0, 4).map(([name]) => `Sin hash: ${name}`),
      ...insecureUrls.slice(0, 4).map(([name]) => `URL HTTP: ${name}`),
    ];
    let status = issues.length ? 'FAIL' : 'PASS';
    if (!registryEntries.length) status = 'SKIP';
    if (!issues.length && others.length) status = 'WARN';
    put('A08-01', 'Integridad y consistencia del package-lock', status,
      `${registryEntries.length} paquetes con URL de registro; ${missingHashes.length} sin hash; ${insecureUrls.length} con HTTP; ${differences.length} desajustes; ${others.length} fuentes no estándar. ${issues.join('; ') || 'Sin incidencias en el alcance comprobado.'}`,
      'INTEGRIDAD');
  } catch (error) {
    put('A08-01', 'Integridad y consistencia del package-lock', 'FAIL', `No se pudo validar el lockfile: ${error.message}`, 'INTEGRIDAD');
  }

  // A03. npm audit puede devolver código 1 cuando descubre vulnerabilidades; leer su JSON.
  // Error de red no equivale a ausencia de vulnerabilidades.
  try {
    let output;
    try {
      output = execFileSync('npm', ['audit', '--json', '--package-lock-only'], {
        cwd: backend, encoding: 'utf8', timeout: 90000, maxBuffer: 16 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      output = error.stdout;
      if (!output) throw error;
    }
    const audit = JSON.parse(output);
    if (audit.error || !audit.metadata?.vulnerabilities) {
      put('A03-01', 'Auditoría de vulnerabilidades en dependencias npm', 'SKIP',
        `Auditoría inconclusa: ${audit.error?.summary || audit.error?.message || 'sin métricas de vulnerabilidades'}`, 'DEPENDENCIAS');
    } else {
      const v = audit.metadata.vulnerabilities;
      const high = (v.high || 0) + (v.critical || 0);
      const moderate = v.moderate || 0;
      const status = high ? 'FAIL' : moderate ? 'WARN' : 'PASS';
      put('A03-01', 'Auditoría de vulnerabilidades en dependencias npm', status,
        `npm audit: ${v.critical || 0} críticas, ${v.high || 0} altas, ${moderate} moderadas, ${v.low || 0} bajas. ${high ? 'Corregir prioritariamente críticas/altas.' : moderate ? 'Revisar moderadas.' : 'Sin vulnerabilidades críticas, altas ni moderadas reportadas.'}`,
        'DEPENDENCIAS');
    }
  } catch (error) {
    put('A03-01', 'Auditoría de vulnerabilidades en dependencias npm', 'SKIP',
      `No se pudo completar npm audit (por ejemplo, red o respuesta inválida): ${error.message.slice(0, 180)}`,
      'DEPENDENCIAS');
  }
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

/** Retorna exactamente un resultado del formato que consume run.mjs. */
export async function checkTlsIntegration() {
  const base = {
    id: 'H-06-INT',
    description: 'Conexión real TLS con certificado validado hacia Supabase',
    type: 'INTEGRACION/TLS',
  };

  // No ejecutamos contra el PostgreSQL local de GitHub Actions por accidente.
  if (process.env.SECURITY_TLS_ENABLED !== 'true') {
    return { ...base, status: 'SKIP', reason: 'Integración no habilitada; configurar SECURITY_TLS_ENABLED=true y credenciales de Supabase de prueba.' };
  }

  const host = process.env.SECURITY_TLS_HOST || process.env.DB_HOST;
  const user = process.env.SECURITY_TLS_USER || process.env.DB_USER;
  const password = process.env.SECURITY_TLS_PASSWORD || process.env.DB_PASSWORD;
  const database = process.env.SECURITY_TLS_DATABASE || process.env.DB_NAME;
  const port = Number(process.env.SECURITY_TLS_PORT || process.env.DB_PORT || 5432);
  const caPath = process.env.SECURITY_TLS_CA_PATH || process.env.DB_SSL_CA_PATH;
  const missing = Object.entries({ host, user, password, database, caPath })
    .filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    return { ...base, status: 'SKIP', reason: `No se ejecutó: faltan parámetros ${missing.join(', ')}.` };
  }

  let client;
  try {
    const ca = readFileSync(resolve(process.cwd(), caPath), 'utf8');
    client = new pg.Client({
      host, port, user, password, database,
      connectionTimeoutMillis: 12000,
      ssl: { ca, rejectUnauthorized: true, servername: host },
    });
    await client.connect();
    const socket = client.connection?.stream;
    if (socket?.encrypted !== true || socket?.authorized !== true) {
      throw new Error('TLS no cifrado o certificado no autorizado');
    }
    const query = await client.query('SELECT 1::int AS conexion_correcta');
    if (query.rows[0]?.conexion_correcta !== 1) {
      throw new Error('No se pudo confirmar la consulta SQL de solo lectura');
    }
    return {
      ...base,
      status: 'PASS',
      reason: 'Conexión real y SELECT 1 correctos; TLS cifrado, cadena de confianza y nombre del servidor validados.',
    };
  } catch (error) {
    // No incluir cadenas de conexión ni secretos en el reporte.
    return {
      ...base,
      status: 'FAIL',
      reason: `Fallo de conexión o validación TLS (${error.code || error.name || 'ERROR'}). Consultar logs privados de la ejecución.`,
    };
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

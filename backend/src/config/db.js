/**
 * @file db.js
 * @brief Configuración de la conexión a PostgreSQL (pool de conexiones con el driver "pg", sin ORM).
 *
 * Los repositorios importan este pool para ejecutar SQL; ninguna otra capa (controladores,
 * servicios) debe usarlo directamente — mantiene el acceso a datos confinado a src/repositories/.
 */

import fs from 'node:fs';
import pg from 'pg';

const { Pool } = pg;

/**
 * @brief Certificado raíz de Supabase versionado en el repo (es público, no un secreto).
 * Se resuelve relativo a este archivo para no depender del directorio desde el que arranca Node.
 */
const CA_POR_DEFECTO = new URL('../../certs/supabase-ca.crt', import.meta.url);

/**
 * @brief Configuración SSL de la conexión.
 *
 * Auditoría OWASP H-06 (A02/A04): con DB_SSL=true se valida el certificado del servidor contra la
 * CA de Supabase (rejectUnauthorized: true + ca), en lugar de aceptar cualquiera. Si el certificado
 * no se puede leer, el servidor no arranca (falla cerrada), para no volver a conectarse sin verificar.
 * DB_SSL_CA_PATH permite usar otro archivo; por defecto se usa certs/supabase-ca.crt.
 *
 * @return {false|{rejectUnauthorized: boolean, ca: string}} false si DB_SSL no es 'true'.
 * @throws {Error} si DB_SSL=true y no se puede leer el certificado.
 */
function configurarSSL() {
  if (process.env.DB_SSL !== 'true') {
    return false;
  }

  const rutaCA = process.env.DB_SSL_CA_PATH || CA_POR_DEFECTO;
  try {
    return { rejectUnauthorized: true, ca: fs.readFileSync(rutaCA, 'utf8') };
  } catch (error) {
    throw new Error(
      `DB_SSL=true pero no se pudo leer el certificado CA de la base de datos (${rutaCA}): ${error.message}`
    );
  }
}

/**
 * @brief Pool de conexiones de PostgreSQL, configurado desde variables de entorno
 * (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL, DB_SSL_CA_PATH).
 */
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: configurarSSL(),
});

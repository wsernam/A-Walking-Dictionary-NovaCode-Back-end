// Se ejecuta UNA vez antes de toda la suite:
//   1. Verifica que el backend esté arriba y que DISABLE_AUTH no esté activo.
//   2. Deja la base de datos exactamente como la crean init.sql + seed.sql, para que cada
//      ejecución empiece desde el mismo estado conocido.
//
// OJO: BORRA los datos de la base de pruebas. Úsese solo con la base local de Docker o la del CI,
// nunca con Supabase. Para saltarse el reinicio: SIN_REINICIO_BD=true

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { API_URL, JWT_SECRET, DISABLE_AUTH, DB, SCRIPTS_SQL, CONTENEDOR_DB } from './entorno.js';

function sqlDeReinicio() {
  return ['DROP SCHEMA public CASCADE; CREATE SCHEMA public;', ...SCRIPTS_SQL.map((s) => readFileSync(s, 'utf8'))].join('\n');
}

function contenedorCorriendo() {
  try {
    return execFileSync('docker', ['inspect', '-f', '{{.State.Running}}', CONTENEDOR_DB], { stdio: 'pipe' }).toString().trim() === 'true';
  } catch {
    return false;
  }
}

/**
 * Local (docker compose): se ejecuta psql DENTRO del contenedor, así no importa si en la máquina
 * hay otro PostgreSQL ocupando el puerto 5432.
 */
function reiniciarEnContenedor() {
  execFileSync(
    'docker',
    ['exec', '-i', CONTENEDOR_DB, 'sh', '-c', 'psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 > /dev/null'],
    { input: sqlDeReinicio(), stdio: ['pipe', 'ignore', 'pipe'] }
  );
}

/** CI (GitHub Actions): conexión directa al servicio de PostgreSQL. */
async function reiniciarPorConexion() {
  if (/supabase/i.test(DB.host)) {
    throw new Error(`DB_HOST apunta a Supabase (${DB.host}): las pruebas no reinician bases remotas.`);
  }
  const cliente = new pg.Client(DB);
  await cliente.connect();
  try {
    await cliente.query(sqlDeReinicio());
  } finally {
    await cliente.end();
  }
}

export default async function preparacionGlobal() {
  if (!JWT_SECRET) {
    throw new Error('Falta JWT_SECRET (en backend/.env, en el .env de infra o como variable de entorno).');
  }
  if (DISABLE_AUTH === 'true') {
    throw new Error('DISABLE_AUTH=true: las pruebas de roles no tendrían sentido. Ponlo en false y reinicia el backend.');
  }

  try {
    const respuesta = await fetch(`${API_URL}/health`);
    if (!respuesta.ok) throw new Error(`status ${respuesta.status}`);
  } catch (error) {
    throw new Error(`El backend no responde en ${API_URL}/health (${error.message}).`);
  }

  if (process.env.SIN_REINICIO_BD === 'true') return;

  if (contenedorCorriendo()) {
    reiniciarEnContenedor();
  } else {
    await reiniciarPorConexion();
  }
}

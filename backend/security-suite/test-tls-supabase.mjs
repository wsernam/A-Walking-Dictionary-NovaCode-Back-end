import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const mandatory = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SSL_CA_PATH'];
const missing = mandatory.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`SKIP H-06-INT: faltan variables: ${missing.join(', ')}`);
  process.exit(2);
}
if (process.env.DB_SSL !== 'true') {
  console.error('FAIL H-06-INT: configura DB_SSL=true');
  process.exit(1);
}

const host = process.env.DB_HOST;
let client;
try {
  const ca = readFileSync(resolve(process.cwd(), process.env.DB_SSL_CA_PATH), 'utf8');
  client = new Client({
    host,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 12000,
    ssl: {
      ca,
      rejectUnauthorized: true,
      servername: host,
    },
  });

  await client.connect();
  const stream = client.connection?.stream;
  if (stream?.encrypted !== true || stream?.authorized !== true) {
    throw new Error(`TLS no validado (encrypted=${stream?.encrypted}; authorized=${stream?.authorized}; reason=${stream?.authorizationError || 'ninguna'})`);
  }

  const result = await client.query('SELECT 1::int AS conexion_correcta');
  if (result.rows[0]?.conexion_correcta !== 1) {
    throw new Error('La consulta SQL no devolvió el valor esperado');
  }

  console.log('PASS H-06-INT: conexión real con PostgreSQL, TLS cifrado y certificado + nombre de servidor validados');
} catch (err) {
  console.error('FAIL H-06-INT:', err.code ? `${err.code}: ${err.message}` : err.message);
  process.exitCode = 1;
} finally {
  if (client) await client.end().catch(() => {});
}

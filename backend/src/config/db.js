// Configuración de la conexión a PostgreSQL (pool de conexiones con el driver "pg", sin ORM).
// Los repositorios importan este pool para ejecutar SQL; ninguna otra capa debe usarlo directamente.

import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

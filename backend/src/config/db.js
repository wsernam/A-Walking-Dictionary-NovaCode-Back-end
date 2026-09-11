/**
 * @file db.js
 * @brief Configuración de la conexión a PostgreSQL (pool de conexiones con el driver "pg", sin ORM).
 *
 * Los repositorios importan este pool para ejecutar SQL; ninguna otra capa (controladores,
 * servicios) debe usarlo directamente — mantiene el acceso a datos confinado a src/repositories/.
 */

import pg from 'pg';

const { Pool } = pg;

/**
 * @brief Pool de conexiones de PostgreSQL, configurado desde variables de entorno
 * (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
 */
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

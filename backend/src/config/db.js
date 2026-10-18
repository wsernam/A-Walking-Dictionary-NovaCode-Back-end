/**
 * @file db.js
 * @brief Configuración de la conexión a PostgreSQL (pool de conexiones con el driver "pg", sin ORM).
 *
 * Los repositorios importan este pool para ejecutar SQL; ninguna otra capa (controladores,
 * servicios) debe usarlo directamente — mantiene el acceso a datos confinado a src/repositories/.
 */

import pg from 'pg';

const { Pool } = pg;

// Las columnas TIMESTAMP del DER no guardan zona horaria (ej. quiz.fecha_apertura). Por defecto pg
// las lee y escribe con la hora local del proceso, así que un backend que no corre en UTC (ej.
// "npm run dev" en Windows, UTC-5) desplaza las fechas 5 h y los quices abren tarde. Se fija UTC
// en ambos sentidos, igual que ya pasa en Docker, Render y GitHub Actions.
pg.defaults.parseInputDatesAsUTC = true;
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (valor) => new Date(`${valor.replace(' ', 'T')}Z`));

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

  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
      
});

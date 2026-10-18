// Variables de entorno de las pruebas funcionales.
//
// Orden de prioridad (dotenv no pisa lo que ya está definido):
//   1. Variables del proceso (las que pone GitHub Actions).
//   2. backend/.env (backend corriendo con "npm run dev").
//   3. .env de la raíz del repo de infraestructura, cuando este repo está clonado dentro de
//      walking-dictionary-infra (backend corriendo con docker compose).
// JWT_SECRET tiene que ser el MISMO que usa el backend que se está probando.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const carpetaBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(carpetaBackend, '.env'), quiet: true });
dotenv.config({ path: path.join(carpetaBackend, '../../.env'), quiet: true });

export const API_URL = process.env.API_URL || 'http://localhost:5000';
export const JWT_SECRET = process.env.JWT_SECRET;
export const DISABLE_AUTH = process.env.DISABLE_AUTH;

/** Contenedor de PostgreSQL del docker-compose.yml de infra (si está corriendo, se reinicia ahí). */
export const CONTENEDOR_DB = process.env.CONTENEDOR_DB || 'walking_dictionary_db';

/** Conexión directa a PostgreSQL para reiniciar la base antes de la suite (CI). */
export const DB = {
  // El .env de infra no trae DB_HOST (docker compose usa "db"); desde la máquina es localhost.
  host: process.env.DB_HOST_PRUEBAS || (process.env.DB_HOST && process.env.DB_HOST !== 'db' ? process.env.DB_HOST : 'localhost'),
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

/** init.sql y seed.sql viven en la raíz del repo del backend. */
export const SCRIPTS_SQL = [path.join(carpetaBackend, '../init.sql'), path.join(carpetaBackend, '../seed.sql')];

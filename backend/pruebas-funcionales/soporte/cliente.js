// Utilidades compartidas por las pruebas de la API: tokens por usuario del seed, cliente HTTP y
// creación de datos propios de cada prueba (mazos, tarjetas, quices).

import jwt from 'jsonwebtoken';
import { API_URL, JWT_SECRET } from './entorno.js';

/**
 * Usuarios de seed.sql (base recién creada). El login real es con Google, que no se puede
 * automatizar; por eso se firma el JWT igual que AutenticacionService.emitirSesion.
 */
export const USUARIOS = {
  ana: { id_usuario: 1, email: 'ana.docente@unicauca.edu.co', rol: 'docente' }, // dueña del curso 1
  william: { id_usuario: 5, email: 'wsernamunoz@gmail.com', rol: 'docente' }, // docente NO dueño
  juan: { id_usuario: 2, email: 'juan.estudiante@unicauca.edu.co', rol: 'estudiante' }, // inscripción 1
  maria: { id_usuario: 3, email: 'maria.estudiante@unicauca.edu.co', rol: 'estudiante' }, // inscripción 2
  carlos: { id_usuario: 4, email: 'carlos.estudiante@unicauca.edu.co', rol: 'estudiante' }, // inscripción 3
  karen: { id_usuario: 6, email: 'ksandoval@unicauca.edu.co', rol: 'estudiante' }, // HU-5.3 la inscribe por código
  manuela: { id_usuario: 7, email: 'manmeneses@unicauca.edu.co', rol: 'estudiante' }, // HU-5.3 la inscribe por correo
  thalia: { id_usuario: 8, email: 'thaliabernal@unicauca.edu.co', rol: 'estudiante' }, // NINGUNA prueba la inscribe
};

export const CURSO_ID = 1;
export const MAZO_ABIERTO_SEED = 6; // "Fear of Stones", abierto, con 2 tarjetas pendientes
export const MAZO_CERRADO_SEED = 1; // "Stitch by Stitch", cerrado, 6 tarjetas aprobadas

export function token(usuario, opciones = {}) {
  return jwt.sign(usuario, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h', ...opciones });
}

/**
 * Hace una petición a la API y devuelve { status, body, headers }. body es el JSON parseado, o
 * un Buffer si la respuesta no es JSON (ej. PDF).
 */
export async function api(metodo, ruta, { como, body, tokenCrudo } = {}) {
  const headers = {};
  const jwtUsado = tokenCrudo ?? (como ? token(USUARIOS[como]) : null);
  if (jwtUsado) headers.Authorization = `Bearer ${jwtUsado}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const respuesta = await fetch(`${API_URL}/api/v1${ruta}`, {
    method: metodo,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const tipo = respuesta.headers.get('content-type') || '';
  const contenido = tipo.includes('application/json')
    ? await respuesta.json()
    : Buffer.from(await respuesta.arrayBuffer());
  return { status: respuesta.status, body: contenido, headers: respuesta.headers };
}

let contador = 0;
/** Sufijo único para que los datos creados por una prueba no choquen con otros. */
export function unico(prefijo) {
  contador += 1;
  return `${prefijo}-${Date.now().toString(36)}-${contador}`;
}

/** Crea un mazo abierto en el curso 1 como la docente Ana. */
export async function crearMazo(datos = {}) {
  const { status, body } = await api('POST', '/decks', {
    como: 'ana',
    body: {
      curso_id: CURSO_ID,
      nombre_lectura: unico('Lectura de prueba'),
      autor: 'Autor de prueba',
      semana: 20,
      fecha_apertura: '2026-10-01',
      fecha_cierre: '2026-12-01',
      ...datos,
    },
  });
  if (status !== 201) throw new Error(`No se pudo crear el mazo de prueba: ${status} ${JSON.stringify(body)}`);
  return body;
}

/** Un estudiante registra una palabra en un mazo (POST /decks/:id/cards). */
export function registrarPalabra(como, mazoId, datos = {}) {
  return api('POST', `/decks/${mazoId}/cards`, {
    como,
    body: {
      palabra: unico('word'),
      traduccion: 'traducción',
      definicion: 'Definición de prueba.',
      ejemplo: 'Short example.',
      ...datos,
    },
  });
}

/** Fecha ISO desplazada `minutos` desde ahora. */
export function enMinutos(minutos) {
  return new Date(Date.now() + minutos * 60000).toISOString();
}

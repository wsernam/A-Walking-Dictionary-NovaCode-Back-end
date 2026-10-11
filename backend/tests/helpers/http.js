// Utilidades para probar controladores de Express sin levantar el servidor.

import { vi } from 'vitest';

/**
 * @brief Respuesta de Express simulada. status/set devuelven la misma respuesta (como Express),
 * para que el controlador pueda encadenar res.status(400).json(...).
 */
export function crearRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.set = vi.fn(() => res);
  res.send = vi.fn(() => res);
  return res;
}

/** @brief Petición simulada con valores por defecto vacíos. */
export function crearReq({ params = {}, body = {}, query = {}, usuario } = {}) {
  return { params, body, query, usuario, headers: {} };
}

/** @brief Último código y cuerpo que el controlador respondió. */
export function respuesta(res) {
  return {
    status: res.status.mock.calls.at(-1)?.[0],
    body: res.json.mock.calls.at(-1)?.[0],
  };
}

/** @brief Ejecuta un método de un controlador y devuelve { status, body, res }. */
export async function llamar(controller, metodo, opciones = {}) {
  const res = crearRes();
  await controller[metodo](crearReq(opciones), res);
  return { ...respuesta(res), res };
}

/** @brief Error con código HTTP, como los que lanzan los servicios. */
export function errorConStatus(status, message = 'error del servicio') {
  return Object.assign(new Error(message), { status });
}

export const docente ={ id_usuario: 1, email: 'siler@unicauca.edu.co', rol: 'docente' };
export const estudiante = { id_usuario: 2, email: 'juan@unicauca.edu.co', rol: 'estudiante' };

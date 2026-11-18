// Matriz RBAC endpoint × rol (documento "Matriz RBAC", secciones 3 y 8).
//
// Recorre datos/matriz-rbac.json: para cada endpoint y cada rol hace la petición con el token de
// ese rol y compara el código HTTP con lo que dice la matriz:
//   - rol NO permitido: 401 si es invitado (sin token) y 403 para los demás roles.
//   - rol permitido:    cualquier código que no sea 401, 403 ni 5xx (con id inexistente y cuerpo
//                       vacío se espera 400 o 404, y así no se modifica ningún dato).
// Un hueco ya conocido se declara en el JSON con "hallazgos": { rol: "texto" }; esa celda se
// ejecuta con it.fails, de modo que la integración continua sigue en verde, el hueco queda
// visible en el reporte y la prueba avisa cuando el backend se corrija.

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { api, token } from './soporte/cliente.js';

const MATRIZ = JSON.parse(readFileSync(new URL('./datos/matriz-rbac.json', import.meta.url), 'utf8'));

const ADMIN = { id_usuario: 90, email: 'admin.prueba@unicauca.edu.co', rol: 'administrador' };

// Cómo se identifica cada rol y qué id_usuario usa cuando la ruta lleva {yo}.
const ACTOR = {
  invitado: { id: 1, peticion: {} },
  estudiante: { id: 2, peticion: { como: 'juan' } },
  docente: { id: 1, peticion: { como: 'ana' } },
  administrador: { id: 90, peticion: { tokenCrudo: token(ADMIN) } },
};

const ID_INEXISTENTE = 999999;

/** Reemplaza {id}, {yo} y {palabra} de la ruta del JSON. */
function rutaReal(ruta, rol) {
  return ruta
    .replaceAll('{id}', String(ID_INEXISTENTE))
    .replaceAll('{yo}', String(ACTOR[rol].id))
    .replaceAll('{palabra}', 'hello');
}

describe('Matriz RBAC — endpoint × rol', () => {
  for (const endpoint of MATRIZ.endpoints) {
    describe(`#${endpoint.id} ${endpoint.permiso} — ${endpoint.metodo} ${endpoint.ruta}`, () => {
      for (const rol of MATRIZ.roles) {
        const permitido = endpoint.permitido.includes(rol);
        const hallazgo = endpoint.hallazgos?.[rol];
        const prueba = hallazgo ? it.fails : it;
        const esperado = permitido ? 'permitido' : rol === 'invitado' ? 401 : 403;

        prueba(`${rol} → ${esperado}${hallazgo ? ` [${hallazgo}]` : ''}`, async () => {
          const { status } = await api(endpoint.metodo, rutaReal(endpoint.ruta, rol), {
            ...ACTOR[rol].peticion,
            body: endpoint.body,
          });

          expect(status, 'respondió 429: se agotó el límite de solicitudes; defina RATE_LIMIT_AUTH_MAX, RATE_LIMIT_REPORTES_MAX y RATE_LIMIT_ADMIN_MAX en backend/.env y reinicie el backend').not.toBe(429);
          if (permitido) {
            expect([401, 403], `el rol ${rol} debería tener permiso (código ${status})`).not.toContain(status);
            expect(status, 'un 5xx indica un error no controlado').toBeLessThan(500);
          } else {
            expect(status).toBe(esperado);
          }
        });
      }
    });
  }
});

describe('Matriz RBAC — token inválido y expirado', () => {
  const rutasProtegidas = MATRIZ.endpoints.filter((e) => !e.permitido.includes('invitado')).slice(0, 5);

  it.each(rutasProtegidas.map((e) => [e.metodo, rutaReal(e.ruta, 'docente'), e.body]))(
    '%s %s responde 401 con token inválido',
    async (metodo, ruta, body) => {
      const { status } = await api(metodo, ruta, { tokenCrudo: 'token-invalido', body });
      expect(status).toBe(401);
    }
  );

  it.each(rutasProtegidas.map((e) => [e.metodo, rutaReal(e.ruta, 'docente'), e.body]))(
    '%s %s responde 401 con token expirado',
    async (metodo, ruta, body) => {
      const expirado = token({ id_usuario: 1, email: 'ana.docente@unicauca.edu.co', rol: 'docente' }, { expiresIn: -60 });
      const { status } = await api(metodo, ruta, { tokenCrudo: expirado, body });
      expect(status).toBe(401);
    }
  );
});
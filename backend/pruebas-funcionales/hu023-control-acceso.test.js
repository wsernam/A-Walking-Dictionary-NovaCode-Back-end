// HU-023 / CA-23.3: control de acceso del backend.
// Las solicitudes deben rechazarse antes de ejecutar operaciones de negocio.

import { describe, it, expect } from 'vitest';
import { api, token } from './soporte/cliente.js';

const ADMIN = {
  id_usuario: 90,
  email: 'admin.prueba@unicauca.edu.co',
  rol: 'administrador',
};

const RUTAS_ADMIN = [
  ['GET', '/admin/users', undefined],
  ['PATCH', '/admin/users/8/role', { rol: 'docente' }],
  ['PATCH', '/admin/users/8/status', { activo: false }],
];

describe('CA-23.3 — Administración sin sesión', () => {
  it.each(RUTAS_ADMIN)(
    '%s %s responde 401 sin token',
    async (metodo, ruta, datos) => {
      const { status, body } = await api(metodo, ruta, {
        body: datos,
      });

      expect(status).toBe(401);
      expect(body.code).toBe('AUTH_TOKEN_MISSING');
    }
  );

  it.each(RUTAS_ADMIN)(
    '%s %s responde 401 con token inválido',
    async (metodo, ruta, datos) => {
      const { status, body } = await api(metodo, ruta, {
        body: datos,
        tokenCrudo: 'token-invalido',
      });

      expect(status).toBe(401);
      expect(body.code).toBe('AUTH_TOKEN_INVALID');
    }
  );

  it.each(RUTAS_ADMIN)(
    '%s %s responde 401 con token expirado',
    async (metodo, ruta, datos) => {
      const { status, body } = await api(metodo, ruta, {
        body: datos,
        tokenCrudo: token(ADMIN, { expiresIn: -60 }),
      });

      expect(status).toBe(401);
      expect(body.code).toBe('AUTH_TOKEN_INVALID');
    }
  );
});

describe.each([
  ['docente', 'ana'],
  ['estudiante', 'juan'],
])('CA-23.3 — Administración con rol %s', (_rol, como) => {
  it.each(RUTAS_ADMIN)(
    '%s %s responde 403',
    async (metodo, ruta, datos) => {
      const { status, body } = await api(metodo, ruta, {
        como,
        body: datos,
      });

      expect(status).toBe(403);
      expect(body.code).toBe('AUTH_FORBIDDEN');
    }
  );
});

describe('CA-23.3 — El administrador no hereda otros roles', () => {
  const rutasExclusivas = [
    ['POST', '/courses', {}],
    ['POST', '/quizzes/generate', {}],
    ['POST', '/courses/enroll', {}],
    ['POST', '/study/review-session', {}],
  ];

  it.each(rutasExclusivas)(
    '%s %s responde 403 para administrador',
    async (metodo, ruta, datos) => {
      const { status, body } = await api(metodo, ruta, {
        body: datos,
        tokenCrudo: token(ADMIN),
      });

      expect(status).toBe(403);
      expect(body.code).toBe('AUTH_FORBIDDEN');
    }
  );
});
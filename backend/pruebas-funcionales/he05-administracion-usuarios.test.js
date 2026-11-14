// HU-023 — Administrar usuarios y roles (CA-23.1, CA-23.2), HE-05.
// El administrador no está en seed.sql: se firma su JWT igual que el de los demás roles.
// Las pruebas que cambian datos restauran el estado (usan a thalia y a ana del seed).

import { describe, it, expect } from 'vitest';
import { api, token, CURSO_ID } from './soporte/cliente.js';

const ADMIN = { id_usuario: 90, email: 'admin.prueba@unicauca.edu.co', rol: 'administrador' };
const comoAdmin = { tokenCrudo: token(ADMIN) };
const THALIA = 8;
const ANA = 1; // docente dueña del curso 1

describe('HU-023 — Listar y buscar usuarios', () => {
  it('CA-23.1 Lista paginada sin password_hash', async () => {
    const { status, body } = await api('GET', '/admin/users?page=1&limit=3', comoAdmin);
    expect(status).toBe(200);
    expect(body.data.length).toBeLessThanOrEqual(3);
    expect(body).toMatchObject({ page: 1, limit: 3 });
    expect(body.total).toBeGreaterThanOrEqual(8);
    for (const u of body.data) {
      expect(Object.keys(u).sort()).toEqual(['activo', 'email', 'fecha_registro', 'id_usuario', 'nombre_completo', 'rol']);
    }
  });

  it('CA-23.1 Busca por correo y filtra por rol', async () => {
    const porCorreo = await api('GET', '/admin/users?search=thaliabernal', comoAdmin);
    expect(porCorreo.body.data.map((u) => u.id_usuario)).toContain(THALIA);

    const docentes = await api('GET', '/admin/users?rol=docente&limit=100', comoAdmin);
    expect(docentes.body.data.length).toBeGreaterThan(0);
    expect(docentes.body.data.every((u) => u.rol === 'docente')).toBe(true);
  });

  it('CA-23.1 Un filtro de rol inválido se rechaza (400)', async () => {
    const { status, body } = await api('GET', '/admin/users?rol=invitado', comoAdmin);
    expect(status).toBe(400);
    expect(body.code).toBe('ADMIN_INVALID_ROLE');
  });
});

describe('HU-023 — Control de acceso a /admin', () => {
  it('Sin token responde 401', async () => {
    expect((await api('GET', '/admin/users')).status).toBe(401);
  });

  it.each(['ana', 'juan'])('El rol de %s (no administrador) recibe 403', async (como) => {
    const { status, body } = await api('GET', '/admin/users', { como });
    expect(status).toBe(403);
    expect(body.code).toBe('AUTH_FORBIDDEN');
  });
});

describe('HU-023 — Cambiar rol y activar o desactivar cuenta', () => {
  it('CA-23.2 Cambia el rol de una cuenta y lo restaura', async () => {
    const sube = await api('PATCH', `/admin/users/${THALIA}/role`, { ...comoAdmin, body: { rol: 'docente' } });
    expect(sube.status).toBe(200);
    expect(sube.body).toMatchObject({ id_usuario: THALIA, rol: 'docente' });
    expect(sube.body).not.toHaveProperty('password_hash');

    const baja = await api('PATCH', `/admin/users/${THALIA}/role`, { ...comoAdmin, body: { rol: 'estudiante' } });
    expect(baja.status).toBe(200);
    expect(baja.body.rol).toBe('estudiante');
  });

  it('CA-23.2 El rol "invitado" no se puede asignar (400)', async () => {
    const { status, body } = await api('PATCH', `/admin/users/${THALIA}/role`, { ...comoAdmin, body: { rol: 'invitado' } });
    expect(status).toBe(400);
    expect(body.code).toBe('ADMIN_INVALID_ROLE');
  });

  it('CA-23.2 No puede cambiarse su propio rol ni su propio estado (409)', async () => {
    const rol = await api('PATCH', `/admin/users/${ADMIN.id_usuario}/role`, { ...comoAdmin, body: { rol: 'docente' } });
    expect(rol.status).toBe(409);
    expect(rol.body.code).toBe('ADMIN_SELF_CHANGE');
    const estado = await api('PATCH', `/admin/users/${ADMIN.id_usuario}/status`, { ...comoAdmin, body: { activo: false } });
    expect(estado.status).toBe(409);
  });

  it('CA-23.2 Un usuario inexistente responde 404', async () => {
    const { status, body } = await api('PATCH', '/admin/users/99999/role', { ...comoAdmin, body: { rol: 'docente' } });
    expect(status).toBe(404);
    expect(body.code).toBe('ADMIN_USER_NOT_FOUND');
  });

  it('CA-23.2 Un docente con cursos asignados no puede perder su rol (409)', async () => {
    const { status, body } = await api('PATCH', `/admin/users/${ANA}/role`, { ...comoAdmin, body: { rol: 'estudiante' } });
    expect(status).toBe(409);
    expect(body.code).toBe('ADMIN_TEACHER_HAS_COURSES');
  });

  it('CA-23.2 Desactivar a un docente con cursos está permitido y NO altera sus cursos (S3)', async () => {
    try {
      const { status, body } = await api('PATCH', `/admin/users/${ANA}/status`, { ...comoAdmin, body: { activo: false } });
      expect(status).toBe(200);
      expect(body).toMatchObject({ id_usuario: ANA, activo: false, rol: 'docente' });

      const curso = await api('GET', `/courses/${CURSO_ID}`);
      expect(curso.status).toBe(200);
      expect(curso.body.docente_id).toBe(ANA);
    } finally {
      const { body } = await api('PATCH', `/admin/users/${ANA}/status`, { ...comoAdmin, body: { activo: true } });
      expect(body.activo).toBe(true);
    }
  });

  it('CA-23.2 Desactivar y reactivar una cuenta se refleja en el filtro por estado', async () => {
    try {
      const baja = await api('PATCH', `/admin/users/${THALIA}/status`, { ...comoAdmin, body: { activo: false } });
      expect(baja.status).toBe(200);
      const inactivos = await api('GET', '/admin/users?activo=false&search=thaliabernal', comoAdmin);
      expect(inactivos.body.data.map((u) => u.id_usuario)).toContain(THALIA);
    } finally {
      const alta = await api('PATCH', `/admin/users/${THALIA}/status`, { ...comoAdmin, body: { activo: true } });
      expect(alta.body.activo).toBe(true);
    }
  });

  it('CA-23.2 El campo activo debe ser booleano (400)', async () => {
    const { status, body } = await api('PATCH', `/admin/users/${THALIA}/status`, { ...comoAdmin, body: { activo: 'no' } });
    expect(status).toBe(400);
    expect(body.code).toBe('ADMIN_INVALID_STATUS');
  });

  // Necesitan un idToken real firmado por Google o dejarían un administrador en la BD compartida.
  it.todo('CA-23.2 La cuenta desactivada no inicia sesión (AUTH_ACCOUNT_INACTIVE) — MANUAL (token real de Google)');
  it.todo('CA-23.2 No se quita el rol ni se desactiva al último administrador activo (409) — cubierto en pruebas unitarias y Paso 12');
});
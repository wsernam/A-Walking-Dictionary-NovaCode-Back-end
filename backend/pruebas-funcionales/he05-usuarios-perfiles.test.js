// HE-05 — Gestión de Usuarios, Perfiles e Inscripción (HU-5.1, HU-5.2, HU-5.3, HU-5.4)

import { describe, it, expect } from 'vitest';
import { api, token, USUARIOS, CURSO_ID, MAZO_ABIERTO_SEED } from './soporte/cliente.js';

describe('HU-5.1 — Registrar estudiante autónomamente', () => {
  it('CA-5.1.2 Sin token de Google la solicitud se rechaza', async () => {
    const { status } = await api('POST', '/auth/register', { body: {} });
    expect([400, 401]).toContain(status);
  });

  it('CA-5.1.2 Un token de Google inválido se rechaza (401)', async () => {
    const { status, body } = await api('POST', '/auth/register', { body: { idToken: 'token-falso' } });
    expect(status).toBe(401);
    expect(body.code).toBe('AUTH_GOOGLE_TOKEN_INVALID');
  });

  // Requieren un idToken real firmado por Google: no se pueden automatizar sin una cuenta de prueba.
  it.todo('CA-5.1.1 Registro con correo @unicauca.edu.co crea la cuenta con rol "Estudiante" — MANUAL (token real de Google)');
  it.todo('CA-5.1.2 Correo ya registrado o no institucional se rechaza — MANUAL (token real de Google)');
});

describe('HU-5.2 — Configurar perfil académico', () => {
  it('CA-5.2.1 Perfil académico: guarda nivel MCER, código estudiantil y avatar', async () => {
    const { status, body } = await api('PATCH', '/users/profile', {
      como: 'juan',
      body: { nivel_ingles: 'C1', codigo_estudiantil: '104620011234', avatar: '/avatars/avatar-3.png' },
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ estudiante_id: 2, nivel_ingles: 'C1', codigo_estudiantil: '104620011234', avatar: '/avatars/avatar-3.png' });

    const perfil = await api('GET', '/users/2', { como: 'juan' });
    expect(perfil.body).toMatchObject({ nivel_ingles: 'C1', codigo_estudiantil: '104620011234' });
  });

  it('CA-5.2.1 Un nivel fuera de A1-C2 se rechaza (400)', async () => {
    const { status, body } = await api('PATCH', '/users/profile', { como: 'juan', body: { nivel_ingles: 'D1' } });
    expect(status).toBe(400);
    expect(body.code).toBe('PROFILE_INVALID_LEVEL');
  });

  it('CA-5.2.1 El avatar no puede ser un archivo en base64 (400)', async () => {
    const { status } = await api('PATCH', '/users/profile', { como: 'juan', body: { avatar: 'data:image/png;base64,AAAA' } });
    expect(status).toBe(400);
  });

  it('CA-5.2.2 Preferencias: guarda las áreas a reforzar', async () => {
    const intereses = ['Poesía', 'Teatro', 'Phrasal verbs'];
    const { status, body } = await api('PATCH', '/users/profile', { como: 'maria', body: { intereses } });
    expect(status).toBe(200);
    expect(body.intereses).toEqual(intereses);
  });

  it('CA-5.2.2 La docente puede consultar el perfil del estudiante para el seguimiento', async () => {
    const { status, body } = await api('GET', '/users/3', { como: 'ana' });
    expect(status).toBe(200);
    expect(body.intereses).toEqual(['Poesía', 'Teatro', 'Phrasal verbs']);
  });

  it('CA-5.2.x Un estudiante no puede ver el perfil de otro (403)', async () => {
    const { status, body } = await api('GET', '/users/3', { como: 'juan' });
    expect(status).toBe(403);
    expect(body.code).toBe('PROFILE_FORBIDDEN');
  });
});

describe('HU-5.3 — Inscribir o asignar a cursos', () => {
  let codigo;

  it('CA-5.3.1 La docente genera el código de acceso del curso', async () => {
    const { status, body } = await api('POST', `/courses/${CURSO_ID}/access-code`, { como: 'ana' });
    expect(status).toBe(200);
    expect(body.codigo_acceso).toMatch(/^[A-Z0-9]{8}$/);
    codigo = body.codigo_acceso;
  });

  it('CA-5.3.1 Inscripción vía código: el estudiante queda vinculado al curso', async () => {
    const { status, body } = await api('POST', '/courses/enroll', { como: 'karen', body: { codigo_acceso: codigo.toLowerCase() } });
    expect(status).toBe(201);
    expect(body).toMatchObject({ curso_id: CURSO_ID, estudiante_id: USUARIOS.karen.id_usuario, estado: 'activa' });

    // una vez inscrito, ve los mazos del curso
    const mazos = await api('GET', '/decks', { como: 'karen' });
    expect(mazos.body.map((m) => m.id_mazo)).toContain(MAZO_ABIERTO_SEED);
  });

  it('CA-5.3.1 Inscribirse dos veces en el mismo curso se rechaza (409)', async () => {
    const { status, body } = await api('POST', '/courses/enroll', { como: 'karen', body: { codigo_acceso: codigo } });
    expect(status).toBe(409);
    expect(body.code).toBe('ENROLL_ALREADY_ENROLLED');
  });

  it('CA-5.3.1 Un código inválido se rechaza (404)', async () => {
    const { status, body } = await api('POST', '/courses/enroll', { como: 'manuela', body: { codigo_acceso: 'ZZZZZZZZ' } });
    expect(status).toBe(404);
    expect(body.code).toBe('ENROLL_INVALID_CODE');
  });

  it('CA-5.3.1 El código de acceso solo lo ve la docente', async () => {
    const docente = await api('GET', `/courses/${CURSO_ID}`, { como: 'ana' });
    const estudiante = await api('GET', `/courses/${CURSO_ID}`, { como: 'juan' });
    expect(docente.body.codigo_acceso).toBe(codigo);
    expect(estudiante.body).not.toHaveProperty('codigo_acceso');
  });

  it('CA-5.3.2 Inscripción directa: la docente inscribe a un estudiante por correo', async () => {
    const { status, body } = await api('POST', `/courses/${CURSO_ID}/assign`, { como: 'ana', body: { email: USUARIOS.manuela.email } });
    expect(status).toBe(201);
    expect(body).toMatchObject({ curso_id: CURSO_ID, estudiante_id: USUARIOS.manuela.id_usuario, estado: 'activa' });

    const mazos = await api('GET', '/decks', { como: 'manuela' });
    expect(mazos.body.map((m) => m.id_mazo)).toContain(MAZO_ABIERTO_SEED);
  });

  it('CA-5.3.2 Correo inexistente (404) o de una docente (400) se rechaza', async () => {
    expect((await api('POST', `/courses/${CURSO_ID}/assign`, { como: 'ana', body: { email: 'nadie@unicauca.edu.co' } })).status).toBe(404);
    expect((await api('POST', `/courses/${CURSO_ID}/assign`, { como: 'ana', body: { email: USUARIOS.william.email } })).status).toBe(400);
  });

  it('CA-5.3.2 Un estudiante no puede inscribir a otros (403)', async () => {
    const { status } = await api('POST', `/courses/${CURSO_ID}/assign`, { como: 'juan', body: { email: 'thaliabernal@unicauca.edu.co' } });
    expect(status).toBe(403);
  });
});

describe('HU-5.4 — Iniciar sesión y control de roles', () => {
  it('CA-5.4.1 Con un JWT válido (claims de rol) se accede a las rutas protegidas', async () => {
    const { status } = await api('GET', '/cards/pending', { como: 'ana' });
    expect(status).toBe(200);
  });

  it('CA-5.4.1 Sin token, una ruta protegida responde 401', async () => {
    const { status, body } = await api('GET', '/cards/pending');
    expect(status).toBe(401);
    expect(body.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('CA-5.4.1 Un token alterado o expirado responde 401', async () => {
    const alterado = token(USUARIOS.juan).slice(0, -3) + 'abc';
    const expirado = token(USUARIOS.ana, { expiresIn: -10 });
    for (const tokenCrudo of [alterado, expirado]) {
      const { status, body } = await api('GET', '/cards/pending', { tokenCrudo });
      expect(status).toBe(401);
      expect(body.code).toBe('AUTH_TOKEN_INVALID');
    }
  });

  it('CA-5.4.1 Login con un token de Google inválido se rechaza (401)', async () => {
    const { status, body } = await api('POST', '/auth/google', { body: { idToken: 'token-falso' } });
    expect(status).toBe(401);
    expect(body.code).toBe('AUTH_GOOGLE_TOKEN_INVALID');
  });

  it.each([
    ['POST', '/decks'],
    ['GET', '/cards/pending'],
    ['GET', '/cards/approved'],
    ['PATCH', `/decks/${MAZO_ABIERTO_SEED}/estado`],
    ['GET', `/teacher/analytics/deck/${MAZO_ABIERTO_SEED}`],
    ['POST', '/quizzes/generate'],
    ['POST', `/courses/${CURSO_ID}/access-code`],
    ['GET', '/decks/1/export-pdf'],
  ])('CA-5.4.2 Un estudiante en una ruta de docente (%s %s) recibe 403', async (metodo, ruta) => {
    const { status, body } = await api(metodo, ruta, { como: 'juan', body: metodo === 'GET' ? undefined : {} });
    expect(status).toBe(403);
    expect(body.code).toBe('AUTH_FORBIDDEN');
  });

  it('CA-5.4.3 Invitado: sin sesión puede consultar mazos y tarjetas (solo lectura)', async () => {
    expect((await api('GET', '/decks')).status).toBe(200);
    expect((await api('GET', `/decks/${MAZO_ABIERTO_SEED}`)).status).toBe(200);
    const cursos = await api('GET', '/courses');
    expect(cursos.status).toBe(200);
    expect(cursos.body.every((c) => !('codigo_acceso' in c))).toBe(true);
  });

  it('CA-5.4.3 Invitado: no puede editar (aportar palabras responde 401)', async () => {
    const { status } = await api('POST', `/decks/${MAZO_ABIERTO_SEED}/cards`, {
      body: { palabra: 'guest', traduccion: 'invitado', definicion: 'x' },
    });
    expect(status).toBe(401);
  });
});

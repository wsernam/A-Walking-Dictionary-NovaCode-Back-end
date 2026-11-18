// IDOR (documento "Matriz RBAC", sección 7): un usuario con el ROL correcto intenta acceder a un
// recurso que no es suyo cambiando un identificador.
//
//   Estudiante A = juan (id 2, inscripción 1)   Estudiante B = maria (id 3, inscripción 2)
//   No inscrita  = thalia (id 8)                 Docente dueña = ana (id 1)   Docente ajena = william (id 5)
//
// Cada caso declara el resultado SEGURO (normalmente 403). Un hueco ya conocido se marca con
// "hallazgo": ese caso corre con it.fails, de modo que la integración continua sigue en verde, el
// hueco queda visible en el reporte y la prueba avisa cuando el backend se corrija.
// Los datos que se modifican los crea la propia prueba (mazos, palabras, aportes y quices); del
// seed solo se usan los usuarios, el curso 1 y el mazo 6, y este último sin modificarlo.

import { describe, it, expect, beforeAll } from 'vitest';
import { api, crearMazo, registrarPalabra, enMinutos, CURSO_ID, MAZO_ABIERTO_SEED } from './soporte/cliente.js';

const MAZOS_CERRADOS = [1, 2]; // tarjetas aprobadas: sirven para generar quices
const INSCRIPCION_JUAN = 1;
const INSCRIPCION_MARIA = 2;

let ctx = {};

/** Juan registra una palabra nueva en un mazo creado por la prueba y devuelve { tarjeta, aporte }. */
async function nuevaPalabraDeJuan() {
  const { status, body } = await registrarPalabra('juan', ctx.mazoPalabras);
  if (status !== 201) throw new Error(`No se pudo crear la palabra de prueba: ${status} ${JSON.stringify(body)}`);
  return body;
}

/** Ana genera un quiz abierto con los mazos cerrados del seed y devuelve su id. */
async function nuevoQuizDeAna() {
  const { status, body } = await api('POST', '/quizzes/generate', {
    como: 'ana',
    body: {
      curso_id: CURSO_ID,
      titulo: 'Quiz IDOR',
      mazo_ids: MAZOS_CERRADOS,
      fecha_apertura: enMinutos(-1),
      fecha_cierre: enMinutos(120),
      tiempo_limite_min: 30,
    },
  });
  if (status !== 201) throw new Error(`No se pudo generar el quiz de prueba: ${status} ${JSON.stringify(body)}`);
  return body.quiz.id_quiz;
}

beforeAll(async () => {
  // Mazos propios de la prueba: así no se altera el mazo 6 del seed, que otras pruebas cuentan.
  ctx.mazoPalabras = (await crearMazo()).id_mazo;
  ctx.mazoDeAna = (await crearMazo()).id_mazo;
  const palabra = await nuevaPalabraDeJuan();
  ctx.tarjeta = palabra.tarjeta.id_tarjeta;
  ctx.aporte = palabra.aporte.id_aporte;
  ctx.quiz = await nuevoQuizDeAna();
});

const esperar403 = (respuesta) => expect(respuesta.status).toBe(403);

/** Un caso: id, actor, descripción, función que hace la petición y verificación (por defecto 403). */
const GRUPOS = [
  {
    nombre: 'Estudiante A contra estudiante B',
    casos: [
      { id: 'IDOR-01', como: 'maria', texto: 'GET /users/2', pedir: (c) => api('GET', '/users/2', { como: c }) },
      { id: 'IDOR-02', como: 'maria', texto: 'GET /students/2/context', pedir: (c) => api('GET', '/students/2/context', { como: c }) },
      { id: 'IDOR-03', como: 'maria', texto: 'GET /reports/students/2/progress/export-pdf', pedir: (c) => api('GET', '/reports/students/2/progress/export-pdf', { como: c }) },
      { id: 'IDOR-04', como: 'maria', texto: 'POST /study/review-session con inscripcion_id 1', pedir: (c) => api('POST', '/study/review-session', { como: c, body: { inscripcion_id: INSCRIPCION_JUAN } }) },
      { id: 'IDOR-05', como: 'maria', texto: 'POST /study/review-session/review con inscripcion_id 1', pedir: (c) => api('POST', '/study/review-session/review', { como: c, body: { inscripcion_id: INSCRIPCION_JUAN, tarjeta_id: ctx.tarjeta, valoracion: 'bien' } }) },
      { id: 'IDOR-06', como: 'maria', texto: 'GET /aportes/:id de un aporte de A', pedir: (c) => api('GET', `/aportes/${ctx.aporte}`, { como: c }) },
      { id: 'IDOR-07', como: 'maria', texto: 'POST /aportes con inscripcion_id 1', pedir: (c) => api('POST', '/aportes', { como: c, body: { tarjeta_id: ctx.tarjeta, inscripcion_id: INSCRIPCION_JUAN, traduccion_aportada: 'x', tipo_aporte: 'coautoria' } }) },
      {
        id: 'IDOR-08', como: 'maria', texto: 'GET /aportes devuelve solo los de B',
        pedir: (c) => api('GET', '/aportes', { como: c }),
        verificar: (r) => {
          expect(r.status).toBe(200);
          expect(r.body.filter((a) => a.inscripcion_id !== INSCRIPCION_MARIA)).toEqual([]);
        },
      },
    ],
  },
  {
    nombre: 'Estudiante no inscrito',
    casos: [
      { id: 'IDOR-09', como: 'thalia', texto: 'POST /decks/6/cards', pedir: (c) => registrarPalabra(c, MAZO_ABIERTO_SEED) },
      { id: 'IDOR-10', como: 'thalia', texto: 'GET /quizzes/:id/preguntas', pedir: (c) => api('GET', `/quizzes/${ctx.quiz}/preguntas`, { como: c }) },
      { id: 'IDOR-11', como: 'thalia', texto: 'POST /quizzes/:id/submit', pedir: (c) => api('POST', `/quizzes/${ctx.quiz}/submit`, { como: c, body: { respuestas: [] } }) },
      { id: 'IDOR-12', como: 'thalia', texto: 'GET /quizzes/:id/result', pedir: (c) => api('GET', `/quizzes/${ctx.quiz}/result`, { como: c }) },
      { id: 'IDOR-13', como: 'thalia', texto: 'GET /quizzes/:id', pedir: (c) => api('GET', `/quizzes/${ctx.quiz}`, { como: c }) },
      {
        id: 'IDOR-14', como: 'thalia', texto: 'GET /decks no incluye mazos del curso 1',
        pedir: (c) => api('GET', '/decks', { como: c }),
        verificar: (r) => {
          expect(r.status).toBe(200);
          expect(r.body.filter((m) => m.curso_id === CURSO_ID)).toEqual([]);
        },
      },
      { id: 'IDOR-15', como: 'thalia', texto: 'POST /study/review-session con inscripcion_id 1', pedir: (c) => api('POST', '/study/review-session', { como: c, body: { inscripcion_id: INSCRIPCION_JUAN } }) },
    ],
  },
  {
    nombre: 'Docente ajena contra recursos de la docente dueña',
    casos: [
      { id: 'IDOR-16', como: 'william', texto: 'PUT /decks/6', pedir: (c) => api('PUT', `/decks/${MAZO_ABIERTO_SEED}`, { como: c, body: { nombre_lectura: 'Cambio ajeno' } }) },
      { id: 'IDOR-17', como: 'william', texto: 'DELETE /decks/:id de un mazo de Ana', pedir: (c) => api('DELETE', `/decks/${ctx.mazoDeAna}`, { como: c }) },
      { id: 'IDOR-18', como: 'william', texto: 'PATCH /decks/6/default-variant', pedir: (c) => api('PATCH', `/decks/${MAZO_ABIERTO_SEED}/default-variant`, { como: c, body: { variante_regional: 'Inglés Jamaicano' } }) },
      {
        // Decisión del equipo (2026-11-11, CA-1.1.3): cualquier docente puede abrir o cerrar un mazo.
        id: 'IDOR-19', como: 'william', texto: 'PATCH /decks/6/estado (permitido por decisión del equipo)',
        pedir: (c) => api('PATCH', `/decks/${MAZO_ABIERTO_SEED}/estado`, { como: c, body: { estado: 'abierto' } }),
        verificar: (r) => expect(r.status).toBe(200),
      },
      { id: 'IDOR-20', como: 'william', texto: 'GET /decks/6/export-pdf', pedir: (c) => api('GET', `/decks/${MAZO_ABIERTO_SEED}/export-pdf`, { como: c }) },
      { id: 'IDOR-21', como: 'william', texto: 'GET /teacher/analytics/deck/6', pedir: (c) => api('GET', `/teacher/analytics/deck/${MAZO_ABIERTO_SEED}`, { como: c }) },
      { id: 'IDOR-22', como: 'william', texto: 'PATCH /cards/:id/approve', pedir: async (c) => api('PATCH', `/cards/${(await nuevaPalabraDeJuan()).tarjeta.id_tarjeta}/approve`, { como: c, body: {} }) },
      { id: 'IDOR-23', como: 'william', texto: 'PUT /cards/:id', pedir: async (c) => api('PUT', `/cards/${(await nuevaPalabraDeJuan()).tarjeta.id_tarjeta}`, { como: c, body: { definicion: 'Cambio ajeno.' } }) },
      { id: 'IDOR-24', como: 'william', texto: 'PUT /cards/:id/context', pedir: async (c) => api('PUT', `/cards/${(await nuevaPalabraDeJuan()).tarjeta.id_tarjeta}/context`, { como: c, body: { registro: 'Formal' } }) },
      { id: 'IDOR-25', como: 'william', texto: 'POST /courses/1/access-code', pedir: (c) => api('POST', `/courses/${CURSO_ID}/access-code`, { como: c }) },
      { id: 'IDOR-26', como: 'william', texto: 'POST /courses/1/assign', pedir: (c) => api('POST', `/courses/${CURSO_ID}/assign`, { como: c, body: { email: 'sin.cuenta@unicauca.edu.co' } }) },
      { id: 'IDOR-27', como: 'william', texto: 'GET /courses/1/students', pedir: (c) => api('GET', `/courses/${CURSO_ID}/students`, { como: c }) },
      { id: 'IDOR-28', como: 'william', texto: 'PUT /aportes/:id', pedir: async (c) => api('PUT', `/aportes/${(await nuevaPalabraDeJuan()).aporte.id_aporte}`, { como: c, body: { traduccion_aportada: 'cambio ajeno' } }) },
      {
        // Un aporte 'creada' ya responde 403 CONTRIBUTION_NOT_APPROVABLE por otra razón: no cuenta.
        id: 'IDOR-29', como: 'william', texto: 'PATCH /aportes/:id/approve',
        pedir: async (c) => api('PATCH', `/aportes/${(await nuevaPalabraDeJuan()).aporte.id_aporte}/approve`, { como: c, body: {} }),
        verificar: (r) => {
          expect(r.status).toBe(403);
          expect(r.body.code).not.toBe('CONTRIBUTION_NOT_APPROVABLE');
        },
      },
      { id: 'IDOR-30', como: 'william', texto: 'DELETE /aportes/:id', pedir: async (c) => api('DELETE', `/aportes/${(await nuevaPalabraDeJuan()).aporte.id_aporte}`, { como: c }) },
      { id: 'IDOR-31', como: 'william', texto: 'GET /quizzes/:id', pedir: (c) => api('GET', `/quizzes/${ctx.quiz}`, { como: c }) },
      { id: 'IDOR-32', como: 'william', texto: 'PUT /quizzes/:id', pedir: async (c) => api('PUT', `/quizzes/${await nuevoQuizDeAna()}`, { como: c, body: { titulo: 'Cambio ajeno' } }) },
      { id: 'IDOR-33', como: 'william', texto: 'DELETE /quizzes/:id', pedir: async (c) => api('DELETE', `/quizzes/${await nuevoQuizDeAna()}`, { como: c }) },
      { id: 'IDOR-34', como: 'william', texto: 'GET /quizzes/:id/export-pdf', pedir: (c) => api('GET', `/quizzes/${ctx.quiz}/export-pdf`, { como: c }) },
      { id: 'IDOR-35', como: 'william', texto: 'GET /quizzes/:id/teacher-results', pedir: (c) => api('GET', `/quizzes/${ctx.quiz}/teacher-results`, { como: c }) },
      { id: 'IDOR-36', como: 'william', texto: 'GET /reports/quizzes/:id/results/export-pdf', pedir: (c) => api('GET', `/reports/quizzes/${ctx.quiz}/results/export-pdf`, { como: c }) },
      { id: 'IDOR-37', como: 'william', texto: 'GET /reports/students/export-pdf?curso_id=1', pedir: (c) => api('GET', `/reports/students/export-pdf?curso_id=${CURSO_ID}`, { como: c }) },
    ],
  },
];

// Huecos CONFIRMADOS al ejecutar esta prueba contra el backend (develop, 2026-11-17). Cuando se
// corrija uno, su caso empieza a pasar, it.fails lo reporta como fallo y se borra de esta lista.
const HALLAZGOS = {
  'IDOR-06': 'HALLAZGO-3: GET /aportes/:id no comprueba que el aporte sea del estudiante',
  'IDOR-07': 'HALLAZGO-3: POST /aportes acepta el inscripcion_id de otro estudiante (responde 500, no 403)',
  'IDOR-08': 'HALLAZGO-3: GET /aportes lista los aportes de todos los estudiantes',
  'IDOR-28': 'HALLAZGO-4: PUT /aportes/:id no comprueba al docente dueño del curso',
  'IDOR-29': 'HALLAZGO-4: PATCH /aportes/:id/approve no comprueba al docente dueño del curso',
  'IDOR-30': 'HALLAZGO-4: DELETE /aportes/:id no comprueba al docente dueño del curso',
  'IDOR-22': 'HALLAZGO-5: PATCH /cards/:id/approve no comprueba al docente dueño del curso',
  'IDOR-23': 'HALLAZGO-5: PUT /cards/:id no comprueba al docente dueño del curso',
  'IDOR-24': 'HALLAZGO-5: PUT /cards/:id/context no comprueba al docente dueño del curso',
  'IDOR-25': 'HALLAZGO-6: POST /courses/:id/access-code no comprueba al docente dueño del curso',
  'IDOR-26': 'HALLAZGO-6: POST /courses/:id/assign no comprueba al docente dueño del curso',
  'IDOR-27': 'HALLAZGO-6: GET /courses/:id/students no comprueba al docente dueño del curso',
  'IDOR-20': 'HALLAZGO-7: GET /decks/:id/export-pdf no comprueba al docente dueño del mazo',
  'IDOR-21': 'HALLAZGO-7: GET /teacher/analytics/deck/:id no comprueba al docente dueño del mazo',
  'IDOR-13': 'HALLAZGO-8: GET /quizzes/:id no exige estar inscrito en el curso del quiz',
  'IDOR-31': 'HALLAZGO-8: GET /quizzes/:id no comprueba al docente dueño del curso',
  'IDOR-32': 'HALLAZGO-8: PUT /quizzes/:id no comprueba al docente dueño del curso (responde 500)',
  'IDOR-33': 'HALLAZGO-8: DELETE /quizzes/:id no comprueba al docente dueño del curso (responde 500)',
  'IDOR-34': 'HALLAZGO-8: GET /quizzes/:id/export-pdf no comprueba al docente dueño del curso',
  'IDOR-35': 'HALLAZGO-8: GET /quizzes/:id/teacher-results no comprueba al docente dueño del curso',
  'IDOR-37': 'HALLAZGO-9: GET /reports/students/export-pdf no compara curso.docente_id con el token',
};

describe.each(GRUPOS)('IDOR — $nombre', ({ casos }) => {
  for (const caso of casos) {
    const hallazgo = HALLAZGOS[caso.id];
    const prueba = hallazgo ? it.fails : it;

    prueba(`${caso.id} ${caso.como}: ${caso.texto}${hallazgo ? ` [${hallazgo}]` : ''}`, async () => {
      const respuesta = await caso.pedir(caso.como);
      expect(respuesta.status, '429: se agotó el límite de solicitudes; defina RATE_LIMIT_AUTH_MAX, RATE_LIMIT_REPORTES_MAX y RATE_LIMIT_ADMIN_MAX en backend/.env y reinicie el backend').not.toBe(429);
      (caso.verificar ?? esperar403)(respuesta);
    });
  }
});

// Controles: el dueño sí puede. Sin ellos, un 403 podría venir de un error en la prueba.
describe('IDOR — controles (el dueño sí accede)', () => {
  it('A ve su propio perfil', async () => expect((await api('GET', '/users/2', { como: 'juan' })).status).toBe(200));
  it('A ve su propio aporte', async () => expect((await api('GET', `/aportes/${ctx.aporte}`, { como: 'juan' })).status).toBe(200));
  it('A abre su sesión de estudio', async () => {
    const { status } = await api('POST', '/study/review-session', { como: 'juan', body: { inscripcion_id: INSCRIPCION_JUAN } });
    expect(status).toBeLessThan(300);
  });
  it('A (inscrito) ve las preguntas del quiz', async () => expect((await api('GET', `/quizzes/${ctx.quiz}/preguntas`, { como: 'juan' })).status).toBe(200));
  it('Ana ve los estudiantes de su curso', async () => expect((await api('GET', `/courses/${CURSO_ID}/students`, { como: 'ana' })).status).toBe(200));
  it('Ana edita su mazo', async () => expect((await api('PUT', `/decks/${ctx.mazoDeAna}`, { como: 'ana', body: { nombre_lectura: 'Mazo de Ana editado' } })).status).toBe(200));
});
// HE-03 — Evaluación Automatizada y Exportación (HU-3.1, HU-3.2, HU-3.3)

import { describe, it, expect, beforeAll } from 'vitest';
import { api, CURSO_ID, MAZO_ABIERTO_SEED, enMinutos } from './soporte/cliente.js';

const MAZOS_CERRADOS = [1, 2]; // "Stitch by Stitch" y "Just Ask!", solo tarjetas aprobadas

function generarQuiz(datos = {}, como = 'ana') {
  return api('POST', '/quizzes/generate', {
    como,
    body: {
      curso_id: CURSO_ID,
      titulo: 'Quiz acumulativo de prueba',
      mazo_ids: MAZOS_CERRADOS,
      fecha_apertura: enMinutos(-1),
      fecha_cierre: enMinutos(120),
      tiempo_limite_min: 30,
      ...datos,
    },
  });
}

describe('HU-3.1 — Generar quices acumulativos', () => {
  it('CA-3.1.1 Selección: el quiz usa exclusivamente tarjetas "revisado_docente" de los mazos elegidos', async () => {
    const aprobadas = await api('GET', '/cards/approved', { como: 'ana' });
    const pendientes = await api('GET', '/cards/pending', { como: 'ana' });
    const idsAprobadasDelMazo = aprobadas.body.filter((t) => t.mazo_id === MAZO_ABIERTO_SEED).map((t) => t.id_tarjeta);
    const idsPendientes = pendientes.body.map((t) => t.id_tarjeta);

    // "Fear of Stones" mezcla tarjetas aprobadas y pendientes
    const { status, body } = await generarQuiz({ mazo_ids: [MAZO_ABIERTO_SEED] });
    expect(status).toBe(201);

    const usadas = body.preguntas.map((p) => p.tarjeta_id);
    expect(usadas.sort()).toEqual([...idsAprobadasDelMazo].sort());
    expect(usadas.some((id) => idsPendientes.includes(id))).toBe(false);
  });

  it('CA-3.1.2 Generación: preguntas de opción múltiple con 4 opciones distintas y la correcta entre ellas', async () => {
    const { status, body } = await generarQuiz();
    expect(status).toBe(201);
    expect(body.preguntas.length).toBeGreaterThan(0);

    for (const p of body.preguntas) {
      const opciones = [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d];
      expect(new Set(opciones.map((o) => o.toLowerCase())).size).toBe(4);
      expect(opciones).toContain(p.respuesta_correcta);
    }
  });

  it('CA-3.1.2 Con cantidad_preguntas se toma una muestra aleatoria de ese tamaño', async () => {
    const { body } = await generarQuiz({ cantidad_preguntas: 5 });
    expect(body.preguntas).toHaveLength(5);
  });

  it('CA-3.1.3 Configuración: con apertura futura queda en estado "programado"', async () => {
    const { status, body } = await generarQuiz({ fecha_apertura: enMinutos(60 * 24), fecha_cierre: enMinutos(60 * 26) });
    expect(status).toBe(201);
    expect(body.quiz).toMatchObject({ estado: 'programado', estado_efectivo: 'programado', tiempo_limite_min: 30 });
  });

  it('CA-3.1.3 Publicación automática: al llegar la fecha de apertura el quiz figura "abierto"', async () => {
    const { body } = await generarQuiz({ fecha_apertura: enMinutos(-1) });
    const consulta = await api('GET', `/quizzes/${body.quiz.id_quiz}`, { como: 'ana' });
    expect(consulta.body.estado_efectivo).toBe('abierto');
  });

  it('CA-3.1.3 La ventana apertura-cierre no puede ser menor que el tiempo límite (400)', async () => {
    const { status } = await generarQuiz({ fecha_apertura: enMinutos(10), fecha_cierre: enMinutos(20), tiempo_limite_min: 30 });
    expect(status).toBe(400);
  });

  it('CA-3.1.3 El cierre debe ser posterior a la apertura (400)', async () => {
    const { status } = await generarQuiz({ fecha_apertura: enMinutos(60), fecha_cierre: enMinutos(30) });
    expect(status).toBe(400);
  });

  it('CA-3.1.x Un estudiante no puede generar quices (403)', async () => {
    const { status } = await generarQuiz({}, 'juan');
    expect(status).toBe(403);
  });
});

describe('HU-3.2 — Responder quiz y recibir nota', () => {
  let quiz;
  let preguntas; // con respuesta_correcta (vista de la docente)

  beforeAll(async () => {
    const { body } = await generarQuiz({ titulo: 'Quiz para responder' });
    quiz = body.quiz;
    preguntas = body.preguntas;
  });

  it('HU-3.2 El estudiante recibe las preguntas sin la clave de respuestas', async () => {
    const { status, body } = await api('GET', `/quizzes/${quiz.id_quiz}/preguntas`, { como: 'juan' });
    expect(status).toBe(200);
    expect(body.preguntas).toHaveLength(preguntas.length);
    for (const p of body.preguntas) {
      expect(p).not.toHaveProperty('respuesta_correcta');
      expect(p).not.toHaveProperty('tarjeta_id');
    }
  });

  it('CA-3.2.2 Calificación inmediata: calcula el puntaje, el desglose y lo registra en el historial', async () => {
    // Juan acierta todas menos la primera
    const respuestas = preguntas.map((p, i) => ({
      pregunta_id: p.id_pregunta,
      respuesta_estudiante: i === 0 ? [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d].find((o) => o !== p.respuesta_correcta) : p.respuesta_correcta,
    }));

    const { status, body } = await api('POST', `/quizzes/${quiz.id_quiz}/submit`, {
      como: 'juan',
      body: { respuestas, tiempo_empleado_seg: 300 },
    });

    const n = preguntas.length;
    expect(status).toBe(201);
    // OBSERVACIÓN: la API devuelve los puntajes como string (columnas NUMERIC de pg); el front ya
    // los convierte con Number() en ResultadoQuiz.jsx, por eso se comparan como número.
    expect(body.resultado.estudiante_id).toBe(2);
    expect(Number(body.resultado.puntaje_obtenido)).toBe(n - 1);
    expect(Number(body.resultado.puntaje_maximo)).toBe(n);
    expect(Number(body.resultado.calificacion)).toBeCloseTo(((n - 1) / n) * 5, 2);
    expect(body.respuestas).toHaveLength(n);
    expect(body.respuestas.filter((r) => r.es_correcta === false)).toHaveLength(1);

    const historial = await api('GET', '/quizzes/mine', { como: 'juan' });
    const enHistorial = historial.body.find((q) => q.id_quiz === quiz.id_quiz);
    expect(enHistorial.resultado).not.toBeNull();
  });

  it('CA-3.2.3 Reintento no autorizado: un segundo envío se deniega y devuelve el resultado previo (409)', async () => {
    const { status, body } = await api('POST', `/quizzes/${quiz.id_quiz}/submit`, {
      como: 'juan',
      body: { respuestas: [] },
    });
    expect(status).toBe(409);
    expect(Number(body.resultado.puntaje_obtenido)).toBe(preguntas.length - 1);

    const resumen = await api('GET', `/quizzes/${quiz.id_quiz}/result`, { como: 'juan' });
    expect(resumen.status).toBe(200);
    expect(resumen.body.resultado.id_resultado).toBe(body.resultado.id_resultado);
  });

  it('CA-3.2.1 Control de tiempo: el autoenvío al agotarse el tiempo califica solo lo contestado', async () => {
    const primera = preguntas[0];
    const { status, body } = await api('POST', `/quizzes/${quiz.id_quiz}/submit`, {
      como: 'maria',
      body: {
        respuestas: [{ pregunta_id: primera.id_pregunta, respuesta_estudiante: primera.respuesta_correcta }],
        tiempo_empleado_seg: 30 * 60, // justo el tiempo límite
      },
    });
    expect(status).toBe(201);
    expect(Number(body.resultado.puntaje_obtenido)).toBe(1);
    expect(body.respuestas.filter((r) => r.respuesta_estudiante === null)).toHaveLength(preguntas.length - 1);
  });

  it('CA-3.2.1 Control de tiempo: un envío que excede el tiempo límite se rechaza (400)', async () => {
    const { status } = await api('POST', `/quizzes/${quiz.id_quiz}/submit`, {
      como: 'carlos',
      body: { respuestas: [], fecha_inicio: enMinutos(-40) },
    });
    expect(status).toBe(400);
  });

  it('HU-3.2 Un estudiante no inscrito en el curso no puede responder (403)', async () => {
    const { status } = await api('POST', `/quizzes/${quiz.id_quiz}/submit`, { como: 'thalia', body: { respuestas: [] } });
    expect(status).toBe(403);
  });

  it('HU-3.2 Un quiz programado (aún no abierto) no acepta respuestas (400)', async () => {
    const futuro = await generarQuiz({ fecha_apertura: enMinutos(60), fecha_cierre: enMinutos(180) });
    const { status } = await api('POST', `/quizzes/${futuro.body.quiz.id_quiz}/submit`, { como: 'juan', body: { respuestas: [] } });
    expect(status).toBe(400);
  });
});

describe('HU-3.3 — Exportar mazos y quices a PDF', () => {
  let quizId;
  beforeAll(async () => {
    const { body } = await generarQuiz({ titulo: 'Quiz para imprimir' });
    quizId = body.quiz.id_quiz;
  });

  const esPdf = (respuesta) => {
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('application/pdf');
    expect(respuesta.headers.get('content-disposition')).toContain('attachment');
    expect(respuesta.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(respuesta.body.length).toBeGreaterThan(1000);
  };

  it('CA-3.3.1 PDF del mazo semanal: la docente descarga el mazo como PDF', async () => {
    esPdf(await api('GET', '/decks/1/export-pdf', { como: 'ana' }));
  });

  it('CA-3.3.2 PDF del quiz: la docente descarga la versión impresa del quiz', async () => {
    esPdf(await api('GET', `/quizzes/${quizId}/export-pdf`, { como: 'ana' }));
  });

  it('CA-3.3.x (D-07) Un estudiante no puede exportar PDF (403)', async () => {
    expect((await api('GET', '/decks/1/export-pdf', { como: 'juan' })).status).toBe(403);
    expect((await api('GET', `/quizzes/${quizId}/export-pdf`, { como: 'juan' })).status).toBe(403);
  });

  it('CA-3.3.x Exportar un quiz inexistente responde 404', async () => {
    expect((await api('GET', '/quizzes/999999/export-pdf', { como: 'ana' })).status).toBe(404);
  });

  // Maquetación, márgenes y hoja de respuestas separada: se revisan abriendo el PDF.
  it.todo('CA-3.3.2/CA-3.3.3 Hoja de respuestas separada y formato de impresión — VERIFICACIÓN MANUAL del PDF');
});

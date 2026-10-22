// HE-02 — Supervisión y Curaduría Pedagógica Docente (HU-2.1, HU-2.2, HU-2.3)

import { describe, it, expect, beforeAll } from 'vitest';
import { api, crearMazo, registrarPalabra, MAZO_ABIERTO_SEED } from './soporte/cliente.js';

describe('HU-2.1 — Revisar y aprobar tarjetas', () => {
  let tarjeta;
  beforeAll(async () => {
    const mazo = await crearMazo();
    const { body } = await registrarPalabra('juan', mazo.id_mazo, {
      palabra: 'whisper',
      traduccion: 'susurro',
      definicion: 'To speak very softy.', // error de ortografía a corregir
    });
    tarjeta = body.tarjeta;
  });

  it('CA-2.1.1 Filtrado: la docente ve solo tarjetas "pendiente_revision"', async () => {
    const { status, body } = await api('GET', '/cards/pending', { como: 'ana' });
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((t) => t.estado === 'pendiente_revision')).toBe(true);
    expect(body.map((t) => t.id_tarjeta)).toContain(tarjeta.id_tarjeta);
  });

  it('CA-2.1.2 Edición: la docente corrige la definición de una tarjeta pendiente', async () => {
    const { status, body } = await api('PUT', `/cards/${tarjeta.id_tarjeta}`, {
      como: 'ana',
      body: { definicion: 'To speak very softly.' },
    });
    expect(status).toBe(200);
    expect(body.tarjeta.definicion).toBe('To speak very softly.');
  });

  it('CA-2.1.2 Aprobación: pasa a "revisado_docente" y queda habilitada para quices', async () => {
    const { status, body } = await api('PATCH', `/cards/${tarjeta.id_tarjeta}/approve`, { como: 'ana' });
    expect(status).toBe(200);
    expect(body.tarjeta.estado).toBe('revisado_docente');
    expect(body.tarjeta.fecha_revision).toBeTruthy();

    const pendientes = await api('GET', '/cards/pending', { como: 'ana' });
    expect(pendientes.body.map((t) => t.id_tarjeta)).not.toContain(tarjeta.id_tarjeta);

    const aprobadas = await api('GET', '/cards/approved', { como: 'ana' });
    expect(aprobadas.body.map((t) => t.id_tarjeta)).toContain(tarjeta.id_tarjeta);
  });

  it('CA-2.1.2 Una tarjeta ya aprobada no se vuelve a aprobar (409)', async () => {
    const { status, body } = await api('PATCH', `/cards/${tarjeta.id_tarjeta}/approve`, { como: 'ana' });
    expect(status).toBe(409);
    expect(body.code).toBe('CARD_NOT_PENDING');
  });

  it('CA-2.1.x Un estudiante no puede ver el panel de curaduría (403)', async () => {
    const { status } = await api('GET', '/cards/pending', { como: 'juan' });
    expect(status).toBe(403);
  });

  // El código actual no tiene rechazo en revisión individual (ver CLAUDE.md, sección HE-02).
  it.todo('CA-2.1.3 Rechazo con observación y notificación al estudiante — NO IMPLEMENTADO en el backend');
});

describe('HU-2.2 — Asignar etiquetas de contexto cultural', () => {
  let mazo;
  let tarjetas;
  beforeAll(async () => {
    mazo = await crearMazo();
    const a = await registrarPalabra('juan', mazo.id_mazo, { palabra: 'mate', traduccion: 'amigo' });
    const b = await registrarPalabra('maria', mazo.id_mazo, { palabra: 'yard', traduccion: 'patio' });
    tarjetas = [a.body.tarjeta, b.body.tarjeta];
  });

  it('CA-2.2.1 Registro y variante: se guardan y son visibles en la tarjeta', async () => {
    const { status } = await api('PUT', `/cards/${tarjetas[0].id_tarjeta}/context`, {
      como: 'ana',
      body: { registro: 'informal', variante_regional: 'jamaicano' },
    });
    expect(status).toBe(200);

    const detalle = await api('GET', `/cards/${tarjetas[0].id_tarjeta}`);
    const etiquetas = Object.fromEntries(detalle.body.etiquetas_contexto.map((e) => [e.tipo, e.valor]));
    expect(etiquetas).toMatchObject({ registro: 'informal', variante_regional: 'jamaicano' });
  });

  it('CA-2.2.1 Volver a etiquetar reemplaza el valor anterior (no lo duplica)', async () => {
    await api('PUT', `/cards/${tarjetas[0].id_tarjeta}/context`, { como: 'ana', body: { registro: 'slang' } });
    const detalle = await api('GET', `/cards/${tarjetas[0].id_tarjeta}`);
    const registros = detalle.body.etiquetas_contexto.filter((e) => e.tipo === 'registro');
    expect(registros).toHaveLength(1);
    expect(registros[0].valor).toBe('slang');
  });

  it('CA-2.2.1 Un registro fuera de la lista permitida se rechaza (400)', async () => {
    const { status } = await api('PUT', `/cards/${tarjetas[0].id_tarjeta}/context`, {
      como: 'ana',
      body: { registro: 'poético' },
    });
    expect(status).toBe(400);
  });

  it('CA-2.2.2 Asignación masiva: todas las tarjetas del mazo heredan la variante del mazo', async () => {
    const { status, body } = await api('PATCH', `/decks/${mazo.id_mazo}/default-variant`, {
      como: 'ana',
      body: { variante_regional: 'nigeriano' },
    });
    expect(status).toBe(200);
    expect(body.tarjetas_actualizadas).toBe(tarjetas.length);

    for (const t of tarjetas) {
      const detalle = await api('GET', `/cards/${t.id_tarjeta}`);
      const variante = detalle.body.etiquetas_contexto.find((e) => e.tipo === 'variante_regional');
      expect(variante.valor).toBe('nigeriano');
    }
  });

  it('CA-2.2.3 Visualización: el detalle de la tarjeta trae registro y variante (sin sesión)', async () => {
    const { status, body } = await api('GET', `/cards/${tarjetas[0].id_tarjeta}`);
    expect(status).toBe(200);
    const tipos = body.etiquetas_contexto.map((e) => e.tipo);
    expect(tipos).toEqual(expect.arrayContaining(['registro', 'variante_regional']));
  });
});

describe('HU-2.3 — Visualizar resumen de participación', () => {
  const fila = (resumen, id) => resumen.find((f) => f.estudiante_id === id);

  it('CA-2.3.1 Métricas por mazo: estudiantes con palabras, coautorías y estado de revisión', async () => {
    const { status, body } = await api('GET', `/teacher/analytics/deck/${MAZO_ABIERTO_SEED}`, { como: 'ana' });
    expect(status).toBe(200);
    expect(body.map((f) => f.estudiante_id)).toEqual(expect.arrayContaining([2, 3, 4]));
    for (const f of body) {
      expect(f).toEqual(
        expect.objectContaining({
          nombre_completo: expect.any(String),
          palabras_aportadas: expect.any(Number),
          coautorias: expect.any(Number),
          tarjetas_pendientes: expect.any(Number),
          tarjetas_aprobadas: expect.any(Number),
        })
      );
    }
    // seed: Juan creó 2 tarjetas aprobadas en "Fear of Stones" y tiene 1 coautoría
    expect(fila(body, 2)).toMatchObject({ tarjetas_aprobadas: 2, coautorias: 1 });
  });

  it('CA-2.3.2 Filtro "Sin aportes": resalta a los estudiantes sin aportes en el mazo', async () => {
    const mazo = await crearMazo();
    await registrarPalabra('juan', mazo.id_mazo);

    const { status, body } = await api('GET', `/teacher/analytics/deck/${mazo.id_mazo}?sinAportes=true`, { como: 'ana' });
    expect(status).toBe(200);
    const ids = body.map((f) => f.estudiante_id);
    expect(ids).not.toContain(2);
    expect(ids).toEqual(expect.arrayContaining([3, 4]));
  });

  it('CA-2.3.3 Actualización de conteos: un nuevo aporte se refleja en la siguiente consulta', async () => {
    const mazo = await crearMazo();
    const antes = await api('GET', `/teacher/analytics/deck/${mazo.id_mazo}`, { como: 'ana' });
    await registrarPalabra('maria', mazo.id_mazo);
    const despues = await api('GET', `/teacher/analytics/deck/${mazo.id_mazo}`, { como: 'ana' });

    expect(fila(despues.body, 3).palabras_aportadas).toBe(fila(antes.body, 3).palabras_aportadas + 1);
  });

  it('CA-2.3.x Un estudiante no puede ver la analítica docente (403)', async () => {
    const { status } = await api('GET', `/teacher/analytics/deck/${MAZO_ABIERTO_SEED}`, { como: 'juan' });
    expect(status).toBe(403);
  });
});

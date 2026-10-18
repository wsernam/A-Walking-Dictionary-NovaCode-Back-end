// HE-01 — Gestión Curricular de Mazos y Vocabulario (HU-1.1, HU-1.2, HU-1.3)

import { describe, it, expect, beforeAll } from 'vitest';
import { api, crearMazo, registrarPalabra, MAZO_CERRADO_SEED, CURSO_ID } from './soporte/cliente.js';

describe('HU-1.1 — Crear mazos precargados por semana', () => {
  it('CA-1.1.1 Creación exitosa: la docente crea el mazo y queda en estado "abierto"', async () => {
    const { status, body } = await api('POST', '/decks', {
      como: 'ana',
      body: {
        curso_id: CURSO_ID,
        nombre_lectura: 'Things Fall Apart',
        semana: 16,
        autor: 'Chinua Achebe',
        variante_regional_predeterminada: 'nigeriano',
        fecha_apertura: '2026-11-20',
        fecha_cierre: '2026-11-27',
        estado: 'cerrado', // el backend debe ignorarlo
      },
    });

    expect(status).toBe(201);
    expect(body).toMatchObject({ nombre_lectura: 'Things Fall Apart', semana: 16, autor: 'Chinua Achebe', estado: 'abierto' });

    const lista = await api('GET', '/decks', { como: 'ana' });
    expect(lista.body.map((m) => m.id_mazo)).toContain(body.id_mazo);
  });

  it('CA-1.1.2 Validación: sin nombre de la lectura no se crea el mazo (400)', async () => {
    const { status, body } = await api('POST', '/decks', {
      como: 'ana',
      body: { curso_id: CURSO_ID, semana: 3, autor: 'X', fecha_apertura: '2026-11-01', fecha_cierre: '2026-11-08' },
    });
    expect(status).toBe(400);
    expect(body.error).toContain('nombre_lectura');
  });

  it('CA-1.1.2 Validación: sin semana no se crea el mazo (400)', async () => {
    const { status, body } = await api('POST', '/decks', {
      como: 'ana',
      body: { curso_id: CURSO_ID, nombre_lectura: 'Sin semana', autor: 'X', fecha_apertura: '2026-11-01', fecha_cierre: '2026-11-08' },
    });
    expect(status).toBe(400);
    expect(body.error).toContain('semana');
  });

  it('CA-1.1.3 Control de estado: al cerrar el mazo ya no recibe aportes', async () => {
    const mazo = await crearMazo();
    expect((await registrarPalabra('juan', mazo.id_mazo)).status).toBe(201);

    const cierre = await api('PATCH', `/decks/${mazo.id_mazo}/estado`, { como: 'ana', body: { estado: 'cerrado' } });
    expect(cierre.status).toBe(200);
    expect(cierre.body.estado).toBe('cerrado');

    const aporte = await registrarPalabra('juan', mazo.id_mazo);
    expect(aporte.status).toBe(409);
  });

  it('CA-1.1.3 Solo la docente dueña del mazo puede cerrarlo (403 para otra docente)', async () => {
    const mazo = await crearMazo();
    const { status } = await api('PATCH', `/decks/${mazo.id_mazo}/estado`, { como: 'william', body: { estado: 'cerrado' } });
    expect(status).toBe(403);
  });
});

describe('HU-1.2 — Registrar palabra en mazo compartido', () => {
  let mazo;
  beforeAll(async () => {
    mazo = await crearMazo();
  });

  it('CA-1.2.1 Registro exitoso: crea la tarjeta "pendiente_revision" y el aporte del estudiante', async () => {
    const { status, body } = await registrarPalabra('juan', mazo.id_mazo, {
      palabra: 'harvest',
      traduccion: 'cosecha',
      definicion: 'The time when crops are gathered.',
      ejemplo: 'The harvest was good this year.',
    });

    expect(status).toBe(201);
    expect(body.resultado).toBe('creada');
    expect(body.tarjeta).toMatchObject({ palabra: 'harvest', estado: 'pendiente_revision', mazo_id: mazo.id_mazo });
    expect(body.aporte).toMatchObject({ tipo_aporte: 'creada', inscripcion_id: 1 }); // inscripción de Juan
  });

  it('CA-1.2.1 El ejemplo es opcional', async () => {
    const { status } = await registrarPalabra('juan', mazo.id_mazo, { ejemplo: undefined });
    expect(status).toBe(201);
  });

  it('CA-1.2.1 Un estudiante no inscrito en el curso no puede aportar (403)', async () => {
    const { status } = await registrarPalabra('thalia', mazo.id_mazo);
    expect(status).toBe(403);
  });

  it.each(['palabra', 'traduccion', 'definicion'])('CA-1.2.2 Campo obligatorio: sin "%s" se rechaza e indica el campo (400)', async (campo) => {
    const { status, body } = await registrarPalabra('juan', mazo.id_mazo, { [campo]: '' });
    expect(status).toBe(400);
    expect(body.error).toContain(campo);
  });

  it('CA-1.2.2 El ejemplo no puede superar 150 caracteres (400)', async () => {
    const { status } = await registrarPalabra('juan', mazo.id_mazo, { ejemplo: 'a'.repeat(151) });
    expect(status).toBe(400);
  });

  it('CA-1.2.3 Mazo cerrado: se rechaza el aporte y se notifica (409)', async () => {
    const { status, body } = await registrarPalabra('juan', MAZO_CERRADO_SEED);
    expect(status).toBe(409);
    expect(body.error).toMatch(/no acepta/i);
  });
});

describe('HU-1.3 — Detectar aportes duplicados', () => {
  const original = {
    palabra: 'lighthouse',
    traduccion: 'faro',
    definicion: 'A tower with a bright light that guides ships.',
    ejemplo: 'The lighthouse guided the boats.',
  };
  let mazo;
  let tarjetaOriginal;

  beforeAll(async () => {
    mazo = await crearMazo();
    const { body } = await registrarPalabra('juan', mazo.id_mazo, original);
    tarjetaOriginal = body.tarjeta;
  });

  it('CA-1.3.4 Notificación: antes de confirmar, avisa que será coautoría', async () => {
    const { status, body } = await api('POST', '/cards/check-duplicate', {
      como: 'maria',
      body: { mazo_id: mazo.id_mazo, ...original },
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ duplicado: true, resultado: 'coautoria' });
  });

  it('CA-1.3.4 Notificación: antes de confirmar, avisa que será acepción nueva', async () => {
    const { body } = await api('POST', '/cards/check-duplicate', {
      como: 'maria',
      body: { mazo_id: mazo.id_mazo, palabra: 'lighthouse', definicion: 'Otra definición distinta.' },
    });
    expect(body).toMatchObject({ duplicado: true, resultado: 'acepcion_nueva' });
  });

  it('CA-1.3.1 Duplicado exacto: no crea tarjeta nueva, suma al estudiante como coautor', async () => {
    const { status, body } = await registrarPalabra('maria', mazo.id_mazo, original);
    expect(status).toBe(201);
    expect(body.resultado).toBe('coautoria');
    expect(body.tarjeta.id_tarjeta).toBe(tarjetaOriginal.id_tarjeta);
    expect(body.aporte).toMatchObject({ tipo_aporte: 'coautoria', inscripcion_id: 2 });
  });

  it('CA-1.3.2 Duplicado parcial: se guarda como acepción adicional sin sobrescribir la existente', async () => {
    const { status, body } = await registrarPalabra('carlos', mazo.id_mazo, {
      ...original,
      definicion: 'A person or thing that guides others.',
    });
    expect(status).toBe(201);
    expect(body.resultado).toBe('acepcion_nueva');
    expect(body.tarjeta.id_tarjeta).toBe(tarjetaOriginal.id_tarjeta);

    const detalle = await api('GET', `/cards/${tarjetaOriginal.id_tarjeta}`);
    expect(detalle.body.definicion).toBe(original.definicion);
  });

  it('CA-1.3.3 Insensible a mayúsculas: "LightHouse" se detecta como la misma palabra', async () => {
    const { body } = await api('POST', '/cards/check-duplicate', {
      como: 'maria',
      body: { mazo_id: mazo.id_mazo, ...original, palabra: 'LightHouse' },
    });
    expect(body.duplicado).toBe(true);

    const registro = await registrarPalabra('carlos', mazo.id_mazo, { ...original, palabra: '  LIGHTHOUSE ' });
    expect(registro.status).toBe(201);
    expect(registro.body.tarjeta.id_tarjeta).toBe(tarjetaOriginal.id_tarjeta);
  });

  it('CA-1.3.4 Sin coincidencia: el aviso indica que se creará una tarjeta nueva', async () => {
    const { body } = await api('POST', '/cards/check-duplicate', {
      como: 'maria',
      body: { mazo_id: mazo.id_mazo, palabra: 'seagull', definicion: 'A bird.' },
    });
    expect(body).toMatchObject({ duplicado: false, resultado: 'creada' });
  });
});

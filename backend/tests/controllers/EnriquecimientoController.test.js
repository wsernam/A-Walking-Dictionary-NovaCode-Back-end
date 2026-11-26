
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/services/WordnetService.js', () => ({
  WordnetService: {
    obtenerFamilia: vi.fn(),
  },
}));

import { EnriquecimientoController } from '../../src/controllers/EnriquecimientoController.js';
import { WordnetService } from '../../src/services/WordnetService.js';

describe('EnriquecimientoController.obtenerFamilia', () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      params: {
        word: 'cooking',
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('responde 400 cuando la palabra no está definida', async () => {
    req.params.word = undefined;

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'La palabra es obligatoria',
      code: 'REQUIRED_FIELDS_MISSING',
    });
    expect(WordnetService.obtenerFamilia).not.toHaveBeenCalled();
  });

  it('responde 400 cuando la palabra no es una cadena', async () => {
    req.params.word = 123;

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'La palabra es obligatoria',
      code: 'REQUIRED_FIELDS_MISSING',
    });
    expect(WordnetService.obtenerFamilia).not.toHaveBeenCalled();
  });

  it('responde 400 cuando la palabra está vacía', async () => {
    req.params.word = '';

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'La palabra es obligatoria',
      code: 'REQUIRED_FIELDS_MISSING',
    });
    expect(WordnetService.obtenerFamilia).not.toHaveBeenCalled();
  });

  it('responde 400 cuando la palabra contiene solo espacios', async () => {
    req.params.word = '   ';

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'La palabra es obligatoria',
      code: 'REQUIRED_FIELDS_MISSING',
    });
    expect(WordnetService.obtenerFamilia).not.toHaveBeenCalled();
  });

  it('responde 400 cuando la palabra supera los 150 caracteres', async () => {
    req.params.word = 'a'.repeat(151);

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'La palabra no puede superar 150 caracteres',
      code: 'FIELD_TOO_LONG',
    });
    expect(WordnetService.obtenerFamilia).not.toHaveBeenCalled();
  });

  it('acepta una palabra de exactamente 150 caracteres', async () => {
    const palabra = 'a'.repeat(150);
    req.params.word = palabra;

    WordnetService.obtenerFamilia.mockResolvedValue({
      palabra,
      familia: [],
    });

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(WordnetService.obtenerFamilia).toHaveBeenCalledWith(palabra);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      palabra,
      familia: [],
    });
  });

  it('consulta el servicio y responde 200 cuando la palabra es válida', async () => {
    const resultado = {
      palabra: 'cooking',
      familia: ['cook', 'cooked', 'cooker'],
    };

    WordnetService.obtenerFamilia.mockResolvedValue(resultado);

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(WordnetService.obtenerFamilia).toHaveBeenCalledWith('cooking');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(resultado);
  });

  it('elimina los espacios al inicio y al final antes de consultar el servicio', async () => {
    req.params.word = '  cooking  ';

    WordnetService.obtenerFamilia.mockResolvedValue({
      palabra: 'cooking',
      familia: [],
    });

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(WordnetService.obtenerFamilia).toHaveBeenCalledWith('cooking');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('responde con el estado y código del error generado por el servicio', async () => {
    const error = new Error('Error de conexión con WordNet');
    error.status = 503;
    error.code = 'WORDNET_UNAVAILABLE';

    WordnetService.obtenerFamilia.mockRejectedValue(error);

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error de conexión con WordNet',
      code: 'WORDNET_UNAVAILABLE',
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('responde 500 cuando el error no contiene un estado HTTP', async () => {
    WordnetService.obtenerFamilia.mockRejectedValue(
      new Error('Error inesperado')
    );

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error inesperado',
      code: undefined,
    });
  });

  it('utiliza mensajes y estados predeterminados cuando el error no los proporciona', async () => {
    WordnetService.obtenerFamilia.mockRejectedValue({
      status: 0,
      message: '',
      code: undefined,
    });

    await EnriquecimientoController.obtenerFamilia(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error al obtener sugerencias léxicas',
      code: undefined,
    });
  });
});

// Pruebas unitarias de la validación del parámetro q en src/controllers/DiccionarioController.js.
// Solo cubre lo que agregó el arreglo del fuzzing con Schemathesis (run #29); el resto del
// diccionario (HU-1.4) no está en el backlog y no se prueba aquí. DiccionarioService se simula.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiccionarioController } from '../../src/controllers/DiccionarioController.js';
import { DiccionarioService } from '../../src/services/DiccionarioService.js';
import { llamar } from '../helpers/http.js';

vi.mock('../../src/services/DiccionarioService.js', () => ({
  DiccionarioService: { listarVocabulario: vi.fn(), obtenerDetalle: vi.fn() },
}));

beforeEach(() => {
  DiccionarioService.listarVocabulario.mockResolvedValue([]);
});

describe('DiccionarioController.listar — validación de q', () => {
  // Fuzzing Schemathesis run #29: GET /dictionary?q=%00 respondía 500 (byte nulo en PostgreSQL).
  it.each(['\u0000', 'ho\u0000use', 'linea\nnueva'])('rechaza con 400 INVALID_QUERY q = %j sin consultar', async (q) => {
    const { status, body } = await llamar(DiccionarioController, 'listar', { query: { q } });
    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_QUERY');
    expect(DiccionarioService.listarVocabulario).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'house', 'café 👍'])('acepta q = %j', async (q) => {
    const query = q === undefined ? {} : { q };
    expect((await llamar(DiccionarioController, 'listar', { query })).status).toBe(200);
  });
});

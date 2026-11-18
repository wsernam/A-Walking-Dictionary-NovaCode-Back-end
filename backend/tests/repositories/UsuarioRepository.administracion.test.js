// Pruebas unitarias de UsuarioRepository.enTransaccionAdministracion (HU-023, CA-23.4).
// El pool se simula: se verifica el orden BEGIN → candado → operación → COMMIT/ROLLBACK.
// La carrera real entre dos administradores se prueba con PostgreSQL en tests-integracion/.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { cliente, pool } = vi.hoisted(() => {
  const cliente = { query: vi.fn(), release: vi.fn() };
  return { cliente, pool: { connect: vi.fn(), query: vi.fn() } };
});

vi.mock('../../src/config/db.js', () => ({ pool }));

import { UsuarioRepository } from '../../src/repositories/UsuarioRepository.js';

const sentencias = () => cliente.query.mock.calls.map(([sql]) => sql);

beforeEach(() => {
  vi.clearAllMocks();
  pool.connect.mockResolvedValue(cliente);
  cliente.query.mockResolvedValue({ rows: [] });
});

describe('UsuarioRepository.enTransaccionAdministracion — CA-23.4', () => {
  it('toma el candado antes de la operación y confirma al terminar', async () => {
    const operacion = vi.fn().mockResolvedValue('ok');

    await expect(UsuarioRepository.enTransaccionAdministracion(operacion)).resolves.toBe('ok');

    expect(sentencias()).toEqual(['BEGIN', 'SELECT pg_advisory_xact_lock($1)', 'COMMIT']);
    expect(operacion).toHaveBeenCalledWith(cliente);
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });

  it('usa una llave distinta a la del registro con rol inicial', async () => {
    await UsuarioRepository.enTransaccionAdministracion(async () => {});
    await UsuarioRepository.crearDesdeGoogleConRolInicial({ nombre_completo: 'A', email: 'a@x.co' }).catch(() => {});

    const llaves = cliente.query.mock.calls
      .filter(([sql]) => sql.includes('pg_advisory_xact_lock'))
      .map(([, params]) => params[0]);
    expect(llaves).toHaveLength(2);
    expect(new Set(llaves).size).toBe(2);
  });

  it('deshace la transacción, relanza el error y libera la conexión si la operación falla', async () => {
    const error = new Error('falla');

    await expect(
      UsuarioRepository.enTransaccionAdministracion(async () => { throw error; })
    ).rejects.toBe(error);

    expect(sentencias()).toEqual(['BEGIN', 'SELECT pg_advisory_xact_lock($1)', 'ROLLBACK']);
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });
});

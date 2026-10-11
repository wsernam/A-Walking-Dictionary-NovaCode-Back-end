// Pruebas unitarias de src/services/PerfilService.js (HU-5.2, CA-5.2.1 y CA-5.2.2).
// UsuarioRepository e InscripcionRepository se simulan: no hay base de datos.
// [SUPUESTO PENDIENTE P13]: codigo_estudiantil, avatar e intereses no están en el DER (D-03).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerfilService } from '../../src/services/PerfilService.js';
import { UsuarioRepository } from '../../src/repositories/UsuarioRepository.js';
import { InscripcionRepository } from '../../src/repositories/InscripcionRepository.js';

vi.mock('../../src/repositories/UsuarioRepository.js', () => ({
  UsuarioRepository: { obtenerPorId: vi.fn(), actualizarPerfil: vi.fn() },
}));
vi.mock('../../src/repositories/InscripcionRepository.js', () => ({
  InscripcionRepository: { obtenerContextoAcademico: vi.fn() },
}));

const usuarioGuardado = {
  id_usuario: 2,
  nombre_completo: 'Juan Estudiante',
  email: 'juan@unicauca.edu.co',
  password_hash: 'no-debe-salir',
  rol: 'estudiante',
  nivel_ingles: 'B1',
  codigo_estudiantil: '104620011',
  avatar: '/avatars/zorro.png',
  intereses: ['Poesía'],
  activo: true,
};

beforeEach(() => {
  UsuarioRepository.obtenerPorId.mockResolvedValue(usuarioGuardado);
  UsuarioRepository.actualizarPerfil.mockImplementation(async (id, datos) => ({ ...usuarioGuardado, ...datos }));
});

describe('PerfilService.obtenerPerfil — CA-5.2.1', () => {
  it('CA-5.2.1: devuelve el perfil con la forma acordada con el frontend y sin password_hash', async () => {
    await expect(PerfilService.obtenerPerfil(2)).resolves.toEqual({
      estudiante_id: 2,
      nombre_completo: 'Juan Estudiante',
      correo: 'juan@unicauca.edu.co',
      rol: 'Estudiante',
      nivel_ingles: 'B1',
      codigo_estudiantil: '104620011',
      avatar: '/avatars/zorro.png',
      intereses: ['Poesía'],
    });
  });

  it('CA-5.2.1: los campos vacíos salen como "" (e intereses como []) en vez de null', async () => {
    UsuarioRepository.obtenerPorId.mockResolvedValue({
      ...usuarioGuardado,
      nivel_ingles: null,
      codigo_estudiantil: null,
      avatar: null,
      intereses: null,
    });

    await expect(PerfilService.obtenerPerfil(2)).resolves.toMatchObject({
      nivel_ingles: '',
      codigo_estudiantil: '',
      avatar: '',
      intereses: [],
    });
  });

  it('responde 404 si el usuario no existe', async () => {
    UsuarioRepository.obtenerPorId.mockResolvedValue(null);
    await expect(PerfilService.obtenerPerfil(99)).rejects.toMatchObject({ status: 404 });
  });
});

describe('PerfilService.actualizarPerfil — CA-5.2.1 (perfil académico y avatar)', () => {
  it.each(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])('CA-5.2.1: acepta el nivel MCER %s', async (nivel) => {
    await expect(PerfilService.actualizarPerfil(2, { nivel_ingles: nivel })).resolves.toMatchObject({
      nivel_ingles: nivel,
    });
  });

  it.each(['C3', 'Intermedio', 'B'])('CA-5.2.1: rechaza con 400 el nivel %s', async (nivel) => {
    await expect(PerfilService.actualizarPerfil(2, { nivel_ingles: nivel })).rejects.toMatchObject({ status: 400 });
    expect(UsuarioRepository.actualizarPerfil).not.toHaveBeenCalled();
  });

  it('CA-5.2.1 [POSIBLE ERROR]: acepta el nivel en minúscula ("b2") pero lo guarda tal cual, sin pasarlo a "B2"', async () => {
    await PerfilService.actualizarPerfil(2, { nivel_ingles: 'b2' });
    expect(UsuarioRepository.actualizarPerfil.mock.calls[0][1].nivel_ingles).toBe('b2');
  });

  it('CA-5.2.1: rechaza con 400 un código estudiantil de más de 20 caracteres', async () => {
    await expect(
      PerfilService.actualizarPerfil(2, { codigo_estudiantil: '1'.repeat(21) })
    ).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    ['una imagen en base64', 'data:image/png;base64,iVBORw0KGgo='],
    ['una ruta de más de 500 caracteres', `/avatars/${'a'.repeat(500)}.png`],
  ])('CA-5.2.1: rechaza con 400 un avatar que es %s', async (_caso, avatar) => {
    await expect(PerfilService.actualizarPerfil(2, { avatar })).rejects.toMatchObject({ status: 400 });
  });

  it('CA-5.2.1: acepta un avatar que es la ruta de una imagen', async () => {
    await expect(PerfilService.actualizarPerfil(2, { avatar: '/avatars/buho.png' })).resolves.toMatchObject({
      avatar: '/avatars/buho.png',
    });
  });

  it('CA-5.2.1: actualización parcial, los campos que no se envían conservan su valor', async () => {
    await PerfilService.actualizarPerfil(2, { nivel_ingles: 'C1' });

    expect(UsuarioRepository.actualizarPerfil).toHaveBeenCalledWith(2, {
      nivel_ingles: 'C1',
      codigo_estudiantil: '104620011',
      avatar: '/avatars/zorro.png',
      intereses: ['Poesía'],
    });
  });

  it('responde 404 si el usuario no existe, sin intentar actualizar', async () => {
    UsuarioRepository.obtenerPorId.mockResolvedValue(null);

    await expect(PerfilService.actualizarPerfil(99, { nivel_ingles: 'B2' })).rejects.toMatchObject({ status: 404 });
    expect(UsuarioRepository.actualizarPerfil).not.toHaveBeenCalled();
  });
});

describe('PerfilService.actualizarPerfil — CA-5.2.2 (preferencias de aprendizaje)', () => {
  it('CA-5.2.2: guarda las áreas a reforzar enviadas como arreglo de textos', async () => {
    const perfil = await PerfilService.actualizarPerfil(2, { intereses: ['Poesía', 'Teatro'] });
    expect(perfil.intereses).toEqual(['Poesía', 'Teatro']);
  });

  it.each([
    ['un texto suelto', 'Poesía'],
    ['un arreglo con un número', ['Poesía', 3]],
    ['un arreglo con un texto vacío', ['Poesía', '  ']],
  ])('CA-5.2.2: rechaza con 400 intereses que son %s', async (_caso, intereses) => {
    await expect(PerfilService.actualizarPerfil(2, { intereses })).rejects.toMatchObject({ status: 400 });
    expect(UsuarioRepository.actualizarPerfil).not.toHaveBeenCalled();
  });
});

describe('PerfilService.obtenerContextoAcademico — HU-5.2', () => {
  it('devuelve el curso y semestre de la inscripción del estudiante', async () => {
    InscripcionRepository.obtenerContextoAcademico.mockResolvedValue({
      id_inscripcion: 5,
      curso_asignado: 'Literatura Anglófona',
      semestre_activo: '2026-2',
    });

    await expect(PerfilService.obtenerContextoAcademico(2)).resolves.toEqual({
      id_inscripcion: 5,
      curso_asignado: 'Literatura Anglófona',
      semestre_activo: '2026-2',
      departamento_universidad: null,
    });
  });

  it('sin inscripción responde con valores null en vez de 404', async () => {
    InscripcionRepository.obtenerContextoAcademico.mockResolvedValue(null);

    await expect(PerfilService.obtenerContextoAcademico(2)).resolves.toEqual({
      id_inscripcion: null,
      curso_asignado: null,
      semestre_activo: null,
      departamento_universidad: null,
    });
  });
});

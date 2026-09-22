import { CursoRepository } from '../repositories/CursoRepository.js';
import { UsuarioRepository } from '../repositories/UsuarioRepository.js';
import { InscripcionRepository } from '../repositories/InscripcionRepository.js';

function generarCodigo() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';

  for (let i = 0; i < 8; i++) {
    const posicion = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres[posicion];
  }

  return codigo;
}

export const InscripcionService = {

  /**
   * Genera un código de acceso único para un curso.
   */
  async generarCodigoAcceso(id_curso) {
    const curso = await CursoRepository.obtenerPorId(id_curso);

    if (!curso) {
      const error = new Error('Curso no encontrado');
      error.status = 404;
      throw error;
    }

    let codigo;
    let codigoExiste;

    do {
      codigo = generarCodigo();
      codigoExiste = await CursoRepository.obtenerPorCodigoAcceso(codigo);
    } while (codigoExiste);

    const cursoActualizado = await CursoRepository.guardarCodigoAcceso(
      id_curso,
      codigo
    );

    return {
      id_curso: cursoActualizado.id_curso,
      codigo_acceso: cursoActualizado.codigo_acceso,
    };
  },

  /**
   * Inscribe un estudiante mediante código de acceso.
   */
  async inscribirsePorCodigo(estudiante_id, codigo_acceso) {

    const estudiante = await UsuarioRepository.obtenerPorId(estudiante_id);

    if (!estudiante) {
      const error = new Error('Estudiante no encontrado');
      error.status = 404;
      throw error;
    }

    if (estudiante.rol.toLowerCase() !== 'estudiante') {
      const error = new Error('El usuario no tiene rol de estudiante');
      error.status = 400;
      throw error;
    }

    const curso = await CursoRepository.obtenerPorCodigoAcceso(
      codigo_acceso
    );

    if (!curso) {
      const error = new Error('Código de acceso inválido');
      error.status = 404;
      throw error;
    }

    const inscripcionExistente =
      await InscripcionRepository.obtenerPorCursoYEstudiante(
        curso.id_curso,
        estudiante_id
      );

    if (inscripcionExistente) {
      const error = new Error('El estudiante ya está inscrito en este curso');
      error.status = 409;
      throw error;
    }

    return InscripcionRepository.crear({
      curso_id: curso.id_curso,
      estudiante_id,
      fecha_inscripcion: new Date(),
      estado: 'activa',
    });
  },

  /**
   * Asigna directamente un estudiante a un curso mediante su correo.
   */
  async asignarPorCorreo(id_curso, email) {

    const curso = await CursoRepository.obtenerPorId(id_curso);

    if (!curso) {
      const error = new Error('Curso no encontrado');
      error.status = 404;
      throw error;
    }

    const estudiante = await UsuarioRepository.obtenerPorEmail(email);

    if (!estudiante) {
      const error = new Error('Estudiante no encontrado');
      error.status = 404;
      throw error;
    }

    if (estudiante.rol.toLowerCase() !== 'estudiante') {
      const error = new Error('El usuario no tiene rol de estudiante');
      error.status = 400;
      throw error;
    }

    const inscripcionExistente =
      await InscripcionRepository.obtenerPorCursoYEstudiante(
        id_curso,
        estudiante.id_usuario
      );

    if (inscripcionExistente) {
      const error = new Error('El estudiante ya está inscrito en este curso');
      error.status = 409;
      throw error;
    }

    return InscripcionRepository.crear({
      curso_id: id_curso,
      estudiante_id: estudiante.id_usuario,
      fecha_inscripcion: new Date(),
      estado: 'activa',
    });
  },
};
// Controlador REST de Usuario: recibe la petición HTTP, llama directamente al repositorio
// (UsuarioRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { UsuarioRepository } from '../repositories/UsuarioRepository.js';
import { PerfilService } from '../services/PerfilService.js';

export const UsuarioController = {
  async crear(req, res) {
    try {
      const { nombre_completo, email, rol, nivel_ingles } = req.body;

      // nombre_completo, email y rol son varchar NOT NULL en el DER.
      // password_hash se excluye: se calcula a partir de una contraseña en texto plano,
      // no se recibe tal cual (queda para cuando se implemente AuthService).
      const camposFaltantes = [];
      if (!nombre_completo) camposFaltantes.push('nombre_completo');
      if (!email) camposFaltantes.push('email');
      if (!rol) camposFaltantes.push('rol');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      // Longitud máxima según el DER: nombre_completo varchar(150), email varchar(150),
      // rol varchar(30), nivel_ingles varchar(10) (nullable).
      const erroresLongitud = [];
      if (nombre_completo.length > 150) {
        erroresLongitud.push(
          `El campo nombre_completo no puede superar 150 caracteres (tiene ${nombre_completo.length} caracteres).`
        );
      }
      if (email.length > 150) {
        erroresLongitud.push(
          `El campo email no puede superar 150 caracteres (tiene ${email.length} caracteres).`
        );
      }
      if (rol.length > 30) {
        erroresLongitud.push(
          `El campo rol no puede superar 30 caracteres (tiene ${rol.length} caracteres).`
        );
      }
      if (nivel_ingles && nivel_ingles.length > 10) {
        erroresLongitud.push(
          `El campo nivel_ingles no puede superar 10 caracteres (tiene ${nivel_ingles.length} caracteres).`
        );
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' ') });
      }

      const usuario = await UsuarioRepository.crear(req.body);
      res.status(201).json(usuario);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const usuario = await UsuarioRepository.obtenerPorId(id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(200).json(usuario);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // HU-5.2: GET /api/v1/users/:id — shape acordado con el frontend (estudiante_id, correo, sin
  // password_hash), distinto del obtenerPorId() genérico de arriba. Ver PerfilService.js.
  async obtenerPerfil(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const perfil = await PerfilService.obtenerPerfil(id);
      res.status(200).json(perfil);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message });
    }
  },

  // CA-5.2.1 + CA-5.2.2: PATCH /api/v1/users/profile
  // estudiante_id viaja en el body (no en la URL) porque esta rama todavía no tiene auth real
  // -- mismo patrón que ya usan mazos/tarjetas/inscripción (ver contrato acordado con frontend).
  async actualizarPerfil(req, res) {
    try {
      const { estudiante_id, nivel_ingles, codigo_estudiantil, avatar, intereses } = req.body;
      const id = Number(estudiante_id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'estudiante_id es obligatorio y debe ser numérico' });
      }
      const perfil = await PerfilService.actualizarPerfil(id, {
        nivel_ingles,
        codigo_estudiantil,
        avatar,
        intereses,
      });
      res.status(200).json(perfil);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message });
    }
  },

  // HU-5.2: GET /api/v1/students/:id/context — contexto académico de solo lectura.
  async obtenerContextoAcademico(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const contexto = await PerfilService.obtenerContextoAcademico(id);
      res.status(200).json(contexto);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const usuarios = await UsuarioRepository.listar();
      res.status(200).json(usuarios);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const usuario = await UsuarioRepository.actualizar(id, req.body);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(200).json(usuario);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const eliminado = await UsuarioRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

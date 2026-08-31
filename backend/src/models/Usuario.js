// Modelo de dominio: representa la tabla "usuario" del DER oficial.

export class Usuario {
  constructor({
    id_usuario,
    nombre_completo,
    email,
    password_hash,
    rol,
    nivel_ingles,
    activo,
    fecha_registro,
  }) {
    this.id_usuario = id_usuario;
    this.nombre_completo = nombre_completo;
    this.email = email;
    this.password_hash = password_hash;
    this.rol = rol;
    this.nivel_ingles = nivel_ingles;
    this.activo = activo;
    this.fecha_registro = fecha_registro;
  }
}

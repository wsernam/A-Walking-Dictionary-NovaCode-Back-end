// Modelo de dominio: representa la tabla "usuario" del DER oficial.

export class Usuario {
  constructor({
    id_usuario,
    nombre_completo,
    email,
    password_hash,
    rol,
    nivel_ingles,
    codigo_estudiantil,
    avatar,
    intereses,
    activo,
    fecha_registro,
  }) {
    this.id_usuario = id_usuario;
    this.nombre_completo = nombre_completo;
    this.email = email;
    this.password_hash = password_hash;
    this.rol = rol;
    this.nivel_ingles = nivel_ingles;
    this.codigo_estudiantil = codigo_estudiantil;
    this.avatar = avatar;
    this.intereses = intereses;
    this.activo = activo;
    this.fecha_registro = fecha_registro;
  }
}

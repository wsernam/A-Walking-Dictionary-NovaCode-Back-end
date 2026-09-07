// Modelo de dominio: representa la tabla "mazo" del DER oficial.
//
// PENDIENTE DE CONFIRMAR CON EL EQUIPO: se propuso agregar un campo "id_docente" a esta
// entidad, pero parece redundante — ya se puede llegar al docente dueño del mazo vía
// mazo.curso_id -> curso.docente_id (mazo no necesita saber el docente directamente).
// No se agrega como campo real todavía porque tampoco existe en el DER oficial (DBML).
// Si el equipo confirma que SÍ se necesita (ej. por rendimiento, para evitar el join
// mazo->curso en cada consulta), agregar primero la columna al DER y luego aquí.
// Si se confirma que NO se necesita, borrar este comentario.

export class Mazo {
  constructor({
    id_mazo,
    curso_id, // ver comentario "PENDIENTE DE CONFIRMAR" arriba: de aquí se llega al docente
    // id_docente, // PENDIENTE DE CONFIRMAR: descomentar esta línea y la de "this.id_docente" de abajo si el equipo confirma que se necesita (además hay que agregar la columna al DER y a MazoRepository, ver comentario ahí)
    nombre_lectura,
    autor,
    semana,
    variante_regional_predeterminada,
    estado,
    fecha_apertura,
    fecha_cierre,
    fecha_creacion,
  }) {
    this.id_mazo = id_mazo;
    this.curso_id = curso_id;
    // this.id_docente = id_docente; // PENDIENTE DE CONFIRMAR: descomentar junto con "id_docente," de arriba
    this.nombre_lectura = nombre_lectura;
    this.autor = autor;
    this.semana = semana;
    this.variante_regional_predeterminada = variante_regional_predeterminada;
    this.estado = estado;
    this.fecha_apertura = fecha_apertura;
    this.fecha_cierre = fecha_cierre;
    this.fecha_creacion = fecha_creacion;
  }
}

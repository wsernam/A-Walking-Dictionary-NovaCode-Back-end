// CuraduriaService.js
// Lógica de negocio de HU-2.1 (HE-02): la docente revisa una tarjeta que un estudiante dejó en
// estado "pendiente_revision" y decide aprobarla (con correcciones opcionales) o rechazarla.
// Historia de Usuario: HU-2.1
// Endpoint relacionado: PATCH /api/v1/cards/{id}/approve  (TarjetaController.aprobar)
// Almacenamiento: tabla "tarjeta" (estado, fecha_revision, motivo_rechazo) + tabla "notificacion".
//
// CA-2.1.3 se cumple con la migración 002 (PROPUESTA de corrección al DER, pendiente de Slack):
//   - tarjeta.motivo_rechazo  -> guarda la observación de la docente.
//   - tabla notificacion      -> el estudiante aportante recibe el aviso (lo crea el controlador).

export const CuraduriaService = {
  // Estado en el que debe estar una tarjeta para que la docente pueda revisarla (CA-2.1.2 y
  // CA-2.1.3 arrancan ambas de "una tarjeta en estado pendiente_revision").
  ESTADO_REVISABLE: 'pendiente_revision',
  // CA-2.1.2: al aprobar, la tarjeta pasa a "revisado_docente" y queda habilitada para quices.
  ESTADO_APROBADA: 'revisado_docente',
  // CA-2.1.3: al rechazar, la tarjeta pasa a "rechazada".
  ESTADO_RECHAZADA: 'rechazada',
  // Únicas dos decisiones que acepta el endpoint de revisión.
  ACCIONES_VALIDAS: ['aprobar', 'rechazar'],

  /**
   * Construye el objeto "tarjeta" ya revisado, listo para persistir con
   * TarjetaRepository.actualizar (reemplazo completo). No toca la base de datos.
   *
   * CA-2.1.2 (aprobar): aplica las correcciones que la docente haya enviado (ortografía de la
   * palabra, traducción, definición, ejemplo), fuerza estado "revisado_docente" y sella
   * "fecha_revision". Los campos que no vengan en la petición se dejan como estaban.
   * CA-2.1.3 (rechazar): solo cambia estado a "rechazada" y sella "fecha_revision"; no altera
   * el contenido de la tarjeta.
   *
   * @param {object} tarjetaActual - Tarjeta tal como está hoy en la BD (instancia de Tarjeta).
   * @param {{accion: 'aprobar'|'rechazar', palabra?: string, traduccion?: string,
   *   definicion?: string, ejemplo?: string|null, observacion?: string}} decision - Decisión de la docente.
   * @param {Date} ahora - Momento de la revisión (lo asigna el backend, no el cliente).
   * @returns {object} Datos completos de la tarjeta para el UPDATE.
   */
  construirTarjetaRevisada(tarjetaActual, decision, ahora) {
    const { accion, palabra, traduccion, definicion, ejemplo, observacion } = decision;

    if (accion === 'aprobar') {
      return {
        ...tarjetaActual,
        palabra: palabra !== undefined ? String(palabra).trim() : tarjetaActual.palabra,
        traduccion: traduccion !== undefined ? traduccion : tarjetaActual.traduccion,
        definicion: definicion !== undefined ? definicion : tarjetaActual.definicion,
        ejemplo: ejemplo !== undefined ? ejemplo : tarjetaActual.ejemplo,
        estado: this.ESTADO_APROBADA,
        fecha_revision: ahora,
        motivo_rechazo: null, // una tarjeta aprobada no arrastra motivo de rechazo previo
      };
    }

    // accion === 'rechazar' — CA-2.1.3: se guarda la observación de la docente.
    return {
      ...tarjetaActual,
      estado: this.ESTADO_RECHAZADA,
      fecha_revision: ahora,
      motivo_rechazo: String(observacion).trim(),
    };
  },

  /**
   * CA-2.1.3: texto del aviso que recibe el estudiante aportante cuando su tarjeta es rechazada.
   * @param {object} tarjeta - Tarjeta rechazada (para citar la palabra).
   * @param {string} observacion - Observación de la docente.
   * @returns {string}
   */
  mensajeRechazo(tarjeta, observacion) {
    return `Tu tarjeta "${tarjeta.palabra}" fue devuelta para corrección. Observación de la docente: ${String(observacion).trim()}`;
  },
};

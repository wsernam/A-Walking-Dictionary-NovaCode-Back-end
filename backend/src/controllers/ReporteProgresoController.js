import { ReporteProgresoPDFService } from '../services/ReporteProgresoPDFService.js';

export const ReporteProgresoController = {
  /**
   * HU-018: GET /api/v1/reports/students/:id/progress/export-pdf
   * El rol y el id del usuario salen del JWT (req.usuario), nunca del body ni de la query.
   * La regla de acceso (CA-18.3) vive en ReporteProgresoService.
   */
  async exportarPdf(req, res) {
    try {
      const pdf = await ReporteProgresoPDFService.generarPdf(req.usuario, req.params.id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-progreso-estudiante.pdf"');
      return res.status(200).send(Buffer.from(pdf));
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  },
};

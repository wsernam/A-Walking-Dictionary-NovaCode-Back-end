import { ReporteEstudioPDFService } from '../services/ReporteEstudioPDFService.js';

export const ReporteEstudioController = {
  /**
   * HU-019: GET /api/v1/reports/study-mode/export-pdf?student_id=
   * El rol y el id del usuario salen del JWT (req.usuario), nunca del body ni de la query.
   * La regla de acceso (CA-19.3) vive en ReporteEstudioService.
   */
  async exportarPdf(req, res) {
    try {
      const pdf = await ReporteEstudioPDFService.generarPdf(req.usuario, req.query.student_id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-modo-estudio.pdf"');
      return res.status(200).send(Buffer.from(pdf));
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  },
};
import { ReporteCursoPDFService } from '../services/ReporteCursoPDFService.js';

export const ReporteCursoController = {
  /**
   * HU-020: GET /api/v1/reports/students/export-pdf?curso_id=
   * El rol y el id del usuario salen del JWT (req.usuario), nunca del body. El curso sale de la
   * query. La regla de acceso (CA-20.3: solo docente y solo de su curso) vive en
   * ReporteCursoService.
   */
  async exportarPdf(req, res) {
    try {
      const pdf = await ReporteCursoPDFService.generarPdf(req.usuario, req.query.curso_id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-estudiantes-curso.pdf"');
      return res.status(200).send(Buffer.from(pdf));
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  },
};

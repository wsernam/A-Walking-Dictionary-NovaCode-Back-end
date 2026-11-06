import { ReporteResultadosQuizPDFService } from '../services/ReporteResultadosQuizPDFService.js';

export const ReporteResultadosQuizController = {
  /**
   * HU-021: GET /api/v1/reports/quizzes/:id/results/export-pdf
   * El rol y el id del usuario salen del JWT (req.usuario), nunca del body ni de la query.
   * El control de acceso (CA-21.3) vive en la ruta (requireRole) y en ReporteResultadosQuizService.
   */
  async exportarPdf(req, res) {
    try {
      const pdf = await ReporteResultadosQuizPDFService.generarPdf(req.usuario, req.params.id);

      res.setHeader('Content-Type', 'application/pdf');
      // El servicio ya validó que :id es un entero positivo, por eso es seguro usarlo en el nombre.
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="quiz-results-${Number(req.params.id)}.pdf"`
      );
      return res.status(200).send(Buffer.from(pdf));
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  },
};
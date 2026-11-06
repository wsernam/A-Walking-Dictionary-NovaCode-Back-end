import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/ReporteResultadosQuizPDFService.js', () => ({
  ReporteResultadosQuizPDFService: { generarPdf: vi.fn() },
}));

import { ReporteResultadosQuizPDFService } from '../../src/services/ReporteResultadosQuizPDFService.js';
import { ReporteResultadosQuizController } from '../../src/controllers/ReporteResultadosQuizController.js';

function crearRes() {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const docente = { id_usuario: 7, rol: 'docente' };

describe('ReporteResultadosQuizController.exportarPdf — HU-021', () => {
  beforeEach(() => {
    vi.mocked(ReporteResultadosQuizPDFService.generarPdf).mockReset();
  });

  it('CA-21.1: responde 200 con el PDF como descarga quiz-results-{id}.pdf', async () => {
    ReporteResultadosQuizPDFService.generarPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const res = crearRes();

    await ReporteResultadosQuizController.exportarPdf({ usuario: docente, params: { id: '5' } }, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="quiz-results-5.pdf"'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(Buffer.from([37, 80, 68, 70]));
  });

  it('toma el usuario del JWT y el id del quiz de la ruta', async () => {
    ReporteResultadosQuizPDFService.generarPdf.mockResolvedValue(new Uint8Array([1]));

    await ReporteResultadosQuizController.exportarPdf({ usuario: docente, params: { id: '5' } }, crearRes());

    expect(ReporteResultadosQuizPDFService.generarPdf).toHaveBeenCalledWith(docente, '5');
  });

  it('CA-21.3: reenvía el 403 con su código y sin enviar el documento', async () => {
    ReporteResultadosQuizPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('No tiene permisos para acceder a este recurso'), {
        status: 403,
        code: 'AUTH_FORBIDDEN',
      })
    );
    const res = crearRes();

    await ReporteResultadosQuizController.exportarPdf(
      { usuario: { id_usuario: 3, rol: 'estudiante' }, params: { id: '5' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No tiene permisos para acceder a este recurso',
      code: 'AUTH_FORBIDDEN',
    });
    expect(res.send).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('reenvía el 404 de un quiz inexistente con su código', async () => {
    ReporteResultadosQuizPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('Quiz no encontrado'), { status: 404, code: 'QUIZ_NOT_FOUND' })
    );
    const res = crearRes();

    await ReporteResultadosQuizController.exportarPdf({ usuario: docente, params: { id: '99999' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Quiz no encontrado', code: 'QUIZ_NOT_FOUND' });
  });

  it('reenvía el 400 de un id inválido y no usa ese id en ninguna cabecera', async () => {
    ReporteResultadosQuizPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('id inválido'), { status: 400, code: 'INVALID_ID' })
    );
    const res = crearRes();

    await ReporteResultadosQuizController.exportarPdf({ usuario: docente, params: { id: 'abc"\r\n' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'id inválido', code: 'INVALID_ID' });
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('un error inesperado sin status responde 500', async () => {
    ReporteResultadosQuizPDFService.generarPdf.mockRejectedValue(new Error('fallo de BD'));
    const res = crearRes();

    await ReporteResultadosQuizController.exportarPdf({ usuario: docente, params: { id: '5' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).not.toHaveBeenCalled();
  });
});
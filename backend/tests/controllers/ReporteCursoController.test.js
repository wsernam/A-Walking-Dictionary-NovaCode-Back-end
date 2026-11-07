import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/ReporteCursoPDFService.js', () => ({
  ReporteCursoPDFService: { generarPdf: vi.fn() },
}));

import { ReporteCursoPDFService } from '../../src/services/ReporteCursoPDFService.js';
import { ReporteCursoController } from '../../src/controllers/ReporteCursoController.js';

function crearRes() {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('ReporteCursoController.exportarPdf — HU-020', () => {
  beforeEach(() => {
    vi.mocked(ReporteCursoPDFService.generarPdf).mockReset();
  });

  it('CA-20.1: responde 200 con el PDF como descarga', async () => {
    ReporteCursoPDFService.generarPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const res = crearRes();

    await ReporteCursoController.exportarPdf(
      { usuario: { id_usuario: 7, rol: 'docente' }, query: { curso_id: '1' } },
      res
    );

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="reporte-estudiantes-curso.pdf"'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(Buffer.from([37, 80, 68, 70]));
  });

  it('toma el usuario del JWT y el curso de la query', async () => {
    ReporteCursoPDFService.generarPdf.mockResolvedValue(new Uint8Array([1]));
    const usuario = { id_usuario: 7, rol: 'docente' };

    await ReporteCursoController.exportarPdf({ usuario, query: { curso_id: '3' } }, crearRes());

    expect(ReporteCursoPDFService.generarPdf).toHaveBeenCalledWith(usuario, '3');
  });

  it('sin curso_id en la query lo pasa como undefined y el servicio responde 400', async () => {
    ReporteCursoPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('id inválido'), { status: 400, code: 'INVALID_ID' })
    );
    const res = crearRes();
    const usuario = { id_usuario: 7, rol: 'docente' };

    await ReporteCursoController.exportarPdf({ usuario, query: {} }, res);

    expect(ReporteCursoPDFService.generarPdf).toHaveBeenCalledWith(usuario, undefined);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'id inválido', code: 'INVALID_ID' });
  });

  it('CA-20.3: reenvía el 403 con su código y sin enviar el documento', async () => {
    ReporteCursoPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('No tiene permisos para acceder a este recurso'), {
        status: 403,
        code: 'REPORT_FORBIDDEN',
      })
    );
    const res = crearRes();

    await ReporteCursoController.exportarPdf(
      { usuario: { id_usuario: 7, rol: 'docente' }, query: { curso_id: '2' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No tiene permisos para acceder a este recurso',
      code: 'REPORT_FORBIDDEN',
    });
    expect(res.send).not.toHaveBeenCalled();
  });

  it('reenvía el 404 cuando el curso no existe', async () => {
    ReporteCursoPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('Curso no encontrado'), { status: 404, code: 'COURSE_NOT_FOUND' })
    );
    const res = crearRes();

    await ReporteCursoController.exportarPdf(
      { usuario: { id_usuario: 7, rol: 'docente' }, query: { curso_id: '999' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Curso no encontrado', code: 'COURSE_NOT_FOUND' });
  });

  it('un error inesperado sin status responde 500', async () => {
    ReporteCursoPDFService.generarPdf.mockRejectedValue(new Error('fallo de BD'));
    const res = crearRes();

    await ReporteCursoController.exportarPdf(
      { usuario: { id_usuario: 7, rol: 'docente' }, query: { curso_id: '1' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).not.toHaveBeenCalled();
  });
});

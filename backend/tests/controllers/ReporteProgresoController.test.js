import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/ReporteProgresoPDFService.js', () => ({
  ReporteProgresoPDFService: { generarPdf: vi.fn() },
}));

import { ReporteProgresoPDFService } from '../../src/services/ReporteProgresoPDFService.js';
import { ReporteProgresoController } from '../../src/controllers/ReporteProgresoController.js';

function crearRes() {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('ReporteProgresoController.exportarPdf — HU-018', () => {
  beforeEach(() => {
    vi.mocked(ReporteProgresoPDFService.generarPdf).mockReset();
  });

  it('CA-18.1: responde 200 con el PDF como descarga', async () => {
    ReporteProgresoPDFService.generarPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const res = crearRes();

    await ReporteProgresoController.exportarPdf(
      { usuario: { id_usuario: 7, rol: 'docente' }, params: { id: '3' } },
      res
    );

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="reporte-progreso-estudiante.pdf"'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(Buffer.from([37, 80, 68, 70]));
  });

  it('toma el usuario del JWT y el id de la ruta', async () => {
    ReporteProgresoPDFService.generarPdf.mockResolvedValue(new Uint8Array([1]));
    const usuario = { id_usuario: 3, rol: 'estudiante' };

    await ReporteProgresoController.exportarPdf({ usuario, params: { id: '3' } }, crearRes());

    expect(ReporteProgresoPDFService.generarPdf).toHaveBeenCalledWith(usuario, '3');
  });

  it('CA-18.3: reenvía el 403 con su código y sin enviar el documento', async () => {
    ReporteProgresoPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('No tiene permisos para ver el reporte de otro estudiante'), {
        status: 403,
        code: 'REPORT_FORBIDDEN',
      })
    );
    const res = crearRes();

    await ReporteProgresoController.exportarPdf(
      { usuario: { id_usuario: 3, rol: 'estudiante' }, params: { id: '5' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No tiene permisos para ver el reporte de otro estudiante',
      code: 'REPORT_FORBIDDEN',
    });
    expect(res.send).not.toHaveBeenCalled();
  });

  it('reenvía el 404 cuando la docente pide un estudiante que no es de sus cursos', async () => {
    ReporteProgresoPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('Estudiante no encontrado'), { status: 404, code: 'REPORT_STUDENT_NOT_FOUND' })
    );
    const res = crearRes();

    await ReporteProgresoController.exportarPdf(
      { usuario: { id_usuario: 7, rol: 'docente' }, params: { id: '999' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Estudiante no encontrado', code: 'REPORT_STUDENT_NOT_FOUND' });
  });

  it('un error inesperado sin status responde 500', async () => {
    ReporteProgresoPDFService.generarPdf.mockRejectedValue(new Error('fallo de BD'));
    const res = crearRes();

    await ReporteProgresoController.exportarPdf(
      { usuario: { id_usuario: 7, rol: 'docente' }, params: { id: '3' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).not.toHaveBeenCalled();
  });
});

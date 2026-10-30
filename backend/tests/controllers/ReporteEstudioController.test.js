import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/ReporteEstudioPDFService.js', () => ({
  ReporteEstudioPDFService: { generarPdf: vi.fn() },
}));

import { ReporteEstudioPDFService } from '../../src/services/ReporteEstudioPDFService.js';
import { ReporteEstudioController } from '../../src/controllers/ReporteEstudioController.js';

function crearRes() {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('ReporteEstudioController.exportarPdf — HU-019', () => {
  beforeEach(() => {
    vi.mocked(ReporteEstudioPDFService.generarPdf).mockReset();
  });

  it('CA-19.1: responde 200 con el PDF como descarga', async () => {
    ReporteEstudioPDFService.generarPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const res = crearRes();

    await ReporteEstudioController.exportarPdf({ usuario: { id_usuario: 7, rol: 'docente' }, query: {} }, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="reporte-modo-estudio.pdf"'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(Buffer.from([37, 80, 68, 70]));
  });

  it('toma el usuario del JWT y el student_id de la query', async () => {
    ReporteEstudioPDFService.generarPdf.mockResolvedValue(new Uint8Array([1]));
    const usuario = { id_usuario: 3, rol: 'estudiante' };

    await ReporteEstudioController.exportarPdf({ usuario, query: { student_id: '3' } }, crearRes());

    expect(ReporteEstudioPDFService.generarPdf).toHaveBeenCalledWith(usuario, '3');
  });

  it('CA-19.3: reenvía el 403 con su código y sin enviar el documento', async () => {
    ReporteEstudioPDFService.generarPdf.mockRejectedValue(
      Object.assign(new Error('No tiene permisos para ver el reporte de otro estudiante'), {
        status: 403,
        code: 'REPORT_FORBIDDEN',
      })
    );
    const res = crearRes();

    await ReporteEstudioController.exportarPdf(
      { usuario: { id_usuario: 3, rol: 'estudiante' }, query: { student_id: '5' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No tiene permisos para ver el reporte de otro estudiante',
      code: 'REPORT_FORBIDDEN',
    });
    expect(res.send).not.toHaveBeenCalled();
  });

  it('un error inesperado sin status responde 500', async () => {
    ReporteEstudioPDFService.generarPdf.mockRejectedValue(new Error('fallo de BD'));
    const res = crearRes();

    await ReporteEstudioController.exportarPdf({ usuario: { id_usuario: 7, rol: 'docente' }, query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).not.toHaveBeenCalled();
  });
});
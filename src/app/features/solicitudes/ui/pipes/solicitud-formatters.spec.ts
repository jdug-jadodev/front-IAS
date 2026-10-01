import { FechaSolicitudPipe } from './fecha-solicitud.pipe';
import { MontoCopPipe } from './monto-cop.pipe';

describe('Presentación de solicitudes', () => {
  it('formatea COP sin convertir el decimal a Number ni perder precisión', () => {
    const pipe = new MontoCopPipe();

    expect(pipe.transform('9007199254740993.0001')).toBe('$9.007.199.254.740.993,0001');
    expect(pipe.transform('1000000.00')).toBe('$1.000.000,00');
  });

  it('presenta la fecha del backend en la zona de Bogotá', () => {
    const pipe = new FechaSolicitudPipe();

    expect(pipe.transform('2026-10-01T14:30:00Z')).toBe('1 oct 2026, 09:30');
    expect(pipe.transform('2026-10-01T03:30:00Z')).toBe('30 sept 2026, 22:30');
  });
});

import {
  parseSolicitud,
  parseSolicitudes,
  RespuestaIncompatible,
} from './solicitud-response.parser';

describe('Parser de respuestas', () => {
  const base = {
    applicationReference: 'r',
    customerId: 'c',
    amount: '1.00',
    termMonths: 12,
    status: 'APPROVED',
    processedAt: '2026-10-01T10:00:00Z',
  };

  it('conserva los decimales textuales y la fecha enviada por el backend', () => {
    const response = {
      ...base,
      amount: '9007199254740993.0001',
      processedAt: '2026-10-01T10:00:00.123456-05:00',
    };
    expect(parseSolicitud(response)).toEqual(response);
    expect(parseSolicitud({ ...base, amount: 1 }).amount).toBe('1');
  });

  it.each([
    null,
    {},
    { ...base, status: 'UNKNOWN' },
    { ...base, status: 'REJECTED' },
    { ...base, processedAt: 'ayer' },
    { ...base, processedAt: '2026-02-30T10:00:00Z' },
    { ...base, processedAt: '2026-10-01T10:00:00' },
    { ...base, amount: Infinity },
    { ...base, amount: 9007199254740992 },
    { ...base, amount: 'NaN' },
    { ...base, termMonths: '12' },
    { ...base, applicationReference: ' ' },
  ])('rechaza una respuesta incompatible: %j', (response) => {
    expect(() => parseSolicitud(response)).toThrow(RespuestaIncompatible);
  });

  it('admite rechazos de negocio con datos fuera de los límites del formulario', () => {
    const response = {
      ...base,
      amount: '-1',
      termMonths: 5,
      status: 'REJECTED',
      reasonCode: 'INVALID_AMOUNT',
      reason: 'Monto inválido.',
    };
    expect(parseSolicitud(response)).toEqual(response);
  });

  it('un listado incompatible es un error y no una lista vacía exitosa', () => {
    expect(parseSolicitudes([])).toEqual([]);
    expect(() => parseSolicitudes({ content: [] })).toThrow(RespuestaIncompatible);
    expect(() => parseSolicitudes([base, {}])).toThrow(RespuestaIncompatible);
  });
});

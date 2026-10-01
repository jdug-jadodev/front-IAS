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
    message: 'Esta solicitud fue aprobada',
    processedAt: '2026-10-01T10:00:00Z',
    reasonCode: null,
    reason: null,
  };

  it('conserva los decimales textuales y la fecha enviada por el backend', () => {
    const response = {
      ...base,
      amount: '9007199254740993.0001',
      processedAt: '2026-10-01T10:00:00.123456-05:00',
    };
    expect(parseSolicitud(response)).toEqual(response);
  });

  it.each([
    null,
    {},
    { ...base, status: 'UNKNOWN' },
    { ...base, status: 'REJECTED' },
    { ...base, message: '' },
    { ...base, reasonCode: 'INVALID_AMOUNT', reason: 'No corresponde en una aprobación.' },
    { ...base, processedAt: 'ayer' },
    { ...base, processedAt: '2026-02-30T10:00:00Z' },
    { ...base, processedAt: '2026-10-01T10:00:00' },
    { ...base, amount: 1 },
    { ...base, amount: Infinity },
    { ...base, amount: 9007199254740992 },
    { ...base, amount: 'NaN' },
    { ...base, termMonths: '12' },
    { ...base, applicationReference: ' ' },
    {
      ...base,
      status: 'REJECTED',
      reasonCode: 'UNKNOWN_REASON',
      reason: 'Motivo desconocido.',
    },
  ])('rechaza una respuesta incompatible: %j', (response) => {
    expect(() => parseSolicitud(response)).toThrow(RespuestaIncompatible);
  });

  it('admite rechazos de negocio con datos fuera de los límites del formulario', () => {
    const response = {
      ...base,
      amount: '-1',
      termMonths: 5,
      status: 'REJECTED',
      message: 'Esta solicitud fue rechazada',
      reasonCode: 'INVALID_AMOUNT',
      reason: 'Monto inválido.',
    };
    expect(parseSolicitud(response)).toEqual(response);
  });

  it.each([
    'INVALID_AMOUNT',
    'INVALID_TERM',
    'CUSTOMER_NOT_FOUND',
    'CUSTOMER_BLOCKED',
    'INSUFFICIENT_LIMIT',
  ] as const)('admite el motivo de rechazo contractual %s', (reasonCode) => {
    const response = {
      ...base,
      status: 'REJECTED',
      message: 'Esta solicitud fue rechazada',
      reasonCode,
      reason: 'Motivo de prueba.',
    };

    expect(parseSolicitud(response)).toEqual(response);
  });

  it('un listado incompatible es un error y no una lista vacía exitosa', () => {
    const vacia = {
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    };
    expect(parseSolicitudes(vacia)).toEqual(vacia);
    const cinco = { ...vacia, content: [base], size: 5, totalElements: 1, totalPages: 1 };
    expect(parseSolicitudes(cinco)).toEqual(cinco);
    expect(() => parseSolicitudes({ ...cinco, content: Array(6).fill(base) })).toThrow(
      RespuestaIncompatible,
    );
    expect(() => parseSolicitudes([])).toThrow(RespuestaIncompatible);
    expect(() => parseSolicitudes({ content: [] })).toThrow(RespuestaIncompatible);
    expect(() => parseSolicitudes({ ...vacia, content: [base, {}] })).toThrow(
      RespuestaIncompatible,
    );
    expect(() => parseSolicitudes({ ...vacia, size: 100 })).toThrow(RespuestaIncompatible);
  });
});

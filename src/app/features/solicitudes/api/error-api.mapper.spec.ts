import { HttpErrorResponse } from '@angular/common/http';
import { mapErrorApi } from './error-api.mapper';

describe('Errores de la API', () => {
  it('conserva la trazabilidad sin exponer detalles internos', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { message: 'SQL credentials', stack: 'java...', traceId: 'trace-123' },
    });
    expect(mapErrorApi(error)).toEqual({
      status: 500,
      message: 'El servidor no pudo completar la operación.',
      traceId: 'trace-123',
    });
  });

  it('admite requestId en errores del backend actual', () => {
    const error = new HttpErrorResponse({ status: 404, error: { requestId: 'request-1' } });
    expect(mapErrorApi(error).traceId).toBe('request-1');
    expect(mapErrorApi(error).message).toContain('No se encontró');
  });
});

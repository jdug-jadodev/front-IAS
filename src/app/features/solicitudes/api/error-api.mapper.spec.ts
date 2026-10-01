import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { mapErrorApi } from './error-api.mapper';

describe('Errores de la API', () => {
  it('conserva la trazabilidad sin exponer detalles internos', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'SQL credentials',
        stack: 'java...',
        traceId: 'trace-123',
      },
    });
    expect(mapErrorApi(error)).toEqual({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'No fue posible procesar la petición.',
      traceId: 'trace-123',
    });
  });

  it('conserva el código, mensaje y traceId del contrato en errores 4xx', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: {
        code: 'APPLICATION_NOT_FOUND',
        message: 'No se encontró la solicitud con referencia: REF-404',
        traceId: 'trace-404',
      },
    });

    expect(mapErrorApi(error)).toEqual({
      status: 404,
      code: 'APPLICATION_NOT_FOUND',
      message: 'No se encontró la solicitud con referencia: REF-404',
      traceId: 'trace-404',
    });
  });

  it('recupera X-Trace-Id cuando el cuerpo no trae trazabilidad', () => {
    const error = new HttpErrorResponse({
      status: 413,
      headers: new HttpHeaders({ 'X-Trace-Id': 'trace-header' }),
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'El cuerpo de la petición es demasiado grande',
      },
    });

    expect(mapErrorApi(error)).toEqual({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'El cuerpo de la petición es demasiado grande',
      traceId: 'trace-header',
    });
  });
});

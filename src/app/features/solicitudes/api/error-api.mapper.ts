import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { ErrorUi } from '../models/solicitud.model';
import { RespuestaIncompatible } from './solicitud-response.parser';

export function mapErrorApi(error: unknown): ErrorUi {
  if (error instanceof TimeoutError)
    return { message: 'Se agotó el tiempo de espera del servidor.' };
  if (error instanceof RespuestaIncompatible) return { message: error.message };
  if (!(error instanceof HttpErrorResponse))
    return { message: 'No fue posible completar la operación.' };
  const messages: Record<number, string> = {
    0: 'No se pudo conectar con el servidor.',
    400: 'El servidor no procesó los datos. Revisa la solicitud e inténtalo de nuevo.',
    404: 'No se encontró una solicitud con esa referencia.',
    409: 'La referencia ya está asociada a otros datos.',
  };
  const body: unknown = error.error;
  const trace =
    body && typeof body === 'object'
      ? ((body as Record<string, unknown>)['traceId'] ??
        (body as Record<string, unknown>)['requestId'])
      : undefined;
  return {
    message: messages[error.status] ?? 'El servidor no pudo completar la operación.',
    status: error.status,
    traceId: typeof trace === 'string' && trace.length <= 200 ? trace : undefined,
  };
}

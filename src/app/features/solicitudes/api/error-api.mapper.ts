import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { ErrorUi } from '../models/solicitud.model';
import { RespuestaIncompatible } from './solicitud-response.parser';

const MENSAJES_HTTP: Record<number, string> = {
  0: 'No se pudo conectar con el servidor.',
  400: 'El servidor no procesó los datos. Revisa la solicitud e inténtalo de nuevo.',
  404: 'No se encontró una solicitud con esa referencia.',
  405: 'La operación solicitada no está disponible.',
  406: 'El servidor no puede entregar una respuesta compatible.',
  409: 'La referencia ya está asociada a otros datos.',
  413: 'El cuerpo de la solicitud es demasiado grande.',
  415: 'El servidor no acepta el formato enviado.',
  500: 'No fue posible procesar la petición.',
};

function textoSeguro(value: unknown, maximo: number): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximo
    ? value
    : undefined;
}

export function mapErrorApi(error: unknown): ErrorUi {
  if (error instanceof TimeoutError)
    return { message: 'Se agotó el tiempo de espera del servidor.' };
  if (error instanceof RespuestaIncompatible) return { message: error.message };
  if (!(error instanceof HttpErrorResponse))
    return { message: 'No fue posible completar la operación.' };
  const body: unknown = error.error;
  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  const code = textoSeguro(data?.['code'], 100);
  const backendMessage = textoSeguro(data?.['message'], 500);
  const trace =
    textoSeguro(data?.['traceId'], 200) ?? textoSeguro(error.headers.get('X-Trace-Id'), 200);
  return {
    ...(code ? { code } : {}),
    message:
      error.status >= 400 && error.status < 500 && code && backendMessage
        ? backendMessage
        : (MENSAJES_HTTP[error.status] ?? 'El servidor no pudo completar la operación.'),
    status: error.status,
    ...(trace ? { traceId: trace } : {}),
  };
}

import {
  CodigoMotivoRechazo,
  PaginaSolicitudes,
  SolicitudResultado,
} from '../models/solicitud.model';
import { decimalCanonico } from '../validation/solicitud-form.validators';

const CODIGOS_RECHAZO = new Set<CodigoMotivoRechazo>([
  'INVALID_AMOUNT',
  'INVALID_TERM',
  'CUSTOMER_NOT_FOUND',
  'CUSTOMER_BLOCKED',
  'INSUFFICIENT_LIMIT',
]);

export class RespuestaIncompatible extends Error {
  constructor() {
    super('La respuesta del servidor no tiene el formato esperado.');
  }
}

function texto(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function codigoRechazo(value: unknown): value is CodigoMotivoRechazo {
  return typeof value === 'string' && CODIGOS_RECHAZO.has(value as CodigoMotivoRechazo);
}

function fechaValida(value: unknown): value is string {
  if (
    !texto(value) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return false;
  }
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate() &&
    Number.isFinite(Date.parse(value))
  );
}

export function parseSolicitud(value: unknown): SolicitudResultado {
  if (!value || typeof value !== 'object') throw new RespuestaIncompatible();
  const data = value as Record<string, unknown>;
  const reference = data['applicationReference'];
  const customer = data['customerId'];
  const amount = data['amount'];
  const term = data['termMonths'];
  const message = data['message'];
  const processedAt = data['processedAt'];
  if (
    !texto(reference) ||
    !texto(customer) ||
    typeof amount !== 'string' ||
    decimalCanonico(amount) === null ||
    typeof term !== 'number' ||
    !Number.isInteger(term) ||
    !texto(message) ||
    !fechaValida(processedAt)
  )
    throw new RespuestaIncompatible();
  const base = {
    applicationReference: reference,
    customerId: customer,
    amount,
    termMonths: term,
    message,
    processedAt,
  };
  if (data['status'] === 'APPROVED' && data['reasonCode'] === null && data['reason'] === null) {
    return { ...base, status: 'APPROVED', reasonCode: null, reason: null };
  }
  if (data['status'] === 'REJECTED' && codigoRechazo(data['reasonCode']) && texto(data['reason'])) {
    return { ...base, status: 'REJECTED', reasonCode: data['reasonCode'], reason: data['reason'] };
  }
  throw new RespuestaIncompatible();
}

export function parseSolicitudes(value: unknown): PaginaSolicitudes {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RespuestaIncompatible();
  const data = value as Record<string, unknown>;
  const { content, page, size, totalElements, totalPages, first, last } = data;
  if (
    !Array.isArray(content) ||
    !Number.isInteger(page) ||
    (page as number) < 0 ||
    !Number.isInteger(size) ||
    (size as number) < 1 ||
    (size as number) > 20 ||
    !Number.isInteger(totalElements) ||
    (totalElements as number) < 0 ||
    !Number.isInteger(totalPages) ||
    (totalPages as number) < 0 ||
    typeof first !== 'boolean' ||
    typeof last !== 'boolean' ||
    content.length > (size as number)
  )
    throw new RespuestaIncompatible();
  return {
    content: content.map(parseSolicitud),
    page: page as number,
    size: size as number,
    totalElements: totalElements as number,
    totalPages: totalPages as number,
    first,
    last,
  };
}

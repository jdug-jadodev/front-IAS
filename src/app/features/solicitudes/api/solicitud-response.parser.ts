import { SolicitudResultado } from '../models/solicitud.model';
import { decimalCanonico } from '../validation/solicitud-form.validators';

export class RespuestaIncompatible extends Error {
  constructor() {
    super('La respuesta del servidor no tiene el formato esperado.');
  }
}

function texto(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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
  const rawAmount = data['amount'];
  // Compatibilidad provisional con las respuestas numéricas del diseño original.
  // Importes de precisión arbitraria deben llegar como texto desde el backend.
  const amount =
    typeof rawAmount === 'number' &&
    Number.isFinite(rawAmount) &&
    Math.abs(rawAmount) <= Number.MAX_SAFE_INTEGER
      ? String(rawAmount)
      : rawAmount;
  const term = data['termMonths'];
  const processedAt = data['processedAt'];
  if (
    !texto(reference) ||
    !texto(customer) ||
    typeof amount !== 'string' ||
    decimalCanonico(amount) === null ||
    typeof term !== 'number' ||
    !Number.isInteger(term) ||
    !fechaValida(processedAt)
  )
    throw new RespuestaIncompatible();
  const base = {
    applicationReference: reference,
    customerId: customer,
    amount,
    termMonths: term,
    processedAt,
  };
  if (data['status'] === 'APPROVED') return { ...base, status: 'APPROVED' };
  if (data['status'] === 'REJECTED' && texto(data['reasonCode']) && texto(data['reason'])) {
    return { ...base, status: 'REJECTED', reasonCode: data['reasonCode'], reason: data['reason'] };
  }
  throw new RespuestaIncompatible();
}

export function parseSolicitudes(value: unknown): readonly SolicitudResultado[] {
  if (!Array.isArray(value)) throw new RespuestaIncompatible();
  return value.map(parseSolicitud);
}

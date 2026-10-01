export interface SolicitudEntrada {
  readonly customerId: string;
  readonly amount: string;
  readonly termMonths: number;
}

export type CodigoMotivoRechazo =
  | 'INVALID_AMOUNT'
  | 'INVALID_TERM'
  | 'CUSTOMER_NOT_FOUND'
  | 'CUSTOMER_BLOCKED'
  | 'INSUFFICIENT_LIMIT';

export type SolicitudResultado = SolicitudEntrada & {
  readonly applicationReference: string;
  readonly message: string;
  readonly processedAt: string;
} & (
    | { readonly status: 'APPROVED'; readonly reasonCode: null; readonly reason: null }
    | {
        readonly status: 'REJECTED';
        readonly reasonCode: CodigoMotivoRechazo;
        readonly reason: string;
      }
  );

export interface PaginaSolicitudes {
  readonly content: readonly SolicitudResultado[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
}

export interface RespuestaEnvioSolicitud {
  readonly httpStatus: 200 | 201;
  readonly solicitud: SolicitudResultado;
}

export interface ErrorUi {
  readonly code?: string;
  readonly message: string;
  readonly traceId?: string;
  readonly status?: number;
}

export type EnvioEstado =
  | { readonly tipo: 'idle' }
  | { readonly tipo: 'submitting'; readonly datos: SolicitudEntrada }
  | {
      readonly tipo: 'resolved';
      readonly datos: SolicitudEntrada;
      readonly resultado: SolicitudResultado;
    }
  | {
      readonly tipo: 'invalid' | 'conflict';
      readonly datos: SolicitudEntrada;
      readonly error: ErrorUi;
    }
  | {
      readonly tipo: 'unconfirmed';
      readonly datos: SolicitudEntrada;
      readonly error: ErrorUi;
      readonly recuperacion: 'reintento' | null;
    };

export interface LecturaEstado<T> {
  readonly datos: T;
  readonly cargando: boolean;
  readonly error: ErrorUi | null;
}

export interface SolicitudEntrada {
  readonly applicationReference: string;
  readonly customerId: string;
  readonly amount: string;
  readonly termMonths: number;
}

export type SolicitudResultado = SolicitudEntrada & {
  readonly processedAt: string;
} & (
    | { readonly status: 'APPROVED' }
    | { readonly status: 'REJECTED'; readonly reasonCode: string; readonly reason: string }
  );

export interface ErrorUi {
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
      readonly recuperacion: 'consulta' | 'reintento' | null;
    };

export interface LecturaEstado<T> {
  readonly datos: T;
  readonly cargando: boolean;
  readonly error: ErrorUi | null;
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, timeout } from 'rxjs';
import { RespuestaEnvioSolicitud, SolicitudEntrada } from '../models/solicitud.model';
import {
  parseSolicitud,
  parseSolicitudes,
  RespuestaIncompatible,
} from './solicitud-response.parser';

export const SOLICITUD_TIMEOUT_MS = new InjectionToken<number>('SOLICITUD_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => 15_000,
});

export const SOLICITUDES_POR_PAGINA = 20;

@Injectable({ providedIn: 'root' })
export class SolicitudesApiService {
  private readonly http = inject(HttpClient);
  private readonly espera = inject(SOLICITUD_TIMEOUT_MS);
  private readonly url = '/api/applications';

  enviar(datos: SolicitudEntrada, idempotencyKey: string) {
    return this.http
      .post<unknown>(this.url, datos, {
        observe: 'response',
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .pipe(
        timeout(this.espera),
        map((response): RespuestaEnvioSolicitud => {
          const httpStatus = response.status;
          if (httpStatus !== 200 && httpStatus !== 201) throw new RespuestaIncompatible();
          return { httpStatus, solicitud: parseSolicitud(response.body) };
        }),
      );
  }

  consultar(referencia: string) {
    return this.http
      .get<unknown>(`${this.url}/${encodeURIComponent(referencia)}`)
      .pipe(timeout(this.espera), map(parseSolicitud));
  }

  recientes(page = 0) {
    return this.http
      .get<unknown>(this.url, { params: { page, size: SOLICITUDES_POR_PAGINA } })
      .pipe(timeout(this.espera), map(parseSolicitudes));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, timeout } from 'rxjs';
import { SolicitudEntrada } from '../models/solicitud.model';
import {
  parseSolicitud,
  parseSolicitudes,
  RespuestaIncompatible,
} from './solicitud-response.parser';

export const SOLICITUD_TIMEOUT_MS = new InjectionToken<number>('SOLICITUD_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => 15_000,
});

@Injectable({ providedIn: 'root' })
export class SolicitudesApiService {
  private readonly http = inject(HttpClient);
  private readonly espera = inject(SOLICITUD_TIMEOUT_MS);
  private readonly url = '/api/applications';

  enviar(datos: SolicitudEntrada) {
    return this.http.post<unknown>(this.url, datos, { observe: 'response' }).pipe(
      timeout(this.espera),
      map((response) => {
        if (response.status !== 200 && response.status !== 201) throw new RespuestaIncompatible();
        return parseSolicitud(response.body);
      }),
    );
  }

  consultar(referencia: string) {
    return this.http
      .get<unknown>(`${this.url}/${encodeURIComponent(referencia)}`)
      .pipe(timeout(this.espera), map(parseSolicitud));
  }

  recientes() {
    return this.http
      .get<unknown>(this.url, { params: { limit: 20 } })
      .pipe(timeout(this.espera), map(parseSolicitudes));
  }
}

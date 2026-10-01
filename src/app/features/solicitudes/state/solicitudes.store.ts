import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { mapErrorApi } from '../api/error-api.mapper';
import { RespuestaIncompatible } from '../api/solicitud-response.parser';
import { SOLICITUDES_POR_PAGINA, SolicitudesApiService } from '../api/solicitudes-api.service';
import {
  EnvioEstado,
  ErrorUi,
  LecturaEstado,
  PaginaSolicitudes,
  SolicitudEntrada,
  SolicitudResultado,
} from '../models/solicitud.model';
import { mismosDatos } from '../validation/solicitud-form.validators';

@Injectable()
export class SolicitudesStore {
  private readonly api = inject(SolicitudesApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _envio = signal<EnvioEstado>({ tipo: 'idle' });
  private readonly _recientes = signal<LecturaEstado<readonly SolicitudResultado[]>>({
    datos: [],
    cargando: false,
    error: null,
  });
  private readonly _paginaRecientes = signal<PaginaSolicitudes | null>(null);
  private readonly _consulta = signal<LecturaEstado<SolicitudResultado | null>>({
    datos: null,
    cargando: false,
    error: null,
  });
  private readonly _revision = signal(0);
  private claveEnvio: string | null = null;
  private operacion = 0;
  private lecturaRecientes = 0;
  private lecturaConsulta = 0;
  private peticionRecientes?: Subscription;
  private peticionConsulta?: Subscription;

  readonly envio = this._envio.asReadonly();
  readonly recientes = this._recientes.asReadonly();
  readonly paginaRecientes = this._paginaRecientes.asReadonly();
  readonly consulta = this._consulta.asReadonly();
  readonly revisionFormulario = this._revision.asReadonly();
  readonly edicionBloqueada = computed(() => !['idle', 'invalid'].includes(this.envio().tipo));
  readonly recuperando = computed(() => {
    const estado = this.envio();
    return estado.tipo === 'unconfirmed' && estado.recuperacion !== null;
  });

  enviar(entrada: SolicitudEntrada): void {
    if (this.edicionBloqueada()) return;
    const datos = Object.freeze({
      customerId: entrada.customerId,
      amount: entrada.amount,
      termMonths: entrada.termMonths,
    });
    this.claveEnvio = crypto.randomUUID();
    this._envio.set({ tipo: 'submitting', datos });
    this.ejecutarPost(datos);
  }

  reintentarEnvio(): void {
    const estado = this.envio();
    if (estado.tipo !== 'unconfirmed' || estado.recuperacion !== null) return;
    this._envio.set({ ...estado, recuperacion: 'reintento' });
    this.ejecutarPost(estado.datos);
  }

  cargarRecientes(page = this._paginaRecientes()?.page ?? 0): void {
    if (!Number.isSafeInteger(page) || page < 0) return;
    const id = ++this.lecturaRecientes;
    this.peticionRecientes?.unsubscribe();
    this._recientes.update((estado) => ({ ...estado, cargando: true, error: null }));
    this.peticionRecientes = this.api
      .recientes(page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          if (id !== this.lecturaRecientes) return;
          if (pagina.page !== page) {
            this._recientes.update((estado) => ({
              ...estado,
              cargando: false,
              error: mapErrorApi(new RespuestaIncompatible()),
            }));
            return;
          }
          if (page > 0 && page >= pagina.totalPages) {
            this.cargarRecientes(Math.max(0, pagina.totalPages - 1));
            return;
          }
          this._paginaRecientes.set(pagina);
          this._recientes.set({ datos: pagina.content, cargando: false, error: null });
        },
        error: (error: unknown) => {
          if (id === this.lecturaRecientes)
            this._recientes.update((estado) => ({
              ...estado,
              cargando: false,
              error: mapErrorApi(error),
            }));
        },
      });
  }

  cambiarPaginaRecientes(page: number): void {
    const pagina = this._paginaRecientes();
    if (!pagina || this._recientes().cargando || page < 0 || page >= pagina.totalPages) return;
    if (page !== pagina.page) this.cargarRecientes(page);
  }

  consultarPorReferencia(referencia: string): void {
    const id = ++this.lecturaConsulta;
    this.peticionConsulta?.unsubscribe();
    if (!referencia.trim()) {
      this._consulta.set({
        datos: null,
        cargando: false,
        error: { message: 'Escribe una referencia.' },
      });
      return;
    }
    this._consulta.set({ datos: null, cargando: true, error: null });
    this.peticionConsulta = this.api
      .consultar(referencia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          if (id !== this.lecturaConsulta) return;
          this._consulta.set(
            datos.applicationReference === referencia
              ? { datos, cargando: false, error: null }
              : { datos: null, cargando: false, error: mapErrorApi(new RespuestaIncompatible()) },
          );
        },
        error: (error: unknown) => {
          if (id === this.lecturaConsulta)
            this._consulta.set({ datos: null, cargando: false, error: mapErrorApi(error) });
        },
      });
  }

  seleccionarConsulta(resultado: SolicitudResultado): void {
    ++this.lecturaConsulta;
    this.peticionConsulta?.unsubscribe();
    this._consulta.set({ datos: resultado, cargando: false, error: null });
  }

  nuevaSolicitud(): void {
    if (this.envio().tipo === 'submitting' || this.envio().tipo === 'unconfirmed') return;
    ++this.operacion;
    this._envio.set({ tipo: 'idle' });
    this.claveEnvio = null;
    this._revision.update((revision) => revision + 1);
  }

  private ejecutarPost(datos: SolicitudEntrada): void {
    const id = ++this.operacion;
    this.api
      .enviar(datos, this.claveEnvio!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          if (!this.vigente(id)) return;
          const resultado = respuesta.solicitud;
          if (mismosDatos(datos, resultado))
            this.confirmar(datos, resultado, respuesta.httpStatus === 201);
          else this.errorEnvio(datos, new RespuestaIncompatible());
        },
        error: (error: unknown) => {
          if (this.vigente(id)) this.errorEnvio(datos, error);
        },
      });
  }

  private vigente(id: number): boolean {
    return id === this.operacion && this.envio().tipo !== 'resolved';
  }

  private confirmar(
    datos: SolicitudEntrada,
    resultado: SolicitudResultado,
    solicitudNueva: boolean,
  ): void {
    this.claveEnvio = null;
    this._envio.set({ tipo: 'resolved', datos, resultado });
    this._recientes.update((estado) => {
      if (this._paginaRecientes()?.page !== 0 && this._paginaRecientes() !== null) return estado;
      const indice = estado.datos.findIndex(
        (solicitud) => solicitud.applicationReference === resultado.applicationReference,
      );
      if (!solicitudNueva && indice === -1) return estado;
      if (solicitudNueva) {
        return {
          ...estado,
          datos: [
            resultado,
            ...estado.datos.filter(
              (solicitud) => solicitud.applicationReference !== resultado.applicationReference,
            ),
          ].slice(0, this._paginaRecientes()?.size ?? SOLICITUDES_POR_PAGINA),
        };
      }
      const actualizados = [...estado.datos];
      actualizados[indice] = resultado;
      return { ...estado, datos: actualizados };
    });
    this.cargarRecientes(0);
  }

  private conflicto(datos: SolicitudEntrada, error: ErrorUi): void {
    this.claveEnvio = null;
    this._envio.set({ tipo: 'conflict', datos, error });
  }

  private errorEnvio(datos: SolicitudEntrada, error: unknown): void {
    const detalle = mapErrorApi(error);
    if (detalle.status === 409) this.conflicto(datos, detalle);
    else if (detalle.status === 429)
      this._envio.set({ tipo: 'unconfirmed', datos, error: detalle, recuperacion: null });
    else if (detalle.status && detalle.status >= 400 && detalle.status < 500)
      this._envio.set({ tipo: 'invalid', datos, error: detalle });
    else this._envio.set({ tipo: 'unconfirmed', datos, error: detalle, recuperacion: null });
  }
}

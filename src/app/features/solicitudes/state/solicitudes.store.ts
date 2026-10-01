import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { mapErrorApi } from '../api/error-api.mapper';
import { RespuestaIncompatible } from '../api/solicitud-response.parser';
import { SolicitudesApiService } from '../api/solicitudes-api.service';
import {
  EnvioEstado,
  ErrorUi,
  LecturaEstado,
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
  private readonly _consulta = signal<LecturaEstado<SolicitudResultado | null>>({
    datos: null,
    cargando: false,
    error: null,
  });
  private readonly _revision = signal(0);
  private readonly _referenciaEnConflicto = signal<string | null>(null);
  private operacion = 0;
  private lecturaRecientes = 0;
  private lecturaConsulta = 0;
  private peticionRecientes?: Subscription;
  private peticionConsulta?: Subscription;
  private readonly referenciasEnConflicto = new Set<string>();

  readonly envio = this._envio.asReadonly();
  readonly recientes = this._recientes.asReadonly();
  readonly consulta = this._consulta.asReadonly();
  readonly revisionFormulario = this._revision.asReadonly();
  readonly referenciaEnConflicto = this._referenciaEnConflicto.asReadonly();
  readonly edicionBloqueada = computed(() => !['idle', 'invalid'].includes(this.envio().tipo));
  readonly recuperando = computed(() => {
    const estado = this.envio();
    return estado.tipo === 'unconfirmed' && estado.recuperacion !== null;
  });

  enviar(entrada: SolicitudEntrada): void {
    if (this.edicionBloqueada()) return;
    const datos = Object.freeze({
      applicationReference: entrada.applicationReference,
      customerId: entrada.customerId,
      amount: entrada.amount,
      termMonths: entrada.termMonths,
    });
    if (this.referenciasEnConflicto.has(datos.applicationReference)) {
      this._referenciaEnConflicto.set(datos.applicationReference);
      this._envio.set({
        tipo: 'invalid',
        datos,
        error: { message: 'Utiliza otra referencia para una nueva solicitud.' },
      });
      return;
    }
    this._referenciaEnConflicto.set(null);
    this._envio.set({ tipo: 'submitting', datos });
    this.ejecutarPost(datos);
  }

  reintentarEnvio(): void {
    const estado = this.envio();
    if (estado.tipo !== 'unconfirmed' || estado.recuperacion !== null) return;
    this._envio.set({ ...estado, recuperacion: 'reintento' });
    this.ejecutarPost(estado.datos);
  }

  consultarEnvioPendiente(): void {
    const estado = this.envio();
    if (estado.tipo !== 'unconfirmed' || estado.recuperacion !== null) return;
    const id = ++this.operacion;
    this._envio.set({ ...estado, recuperacion: 'consulta' });
    this.api
      .consultar(estado.datos.applicationReference)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          if (!this.vigente(id)) return;
          if (mismosDatos(estado.datos, resultado)) this.confirmar(estado.datos, resultado);
          else
            this.conflicto(estado.datos, {
              message: 'La referencia corresponde a una solicitud con otros datos.',
            });
        },
        error: (error: unknown) => {
          if (!this.vigente(id)) return;
          const detalle = mapErrorApi(error);
          this._envio.set({
            ...estado,
            recuperacion: null,
            error:
              detalle.status === 404
                ? {
                    ...detalle,
                    message:
                      'Aún no se encontró la solicitud. Esto no confirma que el envío haya terminado; puedes reintentar el mismo envío.',
                  }
                : detalle,
          });
        },
      });
  }

  cargarRecientes(): void {
    const id = ++this.lecturaRecientes;
    this.peticionRecientes?.unsubscribe();
    this._recientes.update((estado) => ({ ...estado, cargando: true, error: null }));
    this.peticionRecientes = this.api
      .recientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          if (id === this.lecturaRecientes)
            this._recientes.set({ datos, cargando: false, error: null });
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
    this._referenciaEnConflicto.set(null);
    this._revision.update((revision) => revision + 1);
  }

  private ejecutarPost(datos: SolicitudEntrada): void {
    const id = ++this.operacion;
    this.api
      .enviar(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          if (!this.vigente(id)) return;
          if (mismosDatos(datos, resultado)) this.confirmar(datos, resultado);
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

  private confirmar(datos: SolicitudEntrada, resultado: SolicitudResultado): void {
    this._referenciaEnConflicto.set(null);
    this._envio.set({ tipo: 'resolved', datos, resultado });
    this.cargarRecientes();
  }

  private conflicto(datos: SolicitudEntrada, error: ErrorUi): void {
    this.referenciasEnConflicto.add(datos.applicationReference);
    this._referenciaEnConflicto.set(datos.applicationReference);
    this._envio.set({ tipo: 'conflict', datos, error });
  }

  private errorEnvio(datos: SolicitudEntrada, error: unknown): void {
    const detalle = mapErrorApi(error);
    if (detalle.status === 409) this.conflicto(datos, detalle);
    else if (detalle.status === 400) this._envio.set({ tipo: 'invalid', datos, error: detalle });
    else this._envio.set({ tipo: 'unconfirmed', datos, error: detalle, recuperacion: null });
  }
}

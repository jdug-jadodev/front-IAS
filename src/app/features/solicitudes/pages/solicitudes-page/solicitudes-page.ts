import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { SolicitudResultado as SolicitudResultadoModel } from '../../models/solicitud.model';
import { SolicitudesStore } from '../../state/solicitudes.store';
import { ConsultaResultado } from '../../ui/organisms/consulta-resultado/consulta-resultado';
import { ConsultaReferencia } from '../../ui/organisms/consulta-referencia/consulta-referencia';
import { SolicitudForm } from '../../ui/organisms/solicitud-form/solicitud-form';
import { SolicitudResultado } from '../../ui/organisms/solicitud-resultado/solicitud-resultado';
import { SolicitudesRecientes } from '../../ui/organisms/solicitudes-recientes/solicitudes-recientes';

type VistaInspector = 'formulario' | 'envio' | 'consulta';

@Component({
  selector: 'app-solicitudes-page',
  imports: [
    SolicitudForm,
    SolicitudResultado,
    ConsultaReferencia,
    ConsultaResultado,
    SolicitudesRecientes,
  ],
  providers: [SolicitudesStore],
  templateUrl: './solicitudes-page.html',
  styleUrl: './solicitudes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudesPage implements OnInit {
  protected readonly store = inject(SolicitudesStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly vistaInspector = signal<VistaInspector>('formulario');
  protected readonly tituloInspector = computed(() => {
    switch (this.vistaInspector()) {
      case 'formulario':
        return 'Nueva solicitud';
      case 'envio':
        return 'Resultado de solicitud';
      case 'consulta':
        return 'Detalle de solicitud';
    }
  });
  protected readonly etiquetaAccionPrincipal = computed(() => {
    const estado = this.store.envio().tipo;
    if (estado === 'submitting' || estado === 'unconfirmed') return 'Operación en curso';
    if (estado === 'invalid') return 'Corregir solicitud';
    if (estado === 'idle' && this.vistaInspector() !== 'formulario') return 'Continuar borrador';
    return 'Nueva solicitud';
  });
  protected readonly accionPrincipalBloqueada = computed(() => {
    const estado = this.store.envio().tipo;
    return estado === 'submitting' || estado === 'unconfirmed';
  });
  protected readonly etiquetaRetorno = computed(() =>
    this.store.envio().tipo === 'idle' || this.store.envio().tipo === 'invalid'
      ? 'Volver al borrador'
      : 'Volver al resultado',
  );

  constructor() {
    let estadoAnterior = this.store.envio().tipo;
    effect(() => {
      const estadoActual = this.store.envio().tipo;
      const estadoCambio = estadoActual !== estadoAnterior;
      if (estadoActual === 'invalid') this.vistaInspector.set('formulario');
      else if (estadoActual !== 'idle') this.vistaInspector.set('envio');
      else if (estadoAnterior !== 'idle') this.vistaInspector.set('formulario');
      estadoAnterior = estadoActual;
      if (estadoCambio && estadoActual !== 'idle') this.enfocarInspector();
    });
  }

  ngOnInit(): void {
    this.store.cargarRecientes();
  }

  protected prepararSolicitud(): void {
    if (this.accionPrincipalBloqueada()) return;
    const estado = this.store.envio().tipo;
    if (estado === 'resolved' || estado === 'conflict') this.store.nuevaSolicitud();
    this.vistaInspector.set('formulario');
    queueMicrotask(() =>
      this.host.nativeElement
        .querySelector<HTMLInputElement>('app-solicitud-form:not([hidden]) input')
        ?.focus(),
    );
  }

  protected mostrarConsulta(): void {
    this.vistaInspector.set('consulta');
    this.enfocarInspector();
  }

  protected mostrarSolicitud(solicitud: SolicitudResultadoModel): void {
    this.store.seleccionarConsulta(solicitud);
    this.vistaInspector.set('consulta');
    this.enfocarInspector();
  }

  protected volverAlFlujoPrincipal(): void {
    this.vistaInspector.set(
      this.store.envio().tipo === 'idle' || this.store.envio().tipo === 'invalid'
        ? 'formulario'
        : 'envio',
    );
    this.enfocarInspector();
  }

  private enfocarInspector(): void {
    queueMicrotask(() => {
      const titulo = this.host.nativeElement.querySelector<HTMLElement>('#titulo-inspector');
      titulo?.focus({ preventScroll: true });
      const ventana = this.host.nativeElement.ownerDocument.defaultView;
      if (
        typeof ventana?.matchMedia === 'function' &&
        ventana.matchMedia('(max-width: 49.375rem)').matches
      ) {
        titulo?.scrollIntoView({ block: 'start' });
      }
    });
  }
}

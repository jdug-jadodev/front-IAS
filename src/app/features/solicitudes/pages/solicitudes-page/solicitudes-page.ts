import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  QueryList,
  signal,
  untracked,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SolicitudResultado as SolicitudResultadoModel } from '../../models/solicitud.model';
import { SolicitudesStore } from '../../state/solicitudes.store';
import { ConsultaResultado } from '../../ui/organisms/consulta-resultado/consulta-resultado';
import { ConsultaReferencia } from '../../ui/organisms/consulta-referencia/consulta-referencia';
import { SolicitudForm } from '../../ui/organisms/solicitud-form/solicitud-form';
import { SolicitudResultado } from '../../ui/organisms/solicitud-resultado/solicitud-resultado';
import { SolicitudesRecientes } from '../../ui/organisms/solicitudes-recientes/solicitudes-recientes';

type VistaInspector = 'formulario' | 'envio' | 'consulta';
type EscenaSolicitud = 'monto' | 'plazo' | 'cliente';

interface IlustracionSolicitud {
  readonly escena: EscenaSolicitud;
  readonly src: string;
}

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
export class SolicitudesPage implements OnInit, AfterViewInit {
  protected readonly store = inject(SolicitudesStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  @ViewChildren('imagenEscena')
  private imagenesEscena!: QueryList<ElementRef<HTMLImageElement>>;

  protected readonly vistaInspector = signal<VistaInspector>('formulario');
  protected readonly ilustraciones: readonly IlustracionSolicitud[] = [
    { escena: 'monto', src: 'portatil.png' },
    { escena: 'plazo', src: 'bicicleta.png' },
    { escena: 'cliente', src: 'hogar.png' },
  ];
  protected readonly escenaVisible = signal<EscenaSolicitud>('monto');

  private readonly imagenesPorEscena = new Map<EscenaSolicitud, HTMLImageElement>();
  private readonly imagenLista = new WeakMap<HTMLImageElement, Promise<boolean>>();
  private escenaSolicitada: EscenaSolicitud = 'monto';
  private revisionEscena = 0;
  private cambioPendiente: ReturnType<typeof setTimeout> | null = null;
  private enfoquePendiente: ReturnType<typeof setTimeout> | null = null;
  private movimientoReducido: MediaQueryList | null = null;
  protected readonly etiquetaAccionPrincipal = computed(() => {
    const estado = this.store.envio().tipo;
    if (estado === 'submitting' || estado === 'unconfirmed') return 'Operación en curso';
    if (estado === 'invalid') return 'Corregir solicitud';
    return estado === 'idle' ? 'Completar solicitud' : 'Nueva solicitud';
  });
  protected readonly accionPrincipalBloqueada = computed(() => {
    const estado = this.store.envio().tipo;
    return estado === 'submitting' || estado === 'unconfirmed';
  });
  constructor() {
    let estadoAnterior = this.store.envio().tipo;
    let seleccionInicialRealizada = false;
    effect(() => {
      const estadoActual = this.store.envio().tipo;
      const estadoCambio = estadoActual !== estadoAnterior;
      const entrandoAlComprobante =
        estadoCambio &&
        estadoActual !== 'idle' &&
        estadoActual !== 'invalid' &&
        (estadoAnterior === 'idle' || estadoAnterior === 'invalid');

      if (estadoCambio && estadoActual === 'invalid') {
        this.activarVista('formulario', 'titulo-formulario');
        this.actualizarFragmento('solicitud', true);
      } else if (entrandoAlComprobante) {
        this.activarVista('envio', 'titulo-comprobante');
        this.actualizarFragmento('comprobante');
      } else if (estadoActual !== 'idle' && estadoActual !== 'invalid') {
        this.vistaInspector.set('envio');
      }
      estadoAnterior = estadoActual;
    });
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragmento) => {
      switch (fragmento) {
        case 'consulta':
          this.activarVista('consulta', 'titulo-consulta');
          break;
        case 'recientes':
          this.vistaInspector.set('consulta');
          this.enfocarVista('titulo-recientes');
          break;
        case 'comprobante':
          if (this.store.envio().tipo !== 'idle' && this.store.envio().tipo !== 'invalid') {
            this.activarVista('envio', 'titulo-comprobante');
          } else {
            this.activarVista('formulario', 'titulo-formulario');
          }
          break;
        case 'solicitud':
          this.activarVista('formulario', 'titulo-formulario');
          break;
      }
    });
    effect(() => {
      const recientes = this.store.recientes();
      const consulta = this.store.consulta();
      if (
        seleccionInicialRealizada ||
        recientes.cargando ||
        !recientes.datos.length ||
        consulta.cargando
      ) {
        return;
      }
      seleccionInicialRealizada = true;
      if (!consulta.datos && !consulta.error) {
        untracked(() => this.store.seleccionarConsulta(recientes.datos[0]));
      }
    });
    this.destroyRef.onDestroy(() => {
      this.cancelarCambioPendiente();
      this.cancelarEnfoquePendiente();
      this.movimientoReducido?.removeEventListener('change', this.alCambiarPreferenciaMovimiento);
    });
  }

  ngOnInit(): void {
    this.store.cargarRecientes();
  }

  ngAfterViewInit(): void {
    for (const referencia of this.imagenesEscena) {
      const imagen = referencia.nativeElement;
      const escena = imagen.dataset['escena'];
      if (this.esEscenaSolicitud(escena)) this.imagenesPorEscena.set(escena, imagen);
      void this.asegurarImagenLista(imagen);
    }

    const ventana = this.host.nativeElement.ownerDocument.defaultView;
    if (typeof ventana?.matchMedia !== 'function') return;
    this.movimientoReducido = ventana.matchMedia('(prefers-reduced-motion: reduce)');
    this.movimientoReducido.addEventListener('change', this.alCambiarPreferenciaMovimiento);
  }

  protected cambiarEscenaDesdeFoco(evento: FocusEvent): void {
    const escena = (evento.target as HTMLElement | null)?.dataset?.['escena'];
    if (!this.esEscenaSolicitud(escena)) return;

    this.escenaSolicitada = escena;
    const revision = ++this.revisionEscena;
    this.cancelarCambioPendiente();

    if (this.movimientoReducido?.matches) {
      void this.mostrarEscenaCuandoEsteLista(escena, revision);
      return;
    }

    this.cambioPendiente = setTimeout(() => {
      this.cambioPendiente = null;
      void this.mostrarEscenaCuandoEsteLista(escena, revision);
    }, 200);
  }

  protected prepararSolicitud(): void {
    if (this.accionPrincipalBloqueada()) return;
    const estado = this.store.envio().tipo;
    if (estado === 'resolved' || estado === 'conflict') this.store.nuevaSolicitud();
    this.activarVista('formulario', 'titulo-formulario');
    this.actualizarFragmento('solicitud');
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLInputElement>('#cliente')?.focus(),
    );
  }

  protected mostrarConsulta(): void {
    this.activarVista('consulta', 'titulo-consulta');
    this.actualizarFragmento('consulta');
  }

  protected mostrarSolicitud(solicitud: SolicitudResultadoModel): void {
    this.store.seleccionarConsulta(solicitud);
    if (this.vistaInspector() !== 'consulta') {
      this.activarVista('consulta', 'titulo-consulta');
      this.actualizarFragmento('consulta');
    }
  }

  protected volverAlFlujoPrincipal(): void {
    const estado = this.store.envio().tipo;
    if (estado === 'idle' || estado === 'invalid') {
      this.activarVista('formulario', 'titulo-formulario');
      this.actualizarFragmento('solicitud');
    } else {
      this.activarVista('envio', 'titulo-comprobante');
      this.actualizarFragmento('comprobante');
    }
  }

  private activarVista(vista: VistaInspector, tituloId: string): void {
    if (this.vistaInspector() === vista) return;
    this.vistaInspector.set(vista);
    this.enfocarVista(tituloId);
  }

  private enfocarVista(tituloId: string): void {
    this.cancelarEnfoquePendiente();
    this.enfoquePendiente = setTimeout(() => {
      this.enfoquePendiente = null;
      const titulo = this.host.nativeElement.querySelector<HTMLElement>(`#${tituloId}`);
      if (!titulo) return;
      titulo.focus({ preventScroll: true });
      const pantalla = titulo.closest<HTMLElement>('.pantalla-flujo');
      if (typeof pantalla?.scrollIntoView === 'function') {
        pantalla.scrollIntoView({ block: 'start' });
      }
    }, 0);
  }

  private cancelarEnfoquePendiente(): void {
    if (this.enfoquePendiente === null) return;
    clearTimeout(this.enfoquePendiente);
    this.enfoquePendiente = null;
  }

  private actualizarFragmento(fragmento: string, reemplazar = false): void {
    if (this.route.snapshot.fragment === fragmento) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: fragmento,
      queryParamsHandling: 'preserve',
      replaceUrl: reemplazar,
    });
  }

  private readonly alCambiarPreferenciaMovimiento = (evento: MediaQueryListEvent): void => {
    if (!evento.matches) return;
    this.cancelarCambioPendiente();
    void this.mostrarEscenaCuandoEsteLista(this.escenaSolicitada, this.revisionEscena);
  };

  private cancelarCambioPendiente(): void {
    if (this.cambioPendiente === null) return;
    clearTimeout(this.cambioPendiente);
    this.cambioPendiente = null;
  }

  private async mostrarEscenaCuandoEsteLista(
    escena: EscenaSolicitud,
    revision: number,
  ): Promise<void> {
    const imagen = this.imagenesPorEscena.get(escena);
    if (!imagen || !(await this.asegurarImagenLista(imagen)) || revision !== this.revisionEscena) {
      return;
    }
    this.escenaVisible.set(escena);
  }

  private asegurarImagenLista(imagen: HTMLImageElement): Promise<boolean> {
    const existente = this.imagenLista.get(imagen);
    if (existente) return existente;

    const lista = this.decodificarImagen(imagen);
    this.imagenLista.set(imagen, lista);
    return lista;
  }

  private async decodificarImagen(imagen: HTMLImageElement): Promise<boolean> {
    if (typeof imagen.decode === 'function') {
      try {
        await imagen.decode();
        return imagen.naturalWidth > 0;
      } catch {
        if (imagen.complete) return imagen.naturalWidth > 0;
      }
    }

    if (imagen.complete) return imagen.naturalWidth > 0;

    return new Promise<boolean>((resolver) => {
      const limpiar = (): void => {
        imagen.removeEventListener('load', alCargar);
        imagen.removeEventListener('error', alFallar);
      };
      const alCargar = (): void => {
        limpiar();
        resolver(true);
      };
      const alFallar = (): void => {
        limpiar();
        resolver(false);
      };
      imagen.addEventListener('load', alCargar, { once: true });
      imagen.addEventListener('error', alFallar, { once: true });
    });
  }

  private esEscenaSolicitud(valor: string | undefined): valor is EscenaSolicitud {
    return valor === 'monto' || valor === 'plazo' || valor === 'cliente';
  }
}

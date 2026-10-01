import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SolicitudesStore } from '../../state/solicitudes.store';
import { SolicitudForm } from '../../ui/organisms/solicitud-form/solicitud-form';
import { SolicitudesPage } from './solicitudes-page';

type EscenaSolicitud = 'monto' | 'plazo' | 'cliente';

interface ImagenDiferida {
  readonly promise: Promise<void>;
  readonly resolver: () => void;
}

describe('Página de solicitudes', () => {
  let fixture: ComponentFixture<SolicitudesPage>;
  let http: HttpTestingController;
  let store: SolicitudesStore;
  let imagenesDiferidas: Map<EscenaSolicitud, ImagenDiferida>;
  let descriptorDecode: PropertyDescriptor | undefined;
  let descriptorMatchMedia: PropertyDescriptor | undefined;
  let descriptorScrollIntoView: PropertyDescriptor | undefined;
  let movimientoReducido: boolean;
  let viewportCompacto: boolean;
  let fragmentoRuta: BehaviorSubject<string | null>;
  let router: Router;

  const pagina = (content: unknown[], page = 0, totalElements = content.length) => ({
    content,
    page,
    size: 20,
    totalElements,
    totalPages: Math.ceil(totalElements / 20),
    first: page === 0,
    last: page >= Math.ceil(totalElements / 20) - 1,
  });

  beforeEach(() => {
    movimientoReducido = false;
    viewportCompacto = false;
    fragmentoRuta = new BehaviorSubject<string | null>(null);
    descriptorScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    descriptorMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((consulta: string) => {
        const mediaQuery = {
          get matches(): boolean {
            return consulta === '(prefers-reduced-motion: reduce)'
              ? movimientoReducido
              : viewportCompacto;
          },
          media: consulta,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
        };
        return mediaQuery as MediaQueryList;
      }),
    });
    imagenesDiferidas = new Map(
      (['monto', 'plazo', 'cliente'] as const).map((escena) => {
        let resolver!: () => void;
        const promise = new Promise<void>((resolve) => {
          resolver = resolve;
        });
        return [escena, { promise, resolver }] as const;
      }),
    );
    descriptorDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: vi.fn(function (this: HTMLImageElement) {
        const escena = this.dataset['escena'] as EscenaSolicitud | undefined;
        if (!escena) return Promise.resolve();
        return imagenesDiferidas.get(escena)!.promise.then(() => {
          Object.defineProperty(this, 'naturalWidth', {
            configurable: true,
            value: 1448,
          });
        });
      }),
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            fragment: fragmentoRuta.asObservable(),
            snapshot: { fragment: null },
          },
        },
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(SolicitudesPage);
    http = TestBed.inject(HttpTestingController);
    store = fixture.debugElement.injector.get(SolicitudesStore);
    fixture.detectChanges();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (descriptorDecode) {
      Object.defineProperty(HTMLImageElement.prototype, 'decode', descriptorDecode);
    } else {
      delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
    }
    if (descriptorMatchMedia) {
      Object.defineProperty(window, 'matchMedia', descriptorMatchMedia);
    } else {
      delete (window as Partial<Window>).matchMedia;
    }
    if (descriptorScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', descriptorScrollIntoView);
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    }
    fragmentoRuta.complete();
    http.verify();
  });

  const resolverImagen = (escena: EscenaSolicitud): void =>
    imagenesDiferidas.get(escena)!.resolver();

  const escenaActiva = (): string | undefined =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('.escena-imagen--activa')
      ?.dataset['escena'];

  const enfocarEscena = (id: string): void => {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLInputElement>(`#${id}`)!
      .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  };

  const estabilizarEscena = async (): Promise<void> => {
    for (let paso = 0; paso < 5; paso += 1) await Promise.resolve();
    fixture.detectChanges();
  };

  it('comparte una instancia de estado en los cinco organismos y carga recientes al entrar', () => {
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
    for (const selector of [
      'app-solicitud-form',
      'app-solicitud-resultado',
      'app-consulta-referencia',
      'app-consulta-resultado',
      'app-solicitudes-recientes',
    ]) {
      expect(fixture.debugElement.query(By.css(selector)).injector.get(SolicitudesStore)).toBe(
        store,
      );
    }
    expect(TestBed.inject(SolicitudesStore, null)).toBeNull();
  });

  it('selecciona localmente la primera solicitud sin ocultar el formulario ni hacer otro GET', () => {
    const reciente = {
      applicationReference: 'REF-RECIENTE',
      customerId: 'CLI-1',
      amount: '2500000.00',
      termMonths: 24,
      status: 'APPROVED' as const,
      message: 'Esta solicitud fue aprobada',
      processedAt: '2026-10-01T10:00:00Z',
      reasonCode: null,
      reason: null,
    };
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([reciente]));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(store.consulta().datos).toEqual(reciente);
    expect(element.querySelector('#titulo-formulario')?.textContent).toContain(
      'Solicita tu crédito',
    );
    expect(element.querySelector<HTMLElement>('#solicitud')!.hidden).toBe(false);
    expect(element.querySelector<HTMLElement>('#consulta')!.hidden).toBe(true);
    expect(element.querySelector<HTMLElement>('#comprobante')!.hidden).toBe(true);
    expect(element.querySelector('.accion-hero')?.textContent).toContain('Completar solicitud');
    expect(element.querySelector('[aria-current="true"]')?.textContent).toContain('REF-RECIENTE');
    http.expectNone('/api/applications/REF-RECIENTE');
  });

  it('mantiene el formulario visible si los recientes llegan después de usar el CTA', () => {
    const carga = http.expectOne('/api/applications?page=0&size=20');
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.accion-hero')!.click();
    fixture.detectChanges();

    carga.flush(
      pagina([
        {
          applicationReference: 'REF-TARDIA',
          customerId: 'CLI-1',
          amount: '2500000.00',
          termMonths: 24,
          status: 'APPROVED',
          message: 'Esta solicitud fue aprobada',
          processedAt: '2026-10-01T10:00:00Z',
          reasonCode: null,
          reason: null,
        },
      ]),
    );
    fixture.detectChanges();

    expect(store.consulta().datos?.applicationReference).toBe('REF-TARDIA');
    expect(element.querySelector('#titulo-formulario')?.textContent).toContain(
      'Solicita tu crédito',
    );
    expect(element.querySelector<HTMLElement>('#solicitud')!.hidden).toBe(false);
    expect(element.querySelector('[aria-current="true"]')?.textContent).toContain('REF-TARDIA');
    http.expectNone('/api/applications/REF-TARDIA');
  });

  it('navega por los fragmentos consulta, recientes y solicitud sin recrear componentes ni borrar el borrador', async () => {
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
    const element = fixture.nativeElement as HTMLElement;
    const formularioDebug = fixture.debugElement.query(By.directive(SolicitudForm));
    const formulario = formularioDebug.componentInstance as SolicitudForm;
    const form = (formulario as unknown as { form: FormGroup }).form;
    const controles = new Map(Object.entries(form.controls));
    const componentes = new Map(
      [
        'app-solicitud-form',
        'app-solicitud-resultado',
        'app-consulta-referencia',
        'app-consulta-resultado',
        'app-solicitudes-recientes',
      ].map((selector) => [
        selector,
        fixture.debugElement.query(By.css(selector)).componentInstance,
      ]),
    );
    const escribir = (id: string, valor: string): void => {
      const input = element.querySelector<HTMLInputElement>(`app-solicitud-form #${id}`)!;
      input.value = valor;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    escribir('cliente', 'cli-nav');
    escribir('monto', '9007199254740993.0001');
    escribir('plazo', '24');
    fixture.detectChanges();

    fragmentoRuta.next('consulta');
    fixture.detectChanges();
    await new Promise<void>((resolver) => setTimeout(resolver, 0));
    expect(element.querySelector<HTMLElement>('section#consulta')!.hidden).toBe(false);
    expect(element.querySelector<HTMLElement>('#solicitud')!.hidden).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('#titulo-consulta'));

    fragmentoRuta.next('recientes');
    fixture.detectChanges();
    await new Promise<void>((resolver) => setTimeout(resolver, 0));
    expect(element.querySelector<HTMLElement>('section#consulta')!.hidden).toBe(false);
    expect(document.activeElement).toBe(element.querySelector('#titulo-recientes'));

    fragmentoRuta.next('solicitud');
    fixture.detectChanges();
    await new Promise<void>((resolver) => setTimeout(resolver, 0));
    expect(element.querySelector<HTMLElement>('#solicitud')!.hidden).toBe(false);
    expect(document.activeElement).toBe(element.querySelector('#titulo-formulario'));

    for (const [selector, instancia] of componentes) {
      expect(fixture.debugElement.query(By.css(selector)).componentInstance).toBe(instancia);
    }
    for (const [nombre, control] of controles) expect(form.get(nombre)).toBe(control);
    expect(form.getRawValue()).toEqual({
      customerId: 'CLI-NAV',
      amount: '9007199254740993.0001',
      termMonths: 24,
    });
    expect(form.dirty).toBe(true);
    http.expectNone((request) => request.url.startsWith('/api/'));
  });

  it('mapea el foco de los cuatro campos y espera 200 ms antes de cambiar la escena', async () => {
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
    vi.useFakeTimers();

    expect(escenaActiva()).toBe('monto');
    for (const [id, escena] of [
      ['cliente', 'cliente'],
      ['plazo', 'plazo'],
      ['monto', 'monto'],
    ] as const) {
      const anterior = escenaActiva();
      resolverImagen(escena);
      enfocarEscena(id);

      vi.advanceTimersByTime(199);
      await estabilizarEscena();
      expect(escenaActiva()).toBe(anterior);

      vi.advanceTimersByTime(1);
      await estabilizarEscena();
      expect(escenaActiva()).toBe(escena);
    }

    http.expectNone((request) => request.url.startsWith('/api/'));
  });

  it('cancela el cambio pendiente y hace prevalecer el último foco', async () => {
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
    vi.useFakeTimers();
    resolverImagen('plazo');
    resolverImagen('cliente');

    enfocarEscena('plazo');
    vi.advanceTimersByTime(120);
    enfocarEscena('cliente');
    vi.advanceTimersByTime(80);
    await estabilizarEscena();
    expect(escenaActiva()).toBe('monto');

    vi.advanceTimersByTime(120);
    await estabilizarEscena();
    expect(escenaActiva()).toBe('cliente');
    http.expectNone((request) => request.url.startsWith('/api/'));
  });

  it('conserva la escena previa si una imagen completa no tiene píxeles ni decode', async () => {
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
    vi.useFakeTimers();
    const imagenSinPixeles = document.createElement('img');
    imagenSinPixeles.dataset['escena'] = 'plazo';
    Object.defineProperties(imagenSinPixeles, {
      complete: { configurable: true, value: true },
      naturalWidth: { configurable: true, value: 0 },
      decode: { configurable: true, value: undefined },
    });
    const componente = fixture.componentInstance as unknown as {
      imagenesPorEscena: Map<EscenaSolicitud, HTMLImageElement>;
    };
    componente.imagenesPorEscena.set('plazo', imagenSinPixeles);

    enfocarEscena('plazo');
    vi.advanceTimersByTime(200);
    await estabilizarEscena();

    expect(imagenSinPixeles.complete).toBe(true);
    expect(imagenSinPixeles.naturalWidth).toBe(0);
    expect(imagenSinPixeles.decode).toBeUndefined();
    expect(escenaActiva()).toBe('monto');

    resolverImagen('cliente');
    enfocarEscena('cliente');
    vi.advanceTimersByTime(200);
    await estabilizarEscena();
    expect(escenaActiva()).toBe('cliente');
    http.expectNone((request) => request.url.startsWith('/api/'));
  });

  it('cambiar de escena conserva el mismo formulario, controles y estado de negocio', async () => {
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
    vi.useFakeTimers();
    const element = fixture.nativeElement as HTMLElement;
    const hostFormulario = element.querySelector<HTMLElement>('app-solicitud-form')!;
    const nodoFormulario = hostFormulario.querySelector<HTMLFormElement>('form')!;
    const debugFormulario = fixture.debugElement.query(By.directive(SolicitudForm));
    const instanciaFormulario = debugFormulario.componentInstance as SolicitudForm;
    const form = (instanciaFormulario as unknown as { form: FormGroup }).form;
    const controles = new Map(Object.entries(form.controls));
    const nodos = new Map<string, HTMLInputElement>(
      ['cliente', 'monto', 'plazo'].map((id): [string, HTMLInputElement] => [
        id,
        hostFormulario.querySelector<HTMLInputElement>(`#${id}`)!,
      ]),
    );
    const escribir = (id: string, valor: string): void => {
      const input = nodos.get(id)!;
      input.value = valor;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    };

    escribir('cliente', 'CLI-ESCENA');
    escribir('monto', '9007199254740993.0001');
    escribir('plazo', '24');
    fixture.detectChanges();
    const valores = form.getRawValue();
    const envio = store.envio();
    const consulta = store.consulta();
    const recientes = store.recientes();

    expect(form.dirty).toBe(true);
    expect(form.touched).toBe(true);
    expect(form.enabled).toBe(true);

    resolverImagen('plazo');
    enfocarEscena('plazo');
    vi.advanceTimersByTime(200);
    await estabilizarEscena();

    expect(fixture.debugElement.query(By.directive(SolicitudForm)).componentInstance).toBe(
      instanciaFormulario,
    );
    expect(element.querySelector('app-solicitud-form')).toBe(hostFormulario);
    expect(hostFormulario.querySelector('form')).toBe(nodoFormulario);
    for (const [id, nodo] of nodos) {
      expect(hostFormulario.querySelector(`#${id}`)).toBe(nodo);
    }
    for (const [nombre, control] of controles) {
      expect(form.get(nombre)).toBe(control);
    }
    expect(form.getRawValue()).toEqual(valores);
    expect(form.dirty).toBe(true);
    expect(form.touched).toBe(true);
    expect(form.enabled).toBe(true);
    expect(store.envio()).toBe(envio);
    expect(store.consulta()).toBe(consulta);
    expect(store.recientes()).toBe(recientes);
    http.expectNone((request) => request.url.startsWith('/api/'));
  });

  it.each([
    ['APPROVED' as const, 'Aprobada', 'Esta solicitud fue aprobada'],
    ['REJECTED' as const, 'Rechazada', 'Esta solicitud fue rechazada'],
  ])(
    'al confirmar muestra el comprobante completo antes de responder y conserva allí un resultado %s',
    async (status, etiqueta, message) => {
      http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
      const element = fixture.nativeElement as HTMLElement;
      const instanciaFormulario = fixture.debugElement.query(
        By.directive(SolicitudForm),
      ).componentInstance;
      const escribir = (id: string, valor: string): void => {
        const input = element.querySelector<HTMLInputElement>(`app-solicitud-form #${id}`)!;
        input.value = valor;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      escribir('cliente', 'cli-comprobante');
      escribir('monto', '2500000.00');
      escribir('plazo', '24');
      element
        .querySelector('app-solicitud-form form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(element.querySelector('#titulo-revision')).not.toBeNull();

      element.querySelector<HTMLButtonElement>('.revision-envio .boton-primario')!.click();
      fixture.detectChanges();
      await Promise.resolve();

      const envio = http.expectOne('/api/applications');
      expect(envio.request.method).toBe('POST');
      expect(envio.request.body).toEqual({
        customerId: 'CLI-COMPROBANTE',
        amount: '2500000.00',
        termMonths: 24,
      });
      expect(store.envio().tipo).toBe('submitting');
      expect(element.querySelector<HTMLElement>('#comprobante')!.hidden).toBe(false);
      expect(element.querySelector<HTMLElement>('#comprobante')!.classList).toContain(
        'pantalla-comprobante',
      );
      expect(element.querySelector<HTMLElement>('#solicitud')!.hidden).toBe(true);
      expect(element.querySelector('app-solicitud-resultado')?.textContent).toContain(
        'Enviando solicitud',
      );
      expect(fixture.debugElement.query(By.directive(SolicitudForm)).componentInstance).toBe(
        instanciaFormulario,
      );
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        fragment: 'comprobante',
        queryParamsHandling: 'preserve',
        replaceUrl: false,
      });

      envio.flush(
        {
          ...envio.request.body,
          applicationReference: 'REF-COMPROBANTE',
          status,
          message,
          reasonCode: status === 'REJECTED' ? 'CUSTOMER_NOT_FOUND' : null,
          reason: status === 'REJECTED' ? 'Cliente inexistente.' : null,
          processedAt: '2026-10-01T10:00:00Z',
        },
        { status: 201, statusText: 'Created' },
      );
      http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
      fixture.detectChanges();

      expect(store.envio().tipo).toBe('resolved');
      expect(element.querySelector<HTMLElement>('#comprobante')!.hidden).toBe(false);
      expect(element.querySelector<HTMLElement>('#solicitud')!.hidden).toBe(true);
      expect(element.querySelector('app-solicitud-resultado')?.textContent).toContain(etiqueta);
      expect(element.querySelector('app-solicitud-resultado')?.textContent).toContain(message);
    },
  );

  it('cancela las lecturas pendientes al destruir la página', () => {
    const req = http.expectOne('/api/applications?page=0&size=20');
    fixture.destroy();
    expect(req.cancelled).toBe(true);
  });

  it('muestra el buscador y la tarjeta de detalle juntos, consulta en mayúsculas y no roba el foco al repetir', async () => {
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([]));
    const element = fixture.nativeElement as HTMLElement;
    fragmentoRuta.next('consulta');
    fixture.detectChanges();
    await new Promise<void>((resolver) => setTimeout(resolver, 0));

    const pantalla = element.querySelector<HTMLElement>('section#consulta')!;
    const buscador = pantalla.querySelector<HTMLElement>('.consulta-buscador')!;
    const detalle = pantalla.querySelector<HTMLElement>('.consulta-detalle')!;
    const input = buscador.querySelector<HTMLInputElement>('input#referencia-consulta')!;
    const form = buscador.querySelector<HTMLFormElement>('form')!;
    expect(pantalla.hidden).toBe(false);
    expect(buscador.querySelector('app-consulta-referencia')).not.toBeNull();
    expect(detalle.querySelector('app-consulta-resultado')).not.toBeNull();

    input.focus();
    input.value = 'r/ñ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('R/Ñ');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne(`/api/applications/${encodeURIComponent('R/Ñ')}`).flush(
      {
        code: 'APPLICATION_NOT_FOUND',
        message: 'No se encontró la solicitud.',
        traceId: 'trace-404',
      },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();
    await Promise.resolve();
    expect(document.activeElement).toBe(input);
    expect(detalle.textContent).toContain('No se encontró');
    expect(detalle.textContent).not.toContain('APPLICATION_NOT_FOUND');
    expect(detalle.textContent).not.toContain('trace-404');

    input.value = 'segunda';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne('/api/applications/SEGUNDA').flush({
      applicationReference: 'SEGUNDA',
      customerId: 'CLI-2',
      amount: '100.00',
      termMonths: 12,
      status: 'APPROVED',
      message: 'Esta solicitud fue aprobada',
      processedAt: '2026-10-01T10:00:00Z',
      reasonCode: null,
      reason: null,
    });
    fixture.detectChanges();
    await Promise.resolve();

    expect(input.value).toBe('SEGUNDA');
    expect(document.activeElement).toBe(input);
    expect(detalle.textContent).toContain('SEGUNDA');
    expect(pantalla.hidden).toBe(false);
  });

  it('selecciona una solicitud reciente localmente y muestra su detalle sin otro GET', async () => {
    const recientes = [
      {
        applicationReference: 'REF-PRIMERA',
        customerId: 'CLI-1',
        amount: '100.00',
        termMonths: 12,
        status: 'APPROVED' as const,
        message: 'Esta solicitud fue aprobada',
        processedAt: '2026-10-01T10:00:00Z',
        reasonCode: null,
        reason: null,
      },
      {
        applicationReference: 'REF-SEGUNDA',
        customerId: 'CLI-2',
        amount: '200.00',
        termMonths: 24,
        status: 'REJECTED' as const,
        message: 'Esta solicitud fue rechazada',
        processedAt: '2026-10-01T11:00:00Z',
        reasonCode: 'CUSTOMER_BLOCKED',
        reason: 'Política de crédito.',
      },
    ];
    http.expectOne('/api/applications?page=0&size=20').flush(pagina(recientes));
    fixture.detectChanges();
    fragmentoRuta.next('recientes');
    fixture.detectChanges();
    await Promise.resolve();
    const element = fixture.nativeElement as HTMLElement;
    const filas = element.querySelectorAll<HTMLButtonElement>('.fila-solicitud');

    filas[1].click();
    fixture.detectChanges();

    expect(store.consulta().datos).toEqual(recientes[1]);
    expect(element.querySelector('.consulta-detalle')?.textContent).toContain('REF-SEGUNDA');
    expect(element.querySelector('.consulta-detalle')?.textContent).toContain(
      'Política de crédito.',
    );
    expect(element.querySelector('.consulta-detalle')?.textContent).not.toContain(
      'CUSTOMER_BLOCKED',
    );
    expect(filas[1].getAttribute('aria-current')).toBe('true');
    expect(element.querySelector<HTMLElement>('section#consulta')!.hidden).toBe(false);
    http.expectNone('/api/applications/REF-SEGUNDA');
  });

  it('muestra el total y permite recorrer páginas de hasta 20 solicitudes', () => {
    http.expectOne('/api/applications?page=0&size=20').flush(pagina([], 0, 21));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const controles = () =>
      element.querySelectorAll<HTMLButtonElement>(
        'nav[aria-label="Páginas de solicitudes"] button',
      );
    expect(element.querySelector('.contador')?.textContent).toContain('21');
    expect(
      element.querySelector('nav[aria-label="Páginas de solicitudes"]')?.textContent,
    ).toContain('Página 1 de 2');
    expect(controles()[0].disabled).toBe(true);
    controles()[1].click();
    http.expectOne('/api/applications?page=1&size=20').flush(pagina([], 1, 21));
    fixture.detectChanges();
    expect(
      element.querySelector('nav[aria-label="Páginas de solicitudes"]')?.textContent,
    ).toContain('Página 2 de 2');
    expect(controles()[1].disabled).toBe(true);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SolicitudesStore } from '../../state/solicitudes.store';
import { SolicitudesPage } from './solicitudes-page';

describe('Página de solicitudes', () => {
  let fixture: ComponentFixture<SolicitudesPage>;
  let http: HttpTestingController;
  let store: SolicitudesStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(SolicitudesPage);
    http = TestBed.inject(HttpTestingController);
    store = fixture.debugElement.injector.get(SolicitudesStore);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('comparte una instancia de estado en los cuatro organismos y carga recientes al entrar', () => {
    http.expectOne('/api/applications?limit=20').flush([]);
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

  it('abre el detalle de la primera solicitud real sin hacer otro GET', () => {
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
    http.expectOne('/api/applications?limit=20').flush([reciente]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(store.consulta().datos).toEqual(reciente);
    expect(element.querySelector('#titulo-inspector')?.textContent).toContain(
      'Detalle de solicitud',
    );
    expect(element.querySelector('app-consulta-resultado')?.hasAttribute('hidden')).toBe(false);
    expect(element.querySelector('.accion-masthead')?.textContent).toContain('Nueva solicitud');
    expect(element.querySelector('.encabezado-inspector .boton-texto')).toBeNull();
    http.expectNone('/api/applications/REF-RECIENTE');
  });

  it('no selecciona un registro oculto si el usuario abre antes el formulario', () => {
    const carga = http.expectOne('/api/applications?limit=20');
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.accion-masthead')!.click();
    fixture.detectChanges();

    carga.flush([
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
    ]);
    fixture.detectChanges();

    expect(store.consulta().datos).toBeNull();
    expect(element.querySelector('app-solicitud-form')?.hasAttribute('hidden')).toBe(false);
    expect(element.querySelector('[aria-current="true"]')).toBeNull();
  });

  it('muestra un 201 rechazado como rechazo y mantiene independientes las consultas', () => {
    http.expectOne('/api/applications?limit=20').flush([]);
    store.enviar({ applicationReference: 'r', customerId: 'c', amount: '1.00', termMonths: 12 });
    const req = http.expectOne('/api/applications');
    req.flush(
      {
        ...req.request.body,
        status: 'REJECTED',
        message: 'Esta solicitud fue rechazada',
        reasonCode: 'CUSTOMER_NOT_FOUND',
        reason: 'Cliente inexistente.',
        processedAt: '2026-10-01T10:00:00Z',
      },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne('/api/applications?limit=20').flush([]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-solicitud-resultado')?.textContent).toContain('Rechazada');
    expect(element.querySelector('app-solicitud-resultado')?.textContent).toContain(
      'Esta solicitud fue rechazada',
    );
    const input = element.querySelector<HTMLInputElement>('#consulta')!;
    input.value = 'r/ñ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    element
      .querySelector('app-consulta-referencia form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http
      .expectOne(`/api/applications/${encodeURIComponent('r/ñ')}`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(element.querySelector('app-consulta-resultado')?.textContent).toContain(
      'No se encontró',
    );
    expect(store.envio().tipo).toBe('resolved');
    expect(store.edicionBloqueada()).toBe(true);
  });

  it('cancela las lecturas pendientes al destruir la página', () => {
    const req = http.expectOne('/api/applications?limit=20');
    fixture.destroy();
    expect(req.cancelled).toBe(true);
  });

  it('conserva el borrador y devuelve el foco al volver de una consulta', async () => {
    http.expectOne('/api/applications?limit=20').flush([]);
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.accion-masthead')!.click();
    fixture.detectChanges();
    const escribir = (id: string, value: string) => {
      const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    escribir('referencia', 'BORRADOR-1');
    escribir('cliente', 'CLI-BORRADOR');
    escribir('monto', '9007199254740993.0001');
    escribir('plazo', '24');
    escribir('consulta', 'REF-CONSULTADA');

    element
      .querySelector('app-consulta-referencia form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne('/api/applications/REF-CONSULTADA').flush({
      applicationReference: 'REF-CONSULTADA',
      customerId: 'CLI-1',
      amount: '100.00',
      termMonths: 12,
      status: 'APPROVED',
      message: 'Esta solicitud fue aprobada',
      processedAt: '2026-10-01T10:00:00Z',
      reasonCode: null,
      reason: null,
    });
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.encabezado-inspector .boton-texto')!.click();
    fixture.detectChanges();
    await Promise.resolve();

    expect(element.querySelector<HTMLInputElement>('#referencia')!.value).toBe('BORRADOR-1');
    expect(element.querySelector<HTMLInputElement>('#cliente')!.value).toBe('CLI-BORRADOR');
    expect(element.querySelector<HTMLInputElement>('#monto')!.value).toBe('9007199254740993.0001');
    expect(element.querySelector<HTMLInputElement>('#plazo')!.value).toBe('24');
    expect(document.activeElement).toBe(element.querySelector('#titulo-inspector'));
  });

  it('lleva el foco al detalle después de consultar una referencia', async () => {
    http.expectOne('/api/applications?limit=20').flush([]);
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#consulta')!;
    input.value = 'REF-FOCO';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    element
      .querySelector('app-consulta-referencia form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne('/api/applications/REF-FOCO').flush({
      applicationReference: 'REF-FOCO',
      customerId: 'CLI-1',
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

    expect(document.activeElement).toBe(element.querySelector('#titulo-inspector'));
  });
});

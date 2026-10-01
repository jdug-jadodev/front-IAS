import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { ConsultaReferencia } from './consulta-referencia';

describe('Consulta por referencia', () => {
  let fixture: ComponentFixture<ConsultaReferencia>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SolicitudesStore],
    });
    fixture = TestBed.createComponent(ConsultaReferencia);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('normaliza teclado y pegado antes de consultar una referencia', () => {
    const input = element.querySelector<HTMLInputElement>('#referencia-consulta')!;
    let consultasSolicitadas = 0;
    fixture.componentInstance.consultaSolicitada.subscribe(() => consultasSolicitadas++);

    input.value = 'ref-ñ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('REF-Ñ');
    expect(input.getAttribute('autocapitalize')).toBe('characters');

    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const req = http.expectOne(`/api/applications/${encodeURIComponent('REF-Ñ')}`);
    expect(req.request.method).toBe('GET');
    expect(consultasSolicitadas).toBe(1);
    req.flush({
      applicationReference: 'REF-Ñ',
      customerId: 'CLI-1',
      amount: '100.00',
      termMonths: 12,
      status: 'APPROVED',
      message: 'Esta solicitud fue aprobada',
      processedAt: '2026-10-01T10:00:00Z',
      reasonCode: null,
      reason: null,
    });
  });

  it('normaliza defensivamente el valor programático antes del GET', () => {
    const instancia = fixture.componentInstance as unknown as {
      referencia: FormControl<string>;
    };
    instancia.referencia.setValue('ref-programada', { emitModelToViewChange: false });

    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(instancia.referencia.value).toBe('REF-PROGRAMADA');
    expect(element.querySelector<HTMLInputElement>('#referencia-consulta')!.value).toBe(
      'REF-PROGRAMADA',
    );
    http.expectOne('/api/applications/REF-PROGRAMADA').flush({
      applicationReference: 'REF-PROGRAMADA',
      customerId: 'CLI-1',
      amount: '100.00',
      termMonths: 12,
      status: 'APPROVED',
      message: 'Esta solicitud fue aprobada',
      processedAt: '2026-10-01T10:00:00Z',
      reasonCode: null,
      reason: null,
    });
  });

  it('mantiene la validación y devuelve el foco sin hacer una petición', async () => {
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await Promise.resolve();

    expect(element.querySelector('#referencia-consulta-error')?.textContent).toContain('Escribe');
    expect(document.activeElement).toBe(element.querySelector('#referencia-consulta'));
    http.expectNone((request) => request.url.startsWith('/api/'));
  });
});

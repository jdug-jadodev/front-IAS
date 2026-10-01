import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { SolicitudForm } from './solicitud-form';

describe('Formulario de solicitud', () => {
  let fixture: ComponentFixture<SolicitudForm>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SolicitudesStore],
    });
    fixture = TestBed.createComponent(SolicitudForm);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function escribir(id: string, value: string) {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('muestra errores vinculados a los campos y no envía un formulario vacío', () => {
    expect(element.querySelector('#referencia-error')?.textContent).toBe('');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    expect(element.querySelector('#referencia')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#referencia-error')?.textContent).toContain('Escribe');
    http.expectNone('/api/applications');
  });

  it('envía una sola vez el texto exacto y restablece el formulario solo por acción explícita', () => {
    escribir('referencia', ' Ref-ñ ');
    escribir('cliente', 'c');
    escribir('monto', '9007199254740993.0001');
    escribir('plazo', '6');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    const req = http.expectOne('/api/applications');
    expect(req.request.body).toEqual({
      applicationReference: ' Ref-ñ ',
      customerId: 'c',
      amount: '9007199254740993.0001',
      termMonths: 6,
    });
    expect(element.querySelector<HTMLInputElement>('#monto')!.disabled).toBe(true);
    req.flush(
      {
        ...req.request.body,
        status: 'REJECTED',
        reasonCode: 'CUSTOMER_NOT_FOUND',
        reason: 'Cliente inexistente.',
        processedAt: '2026-10-01T10:00:00Z',
      },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne('/api/applications?limit=20').flush([]);
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#monto')!.disabled).toBe(true);
    TestBed.inject(SolicitudesStore).nuevaSolicitud();
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#monto')!.value).toBe('');
    expect(element.querySelector<HTMLInputElement>('#monto')!.disabled).toBe(false);
  });
});

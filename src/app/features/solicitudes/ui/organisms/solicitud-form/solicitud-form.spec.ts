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

  it('muestra errores vinculados, enfoca el primero y no envía un formulario vacío', async () => {
    expect(element.querySelector('#referencia-error')?.textContent).toBe('');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await Promise.resolve();
    expect(element.querySelector('#referencia')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#referencia-error')?.textContent).toContain('Escribe');
    expect(document.activeElement).toBe(element.querySelector('#referencia'));
    http.expectNone('/api/applications');
  });

  it('revisa y envía una sola vez el texto exacto antes de bloquear el formulario', () => {
    escribir('referencia', ' Ref-ñ ');
    escribir('cliente', 'c');
    escribir('monto', '9007199254740993.0001');
    escribir('plazo', '6');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    http.expectNone('/api/applications');
    expect(element.querySelector('.revision-envio')?.textContent).toContain(
      '$9.007.199.254.740.993,0001 COP',
    );
    const confirmar = element.querySelector<HTMLButtonElement>('.boton-primario')!;
    confirmar.click();
    confirmar.click();
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

  it('permite editar la revisión sin perder los datos', async () => {
    escribir('referencia', 'REV-EDITAR');
    escribir('cliente', 'CLI-7');
    escribir('monto', '1500.25');
    escribir('plazo', '18');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();

    expect(element.querySelector('#referencia')).toBeNull();
    element.querySelectorAll<HTMLButtonElement>('.revision-envio button')[1].click();
    fixture.detectChanges();
    await Promise.resolve();

    expect(element.querySelector<HTMLInputElement>('#referencia')!.value).toBe('REV-EDITAR');
    expect(element.querySelector<HTMLInputElement>('#monto')!.value).toBe('1500.25');
    expect(document.activeElement).toBe(element.querySelector('#referencia'));
    http.expectNone('/api/applications');
  });

  it('protege un borrador modificado antes de descartarlo', () => {
    escribir('referencia', 'BORRADOR');
    element.querySelectorAll<HTMLButtonElement>('.acciones button')[1].click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('#referencia')!.value).toBe('BORRADOR');
    expect(element.querySelector('.confirmacion-descarte')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('.boton-peligro')!.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('#referencia')!.value).toBe('');
  });
});

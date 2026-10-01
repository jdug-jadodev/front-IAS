import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
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
    expect(element.querySelector('#cliente-error')?.textContent).toBe('');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await Promise.resolve();
    expect(element.querySelector('#cliente')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#cliente-error')?.textContent).toContain('Escribe');
    expect(document.activeElement).toBe(element.querySelector('#cliente'));
    http.expectNone('/api/applications');
  });

  it('normaliza identificadores y envía una sola vez el texto exacto antes de bloquear', () => {
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
      customerId: 'C',
      amount: '9007199254740993.0001',
      termMonths: 6,
    });
    expect(req.request.body).not.toHaveProperty('applicationReference');
    expect(req.request.headers.get('Idempotency-Key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(element.querySelector<HTMLInputElement>('#monto')!.disabled).toBe(true);
    req.flush(
      {
        ...req.request.body,
        applicationReference: 'REF-001',
        status: 'REJECTED',
        message: 'Esta solicitud fue rechazada',
        reasonCode: 'CUSTOMER_NOT_FOUND',
        reason: 'Cliente inexistente.',
        processedAt: '2026-10-01T10:00:00Z',
      },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne('/api/applications?page=0&size=20').flush({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    });
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#monto')!.disabled).toBe(true);
    TestBed.inject(SolicitudesStore).nuevaSolicitud();
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#monto')!.value).toBe('');
    expect(element.querySelector<HTMLInputElement>('#monto')!.disabled).toBe(false);
  });

  it('normaliza el identificador del cliente durante teclado y composicion', () => {
    const cliente = element.querySelector<HTMLInputElement>('#cliente')!;
    cliente.value = 'cli-7';
    cliente.dispatchEvent(new Event('input', { bubbles: true }));
    expect(cliente.value).toBe('CLI-7');

    cliente.dispatchEvent(new Event('compositionstart', { bubbles: true }));
    cliente.value = 'mezcla';
    cliente.dispatchEvent(new Event('input', { bubbles: true }));
    expect(cliente.value).toBe('mezcla');
    cliente.dispatchEvent(new Event('compositionend', { bubbles: true }));
    expect(cliente.value).toBe('MEZCLA');
  });

  it('normaliza valores programaticos y envia solo tres campos', () => {
    const instancia = fixture.componentInstance as unknown as {
      form: {
        controls: {
          customerId: FormControl<string>;
          amount: FormControl<string>;
          termMonths: FormControl<number | null>;
        };
      };
    };
    instancia.form.controls.customerId.setValue('cli-programado', { emitModelToViewChange: false });
    instancia.form.controls.amount.setValue('100.001');
    instancia.form.controls.termMonths.setValue(24);
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(element.querySelector('.revision-envio')?.textContent).toContain('CLI-PROGRAMADO');
    element.querySelector<HTMLButtonElement>('.revision-envio .boton-primario')!.click();
    const req = http.expectOne('/api/applications');
    expect(req.request.body).toEqual({
      customerId: 'CLI-PROGRAMADO',
      amount: '100.001',
      termMonths: 24,
    });
    req.flush(
      {
        ...req.request.body,
        applicationReference: 'REF-002',
        status: 'APPROVED',
        message: 'Esta solicitud fue aprobada',
        reasonCode: null,
        reason: null,
        processedAt: '2026-10-01T10:00:00Z',
      },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne('/api/applications?page=0&size=20').flush({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    });
  });

  it('permite editar la revision sin perder los tres datos', async () => {
    escribir('cliente', 'CLI-7');
    escribir('monto', '1500.25');
    escribir('plazo', '18');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await Promise.resolve();

    expect(element.querySelector('#cliente')).toBeNull();
    expect(document.activeElement).toBe(element.querySelector('#titulo-revision'));
    element.querySelectorAll<HTMLButtonElement>('.revision-envio button')[1].click();
    fixture.detectChanges();
    await Promise.resolve();

    expect(element.querySelector<HTMLInputElement>('#cliente')!.value).toBe('CLI-7');
    expect(element.querySelector<HTMLInputElement>('#monto')!.value).toBe('1500.25');
    expect(document.activeElement).toBe(element.querySelector('#cliente'));
    http.expectNone('/api/applications');
  });

  it('protege un borrador modificado y devuelve el foco despues de descartarlo', async () => {
    escribir('cliente', 'BORRADOR');
    element.querySelectorAll<HTMLButtonElement>('.acciones button')[1].click();
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#cliente')!.value).toBe('BORRADOR');
    element.querySelector<HTMLButtonElement>('.boton-peligro')!.click();
    fixture.detectChanges();
    await Promise.resolve();
    expect(element.querySelector<HTMLInputElement>('#cliente')!.value).toBe('');
    expect(document.activeElement).toBe(element.querySelector('#cliente'));
  });
});

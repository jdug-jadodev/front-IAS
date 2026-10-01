import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RespuestaIncompatible } from './solicitud-response.parser';
import { SolicitudesApiService } from './solicitudes-api.service';

describe('SolicitudesApiService', () => {
  let api: SolicitudesApiService;
  let http: HttpTestingController;

  const entrada = {
    customerId: 'CLI-API',
    amount: '9007199254740993.0001',
    termMonths: 24,
  };
  const respuesta = {
    ...entrada,
    applicationReference: 'REF-API',
    status: 'APPROVED' as const,
    message: 'Esta solicitud fue aprobada',
    processedAt: '2026-10-01T15:00:00Z',
    reasonCode: null,
    reason: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SolicitudesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía JSON con el monto textual y conserva el HTTP 201', () => {
    let resultado: unknown;
    api
      .enviar(entrada, '83b36c7f-6a2f-466a-8581-d9ac7f655038')
      .subscribe((value) => (resultado = value));

    const request = http.expectOne('/api/applications');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(entrada);
    expect(request.request.headers.get('Idempotency-Key')).toBe(
      '83b36c7f-6a2f-466a-8581-d9ac7f655038',
    );
    expect(request.request.body).not.toHaveProperty('applicationReference');
    expect(typeof request.request.body.amount).toBe('string');
    expect(request.request.detectContentTypeHeader()).toBe('application/json');
    request.flush(respuesta, { status: 201, statusText: 'Created' });

    expect(resultado).toEqual({ httpStatus: 201, solicitud: respuesta });
  });

  it('conserva el HTTP 200 y el mensaje de un reintento idéntico', () => {
    let resultado: unknown;
    api
      .enviar(entrada, '83b36c7f-6a2f-466a-8581-d9ac7f655038')
      .subscribe((value) => (resultado = value));
    const reiterada = { ...respuesta, message: 'Esta solicitud ya fue aprobada' };

    http.expectOne('/api/applications').flush(reiterada, { status: 200, statusText: 'OK' });

    expect(resultado).toEqual({ httpStatus: 200, solicitud: reiterada });
  });

  it('rechaza un status exitoso distinto de 200 o 201', () => {
    let error: unknown;
    api
      .enviar(entrada, '83b36c7f-6a2f-466a-8581-d9ac7f655038')
      .subscribe({ error: (value: unknown) => (error = value) });

    http.expectOne('/api/applications').flush(respuesta, { status: 202, statusText: 'Accepted' });

    expect(error).toBeInstanceOf(RespuestaIncompatible);
  });

  it('codifica la referencia como un único segmento de URL', () => {
    api.consultar('REF / ñ').subscribe();

    const request = http.expectOne(`/api/applications/${encodeURIComponent('REF / ñ')}`);
    expect(request.request.method).toBe('GET');
    request.flush(respuesta);
  });

  it('solicita hasta veinte operaciones y conserva los metadatos de la página', () => {
    let resultado: unknown;
    api.recientes().subscribe((value) => (resultado = value));

    const request = http.expectOne('/api/applications?page=0&size=20');
    expect(request.request.method).toBe('GET');
    request.flush({
      content: [respuesta],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });

    expect(resultado).toEqual({
      content: [respuesta],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });
  });

  it('consulta otra página con un máximo de 20 solicitudes', () => {
    api.recientes(2).subscribe();
    const request = http.expectOne('/api/applications?page=2&size=20');
    expect(request.request.method).toBe('GET');
    request.flush({
      content: [],
      page: 2,
      size: 20,
      totalElements: 21,
      totalPages: 2,
      first: false,
      last: true,
    });
  });
});

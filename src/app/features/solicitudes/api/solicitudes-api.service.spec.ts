import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SolicitudesApiService } from './solicitudes-api.service';

describe('SolicitudesApiService', () => {
  let api: SolicitudesApiService;
  let http: HttpTestingController;

  const entrada = {
    applicationReference: 'REF-API',
    customerId: 'CLI-API',
    amount: '9007199254740993.0001',
    termMonths: 24,
  };
  const respuesta = {
    ...entrada,
    status: 'APPROVED' as const,
    processedAt: '2026-10-01T10:00:00-05:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SolicitudesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía el monto como texto exacto y acepta un 201 según el status del cuerpo', () => {
    let resultado: unknown;
    api.enviar(entrada).subscribe((value) => (resultado = value));

    const request = http.expectOne('/api/applications');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(entrada);
    expect(typeof request.request.body.amount).toBe('string');
    request.flush(respuesta, { status: 201, statusText: 'Created' });

    expect(resultado).toEqual(respuesta);
  });

  it('codifica la referencia como un único segmento de URL', () => {
    api.consultar('REF / ñ').subscribe();

    const request = http.expectOne(`/api/applications/${encodeURIComponent('REF / ñ')}`);
    expect(request.request.method).toBe('GET');
    request.flush(respuesta);
  });

  it('solicita las 20 operaciones recientes como un array', () => {
    let resultado: unknown;
    api.recientes().subscribe((value) => (resultado = value));

    const request = http.expectOne('/api/applications?limit=20');
    expect(request.request.method).toBe('GET');
    request.flush([respuesta]);

    expect(resultado).toEqual([respuesta]);
  });
});

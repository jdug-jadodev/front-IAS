import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SolicitudesStore } from './solicitudes.store';

describe('SolicitudesStore', () => {
  const url = '/api/applications';
  const datos = {
    applicationReference: 'Ref / ñ',
    customerId: 'c',
    amount: '1.00',
    termMonths: 12,
  };
  const resultado = { ...datos, status: 'APPROVED', processedAt: '2026-10-01T10:00:00Z' };
  let store: SolicitudesStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SolicitudesStore],
    });
    store = TestBed.inject(SolicitudesStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('produce un solo POST activo y mantiene bloqueada la edición', () => {
    store.enviar(datos);
    store.enviar(datos);
    expect(store.edicionBloqueada()).toBe(true);
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    req.flush(resultado, { status: 201, statusText: 'Created' });
    http.expectOne(`${url}?limit=20`).flush([]);
    expect(store.envio().tipo).toBe('resolved');
    store.enviar(datos);
    http.expectNone(url);
  });

  it('conserva el cuerpo original y excluye recuperaciones simultáneas', () => {
    const borrador = { ...datos };
    store.enviar(borrador);
    borrador.amount = '999';
    http.expectOne(url).error(new ProgressEvent('error'));
    store.nuevaSolicitud();
    expect(store.envio().tipo).toBe('unconfirmed');
    store.reintentarEnvio();
    store.reintentarEnvio();
    store.consultarEnvioPendiente();
    const req = http.expectOne(url);
    expect(req.request.body).toEqual(datos);
    expect(store.recuperando()).toBe(true);
    req.flush(resultado);
    http.expectOne(`${url}?limit=20`).flush([]);
    expect(store.envio().tipo).toBe('resolved');
  });

  it('recupera por referencia y un fallo del listado no altera el resultado', () => {
    store.enviar(datos);
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    store.consultarEnvioPendiente();
    store.reintentarEnvio();
    const req = http.expectOne(`${url}/${encodeURIComponent(datos.applicationReference)}`);
    expect(req.request.method).toBe('GET');
    req.flush({ ...resultado, amount: '1' });
    http.expectOne(`${url}?limit=20`).flush({}, { status: 500, statusText: 'Error' });
    expect(store.envio().tipo).toBe('resolved');
    expect(store.recientes().error).not.toBeNull();
    http.expectNone((request) => request.method === 'POST');
  });
});

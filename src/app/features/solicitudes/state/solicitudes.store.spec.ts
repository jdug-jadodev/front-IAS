import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SolicitudesApiService } from '../api/solicitudes-api.service';
import { RespuestaEnvioSolicitud } from '../models/solicitud.model';
import { SolicitudesStore } from './solicitudes.store';

describe('SolicitudesStore', () => {
  const url = '/api/applications';
  const datos = {
    customerId: 'c',
    amount: '1.00',
    termMonths: 12,
  };
  const resultado = {
    ...datos,
    applicationReference: 'REF-001',
    status: 'APPROVED' as const,
    message: 'Esta solicitud fue aprobada',
    processedAt: '2026-10-01T10:00:00Z',
    reasonCode: null,
    reason: null,
  };
  const pagina = (content: unknown[], page = 0, totalElements = content.length) => ({
    content,
    page,
    size: 20,
    totalElements,
    totalPages: Math.ceil(totalElements / 20),
    first: page === 0,
    last: page >= Math.ceil(totalElements / 20) - 1,
  });
  let store: SolicitudesStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SolicitudesStore],
    });
    store = TestBed.inject(SolicitudesStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    http.verify();
  });

  it('produce un solo POST activo y mantiene bloqueada la edición', () => {
    store.enviar(datos);
    store.enviar(datos);
    expect(store.edicionBloqueada()).toBe(true);
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    expect(req.request.headers.get('Idempotency-Key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    req.flush(resultado, { status: 201, statusText: 'Created' });
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([]));
    expect(store.envio().tipo).toBe('resolved');
    store.enviar(datos);
    http.expectNone(url);
  });

  it('reintenta con la misma clave y los mismos tres datos tras perder la respuesta', () => {
    store.enviar(datos);
    const primero = http.expectOne(url);
    const clave = primero.request.headers.get('Idempotency-Key');
    primero.error(new ProgressEvent('error'));
    expect(store.envio().tipo).toBe('unconfirmed');

    store.reintentarEnvio();
    store.reintentarEnvio();
    const reintento = http.expectOne(url);
    expect(reintento.request.headers.get('Idempotency-Key')).toBe(clave);
    expect(reintento.request.body).toEqual(datos);
    reintento.flush(resultado, { status: 200, statusText: 'OK' });
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([]));
    expect(store.envio().tipo).toBe('resolved');
  });

  it('conserva la clave al reintentar después de un 429', () => {
    store.enviar(datos);
    const primero = http.expectOne(url);
    const clave = primero.request.headers.get('Idempotency-Key');
    primero.flush(
      { code: 'RATE_LIMIT_EXCEEDED', message: 'Espera antes de reintentar' },
      { status: 429, statusText: 'Too Many Requests' },
    );
    expect(store.envio().tipo).toBe('unconfirmed');
    store.reintentarEnvio();
    const reintento = http.expectOne(url);
    expect(reintento.request.headers.get('Idempotency-Key')).toBe(clave);
    reintento.flush(resultado, { status: 201, statusText: 'Created' });
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([]));
  });

  it('genera otra clave para una solicitud nueva aunque los datos sean iguales', () => {
    store.enviar(datos);
    const primera = http.expectOne(url);
    const claveInicial = primera.request.headers.get('Idempotency-Key');
    primera.flush(resultado, { status: 201, statusText: 'Created' });
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([resultado]));

    store.nuevaSolicitud();
    store.enviar(datos);
    const segunda = http.expectOne(url);
    expect(segunda.request.headers.get('Idempotency-Key')).not.toBe(claveInicial);
    segunda.flush(
      { ...resultado, applicationReference: 'REF-002' },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([]));
  });

  it('permite corregir después de un 400', () => {
    store.enviar(datos);
    http.expectOne(url).flush(
      {
        code: 'INVALID_APPLICATION_DATA',
        message: 'El plazo de la solicitud es obligatorio',
        traceId: 'trace-400',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(store.envio().tipo).toBe('invalid');
    expect(store.envio()).toMatchObject({
      error: {
        code: 'INVALID_APPLICATION_DATA',
        message: 'El plazo de la solicitud es obligatorio',
        traceId: 'trace-400',
      },
    });
    expect(store.edicionBloqueada()).toBe(false);
    store.enviar({ ...datos, termMonths: 24 });
    const req = http.expectOne(url);
    expect(req.request.body.termMonths).toBe(24);
    req.flush({ ...resultado, termMonths: 24 });
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([]));
  });

  it.each([
    [413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la petición es demasiado grande'],
    [415, 'UNSUPPORTED_MEDIA_TYPE', 'El tipo de contenido no está soportado'],
  ])('trata un HTTP %i como rechazo definitivo y editable', (status, code, message) => {
    store.enviar(datos);
    http
      .expectOne(url)
      .flush({ code, message, traceId: `trace-${status}` }, { status, statusText: 'Client Error' });

    expect(store.envio()).toMatchObject({
      tipo: 'invalid',
      error: { status, code, message, traceId: `trace-${status}` },
    });
    expect(store.edicionBloqueada()).toBe(false);
  });

  it('una consulta manual no resuelve ni desbloquea el envío pendiente', () => {
    store.enviar(datos);
    http.expectOne(url).error(new ProgressEvent('error'));
    store.consultarPorReferencia(resultado.applicationReference);
    http.expectOne(`${url}/${encodeURIComponent(resultado.applicationReference)}`).flush(resultado);
    expect(store.consulta().datos?.status).toBe('APPROVED');
    expect(store.envio().tipo).toBe('unconfirmed');
    expect(store.edicionBloqueada()).toBe(true);
  });

  it('conserva las últimas solicitudes cuando falla su actualización', () => {
    store.cargarRecientes();
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([resultado]));
    store.cargarRecientes();
    http.expectOne(`${url}?page=0&size=20`).flush({}, { status: 500, statusText: 'Error' });
    expect(store.recientes().datos).toHaveLength(1);
    expect(store.recientes().error).not.toBeNull();
  });

  it('avanza y retrocede conservando el tamaño de 20 y los totales del servidor', () => {
    store.cargarRecientes();
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([resultado], 0, 21));
    expect(store.paginaRecientes()?.totalElements).toBe(21);

    store.cambiarPaginaRecientes(1);
    http
      .expectOne(`${url}?page=1&size=20`)
      .flush(pagina([{ ...resultado, applicationReference: 'ANTERIOR' }], 1, 21));
    expect(store.paginaRecientes()?.page).toBe(1);
    expect(store.recientes().datos[0].applicationReference).toBe('ANTERIOR');

    store.cambiarPaginaRecientes(2);
    http.expectNone(`${url}?page=2&size=20`);
    store.cambiarPaginaRecientes(0);
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([resultado], 0, 21));
    expect(store.recientes().datos[0].applicationReference).toBe(resultado.applicationReference);
  });

  it('inserta un 201 confirmado antes de refrescar y lo conserva si el GET falla', () => {
    const nueva = { ...resultado, applicationReference: 'REF-NUEVA' };
    store.enviar(datos);
    http.expectOne(url).flush(nueva, { status: 201, statusText: 'Created' });

    expect(store.recientes().datos).toEqual([nueva]);
    http.expectOne(`${url}?page=0&size=20`).flush({}, { status: 500, statusText: 'Error' });
    expect(store.recientes().datos).toEqual([nueva]);
  });

  it('reemplaza un reintento HTTP 200 por referencia sin duplicarlo', () => {
    store.cargarRecientes();
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([resultado]));
    store.enviar(datos);
    const reiterada = { ...resultado, message: 'Esta solicitud ya fue aprobada' };
    http.expectOne(url).flush(reiterada, { status: 200, statusText: 'OK' });

    expect(store.recientes().datos).toEqual([reiterada]);
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([reiterada]));
    expect(store.recientes().datos).toHaveLength(1);
  });

  it('cancela las lecturas anteriores al pedir resultados nuevos', () => {
    store.consultarPorReferencia('anterior');
    const anterior = http.expectOne(`${url}/anterior`);
    store.consultarPorReferencia('nueva');
    expect(anterior.cancelled).toBe(true);
    http.expectOne(`${url}/nueva`).flush({ ...resultado, applicationReference: 'nueva' });
    expect(store.consulta().datos?.applicationReference).toBe('nueva');
    store.cargarRecientes();
    const listadoAnterior = http.expectOne(`${url}?page=0&size=20`);
    store.cargarRecientes();
    expect(listadoAnterior.cancelled).toBe(true);
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([]));
  });

  it('selecciona un resultado reciente sin hacer otro GET ni alterar el envío', () => {
    store.seleccionarConsulta(resultado);

    expect(store.consulta().datos).toEqual(resultado);
    expect(store.envio().tipo).toBe('idle');
    http.expectNone((request) => request.method === 'GET');
  });

  it('el timeout deja el envío sin confirmar y no reintenta automáticamente', () => {
    vi.useFakeTimers();
    store.enviar(datos);
    const req = http.expectOne(url);
    vi.advanceTimersByTime(15_001);
    expect(req.cancelled).toBe(true);
    expect(store.envio().tipo).toBe('unconfirmed');
    expect(store.edicionBloqueada()).toBe(true);
    http.expectNone(url);
  });

  it('un error tardío nunca reemplaza un resultado confirmado', () => {
    const respuesta = new Subject<RespuestaEnvioSolicitud>();
    vi.spyOn(TestBed.inject(SolicitudesApiService), 'enviar').mockReturnValue(respuesta);
    store.enviar(datos);
    respuesta.next({ httpStatus: 201, solicitud: resultado });
    http.expectOne(`${url}?page=0&size=20`).flush(pagina([]));
    respuesta.error(new Error('Error tardío'));
    expect(store.envio().tipo).toBe('resolved');
  });
});

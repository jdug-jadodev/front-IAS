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
    applicationReference: 'Ref / ñ',
    customerId: 'c',
    amount: '1.00',
    termMonths: 12,
  };
  const resultado = {
    ...datos,
    status: 'APPROVED' as const,
    message: 'Esta solicitud fue aprobada',
    processedAt: '2026-10-01T10:00:00Z',
    reasonCode: null,
    reason: null,
  };
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
    http.expectOne(`${url}?limit=20`).flush([]);
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

  it('exige una referencia diferente tras un conflicto', () => {
    store.enviar(datos);
    http.expectOne(url).flush(
      {
        code: 'REFERENCE_CONFLICT',
        message: 'La referencia ya está asociada a una solicitud con datos diferentes',
        traceId: 'trace-409',
      },
      { status: 409, statusText: 'Conflict' },
    );
    expect(store.envio().tipo).toBe('conflict');
    expect(store.envio()).toMatchObject({
      error: { code: 'REFERENCE_CONFLICT', traceId: 'trace-409' },
    });
    store.nuevaSolicitud();
    store.enviar(datos);
    http.expectNone(url);
    store.enviar({ ...datos, applicationReference: 'otra' });
    http.expectOne(url).flush({ ...resultado, applicationReference: 'otra' });
    http.expectOne(`${url}?limit=20`).flush([]);
  });

  it('un 404 durante la recuperación conserva la operación pendiente', () => {
    store.enviar(datos);
    http.expectOne(url).error(new ProgressEvent('error'));
    store.consultarEnvioPendiente();
    http
      .expectOne(`${url}/${encodeURIComponent(datos.applicationReference)}`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(store.envio().tipo).toBe('unconfirmed');
    expect(store.recuperando()).toBe(false);
    expect(store.edicionBloqueada()).toBe(true);
    store.reintentarEnvio();
    const req = http.expectOne(url);
    expect(req.request.body).toEqual(datos);
    req.flush(resultado);
    http.expectOne(`${url}?limit=20`).flush([]);
  });

  it('recuperar datos distintos produce conflicto', () => {
    store.enviar(datos);
    http.expectOne(url).error(new ProgressEvent('error'));
    store.consultarEnvioPendiente();
    http
      .expectOne(`${url}/${encodeURIComponent(datos.applicationReference)}`)
      .flush({ ...resultado, customerId: 'otro-cliente' });
    expect(store.envio().tipo).toBe('conflict');
  });

  it.each([{}, { ...resultado, customerId: 'otro' }])(
    'no confirma un POST con respuesta incompatible',
    (body) => {
      store.enviar(datos);
      http.expectOne(url).flush(body);
      expect(store.envio().tipo).toBe('unconfirmed');
      http.expectNone(`${url}?limit=20`);
    },
  );

  it('una consulta manual no resuelve ni desbloquea el envío pendiente', () => {
    store.enviar(datos);
    http.expectOne(url).error(new ProgressEvent('error'));
    store.consultarPorReferencia(datos.applicationReference);
    http.expectOne(`${url}/${encodeURIComponent(datos.applicationReference)}`).flush(resultado);
    expect(store.consulta().datos?.status).toBe('APPROVED');
    expect(store.envio().tipo).toBe('unconfirmed');
    expect(store.edicionBloqueada()).toBe(true);
  });

  it('conserva las últimas solicitudes cuando falla su actualización', () => {
    store.cargarRecientes();
    http.expectOne(`${url}?limit=20`).flush([resultado]);
    store.cargarRecientes();
    http.expectOne(`${url}?limit=20`).flush({}, { status: 500, statusText: 'Error' });
    expect(store.recientes().datos).toHaveLength(1);
    expect(store.recientes().error).not.toBeNull();
  });

  it('inserta un 201 confirmado antes de refrescar y lo conserva si el GET falla', () => {
    const nueva = { ...resultado, applicationReference: 'REF-NUEVA' };
    store.enviar({ ...datos, applicationReference: nueva.applicationReference });
    http.expectOne(url).flush(nueva, { status: 201, statusText: 'Created' });

    expect(store.recientes().datos).toEqual([nueva]);
    http.expectOne(`${url}?limit=20`).flush({}, { status: 500, statusText: 'Error' });
    expect(store.recientes().datos).toEqual([nueva]);
  });

  it('reemplaza un reintento HTTP 200 por referencia sin duplicarlo', () => {
    store.cargarRecientes();
    http.expectOne(`${url}?limit=20`).flush([resultado]);
    store.enviar(datos);
    const reiterada = { ...resultado, message: 'Esta solicitud ya fue aprobada' };
    http.expectOne(url).flush(reiterada, { status: 200, statusText: 'OK' });

    expect(store.recientes().datos).toEqual([reiterada]);
    http.expectOne(`${url}?limit=20`).flush([reiterada]);
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
    const listadoAnterior = http.expectOne(`${url}?limit=20`);
    store.cargarRecientes();
    expect(listadoAnterior.cancelled).toBe(true);
    http.expectOne(`${url}?limit=20`).flush([]);
  });

  it('selecciona un resultado reciente sin hacer otro GET ni alterar el envío', () => {
    store.seleccionarConsulta(resultado);

    expect(store.consulta().datos).toEqual(resultado);
    expect(store.envio().tipo).toBe('idle');
    http.expectNone((request) => request.method === 'GET');
  });

  it('recuerda las referencias conflictivas de la sesión y limpia el aviso visible', () => {
    store.enviar(datos);
    http.expectOne(url).flush({}, { status: 409, statusText: 'Conflict' });
    store.nuevaSolicitud();
    expect(store.referenciaEnConflicto()).toBeNull();

    const segunda = { ...datos, applicationReference: 'otra-conflictiva' };
    store.enviar(segunda);
    http.expectOne(url).flush({}, { status: 409, statusText: 'Conflict' });
    store.nuevaSolicitud();
    store.enviar(datos);

    http.expectNone(url);
    expect(store.envio().tipo).toBe('invalid');
    expect(store.referenciaEnConflicto()).toBe(datos.applicationReference);
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
    http.expectOne(`${url}?limit=20`).flush([]);
    respuesta.error(new Error('Error tardío'));
    expect(store.envio().tipo).toBe('resolved');
  });
});

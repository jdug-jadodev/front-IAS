# Contexto para continuar el frontend de créditos

**Estado al 1 de octubre de 2026:** implementación funcional en Angular 22.2, con interfaz BancoIAS, pruebas unitarias y build de producción. Este archivo resume las decisiones que una IA o una persona debe conservar al modificar el proyecto.

## Reglas que no deben romperse

1. `amount` es un `string` decimal desde el formulario hasta `HttpClient`; no usar `Number`, `parseFloat` ni redondeos.
2. El POST solo ocurre después de una revisión explícita de los cuatro datos.
3. Un envío activo admite una sola petición. La protección de UI no sustituye la idempotencia del backend.
4. Red, timeout, 5xx o respuesta incompatible producen `unconfirmed`; nunca inventar una decisión.
5. En recuperación se reutiliza la copia exacta de referencia, cliente, monto y plazo.
6. Envío, consulta y recientes mantienen estados independientes.
7. Los datos externos se presentan como texto; no usar HTML recibido ni desactivar la sanitización.
8. Los commits de implementación usan mensajes en español y unidades coherentes de unas 400 líneas como cadencia orientativa.

## Arquitectura

Angular standalone, TypeScript y plantillas estrictos, Reactive Forms tipados, Signals y HttpClient. Organización por funcionalidad y UI atómica. Sin NgRx, arquitectura hexagonal completa, bus global de eventos, fachadas redundantes ni módulos propios innecesarios.

`shared/ui/atoms` y `shared/ui/molecules`: piezas genéricas, sin HTTP ni store de créditos. Preferir controles HTML nativos. No crear wrappers o carpetas vacías para completar categorías atómicas.

`features/solicitudes` contiene `pages`, `ui/organisms`, `ui/pipes`, `state`, `api`, `models` y `validation`. Organismos: formulario, resultado de envío, recientes, consulta por referencia y resultado de consulta. Pruebas junto a cada archivo.

## Comunicación y estado

`SolicitudesPage` registra `providers: [SolicitudesStore]`. Store con `@Injectable()` sin `providedIn: 'root'`. Los organismos inyectan la misma instancia; no volver a proporcionarla en cada hijo.

`SolicitudesStore` inyecta `SolicitudesApiService`, registrado con `providedIn: 'root'`. API sin estado de formulario; solo este servicio usa HttpClient. Inyectar con `inject()`. No replicar los puertos del backend.

Los organismos llaman acciones del store y leen Signals; no reenvían eventos entre varios niveles. Inputs/outputs directos siguen permitidos para piezas genéricas.

Formulario dueño de campos y validación. Store dueño de la copia del envío, resultado, recientes y consulta. No duplicar cada pulsación. Signals modificables privadas; lectura pública; `computed` para derivados. No mutar objetos/listas desde componentes.

Acciones: `enviar`, `reintentarEnvio`, `consultarEnvioPendiente`, `cargarRecientes`, `consultarPorReferencia`, `nuevaSolicitud`.

## Validación

Referencia y cliente obligatorios y no blancos. Monto numérico, finito y mayor que cero. Plazo entero entre 6 y 60. Validadores explícitos en TypeScript; no `ngModel`.

No imponer patrones a identificadores ni cambiarlos silenciosamente. No verificar cupo, existencia/habilitación del cliente o unicidad para bloquear solicitudes. Backend decide y conserva rechazos; validaciones del navegador no sustituyen sus reglas.

No redondear ni calcular dinero. El transporte confirmado usa un string decimal en COP con punto; el frontend no impone una escala o máximo adicionales. El parser conserva compatibilidad provisional con números JSON seguros, pero el formato recomendado para precisión arbitraria es texto.

## Envío y recuperación

Único `(ngSubmit)`. Validar también en el manejador y obtener `getRawValue()`. Un formulario válido crea un snapshot inmutable y muestra “Revisa antes de enviar”; solo “Confirmar y enviar” llama al store. El store vuelve a copiar los cuatro datos y marca `submitting` antes de HTTP. Una segunda llamada activa no genera otro POST.

“Editar datos” vuelve al formulario sin perder valores. “Descartar datos” pide confirmación si el borrador fue modificado. Consultar otra referencia tampoco desmonta el formulario ni borra el borrador.

API devuelve Observables sin suscribirse; store tiene una suscripción controlada por acción, errores explícitos y limpieza con `takeUntilDestroyed`. No lanzar POST desde effects, no `switchMap` para POST, no colas ni reintentos automáticos. GET puede usar `switchMap` para descartar consultas antiguas.

Estados de envío: `idle`, `submitting`, `resolved`, `invalid`, `conflict`, `unconfirmed`. Lecturas con estados independientes. Nunca usar un único indicador de carga para todo.

Red, timeout configurable, 5xx o respuesta incompatible dejan `unconfirmed`, no rechazo. Conservar edición bloqueada y cuerpo original; consultar referencia o reintentar exactamente ese cuerpo. No generar otra referencia ni descartar la operación pendiente. Consulta de recuperación y reintento son excluyentes; protegerlo también en el store.

Consulta de recuperación: mismos datos recuperan resultado; distintos muestran conflicto; 404 no prueba que otra petición haya terminado. Permitir repetir el envío original. Nueva solicitud por acción explícita tras resultado o conflicto; en conflicto requiere otra referencia. 400 permite corregir. Un error tardío no reemplaza un resultado confirmado.

Estado en memoria, sin localStorage. Recargar pierde borrador; consultar por referencia recupera únicamente resultados ya persistidos. Cancelar la espera no confirma reversión del backend.

## Contratos y errores

`POST /api/applications`; `GET /api/applications/{reference}`; `GET /api/applications?limit=20`. Codificar referencia como segmento URL.

Entrada: `applicationReference`, `customerId`, `amount`, `termMonths`. Respuesta: esos datos, `status`, `processedAt`, y `reasonCode`/`reason` para rechazo.

201: registro nuevo; 200 en POST: repetición idéntica. Ambos pueden contener `APPROVED` o `REJECTED`. 400: datos no procesados; 409: referencia en conflicto; 404: consulta sin resultado. Cliente inexistente al procesar: rechazo `CUSTOMER_NOT_FOUND`, no 404.

Parser pequeño para campos esenciales, estado y fecha. Tipos TS no validan JSON. Mapper de errores con mensaje seguro y `traceId`, sin excepciones Java ni trazas técnicas.

Actualizar recientes al entrar, confirmar y actualizar manualmente. Error del listado no borra resultado, no repite POST ni se convierte en lista vacía exitosa.

## Protección, local y pruebas

Texto normal, no HTML de API ni bypass de sanitización. Sin secretos, solicitudes en almacenamiento persistente o logs completos. Etiquetas, teclado y avisos accesibles desde ahora. Sin autenticación/autorización: demo local, no despliegue público con datos reales.

Docker: construir con Node y servir con Nginx. Navegador usa `/api`; proxy a `backend:8080` quitando prefijo. Fallos API no devuelven index.html. Cola futura solo con backend. El proyecto fija Angular 22.2, Node 24 y npm 11.

La suite ejecutada cubre validaciones, cuerpo exacto, revisión, doble envío, snapshot de reintento, respuestas, estados independientes, parser, listado, descarte y foco. La integración real requiere además el backend activo en `localhost:8080`; la concurrencia del core debe probarse directamente allí, sin quitar el bloqueo de botones.

## Presentación implementada

Identidad IAS con azul marino, azul brillante, amarillo y rosa como acentos contenidos; Montserrat con Arial como fallback. La pantalla usa una composición maestro–detalle: búsqueda e historial a la izquierda e inspector contextual a la derecha. En móvil se apila, traslada el foco al resultado y no debe producir desplazamiento horizontal.

Los controles miden al menos 44 px, el foco es visible y los estados usan texto e icono. Las fechas se muestran en `America/Bogota`; los importes se formatean con `BigInt` e `Intl.NumberFormat`, sin perder la fracción textual.

El estado vive en memoria y no usa `localStorage`. No hay login, permisos, modo oscuro ni cola en el navegador. `bancoias-identidad-ias.html` es una referencia visual: no importarlo ni ejecutar su JavaScript dentro de Angular.

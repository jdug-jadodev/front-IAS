# Contexto para continuar el frontend de créditos

**Estado al 1 de octubre de 2026:** implementación funcional en Angular 22.2, con interfaz clara BancoIAS, 105 pruebas automatizadas aprobadas y build de producción. Este archivo resume las decisiones que una IA o una persona debe conservar al modificar el proyecto.

## Reglas que no deben romperse

1. `amount` es un `string` decimal desde el formulario hasta `HttpClient`; no usar `Number`, `parseFloat` ni redondeos.
2. El POST solo ocurre después de una revisión explícita de cliente, monto y plazo.
3. Un envío activo admite una sola petición. La protección de UI no sustituye la idempotencia del backend.
4. Red, timeout, 5xx o respuesta incompatible producen `unconfirmed`; nunca inventar una decisión.
5. En recuperación se reutiliza la copia exacta de referencia, cliente, monto y plazo.
6. Envío, consulta y recientes mantienen estados independientes.
7. Los datos externos se presentan como texto; no usar HTML recibido ni desactivar la sanitización.
8. Los commits de implementación usan mensajes en español y unidades coherentes de unas 400 líneas como cadencia orientativa.
9. La escena ilustrada es estado visual local: cambiar el foco no toca el formulario, el store, las peticiones ni los resultados.
10. Referencia, cliente y búsqueda se convierten a mayúsculas antes de su primera petición, sin `trim`; `amount` no se normaliza y los reintentos reutilizan el snapshot exacto ya enviado.
11. `#solicitud`, `#comprobante` y `#consulta` son vistas persistentes de la misma página; navegar entre ellas no crea otro store ni desmonta sus organismos.

## Arquitectura

Angular standalone, TypeScript y plantillas estrictos, Reactive Forms tipados, Signals y HttpClient. Organización por funcionalidad y UI atómica. Sin NgRx, arquitectura hexagonal completa, bus global de eventos, fachadas redundantes ni módulos propios innecesarios.

`shared/ui/atoms` y `shared/ui/molecules`: piezas genéricas, sin HTTP ni store de créditos. Preferir controles HTML nativos. No crear wrappers o carpetas vacías para completar categorías atómicas.

`features/solicitudes` contiene `pages`, `ui/organisms`, `ui/pipes`, `state`, `api`, `models` y `validation`. Organismos: formulario, resultado de envío, recientes, consulta por referencia y resultado de consulta. Pruebas junto a cada archivo.

## Comunicación y estado

`SolicitudesPage` registra `providers: [SolicitudesStore]`. Store con `@Injectable()` sin `providedIn: 'root'`. Los organismos inyectan la misma instancia; no volver a proporcionarla en cada hijo.

`SolicitudesStore` inyecta `SolicitudesApiService`, registrado con `providedIn: 'root'`. API sin estado de formulario; solo este servicio usa HttpClient. Inyectar con `inject()`. No replicar los puertos del backend.

Los organismos llaman acciones del store y leen Signals; no reenvían eventos entre varios niveles. Inputs/outputs directos siguen permitidos para piezas genéricas.

Formulario dueño de campos y validación. Store dueño de la copia del envío, resultado, recientes y consulta. No duplicar cada pulsación. Signals modificables privadas; lectura pública; `computed` para derivados. No mutar objetos/listas desde componentes.

Acciones: `enviar`, `reintentarEnvio`, `cargarRecientes`, `consultarPorReferencia`, `seleccionarConsulta` y `nuevaSolicitud`.

## Validación

Cliente obligatorio y no blanco. Monto decimal textual mayor que cero, sin separadores de miles. Plazo entero entre 6 y 60. La referencia se recibe del backend; no es un campo del formulario.

No imponer patrones a identificadores. Convertir `customerId` y la referencia de búsqueda a mayúsculas antes del POST o GET correspondiente; no aplicar `trim` ni modificar espacios. No verificar cupo ni existencia/habilitación del cliente para bloquear solicitudes. Backend decide y conserva rechazos.

No redondear ni calcular dinero. El transporte confirmado usa un string decimal en COP con punto; el frontend no impone una escala o máximo adicionales. El parser exige que `amount` llegue como string JSON y rechaza montos JSON numéricos, incluso si parecen seguros.

## Envío y recuperación

Único `(ngSubmit)`. Validar también en el manejador y obtener `getRawValue()`. Antes del POST, convertir el cliente a mayúsculas sin recortar, mantener `amount` intacto y crear el snapshot inmutable de los tres datos. Solo “Confirmar y enviar” llama al store. El store genera una `Idempotency-Key` UUID por solicitud nueva y marca `submitting` antes de HTTP. Una segunda llamada activa no genera otro POST.

“Editar datos” vuelve al formulario sin perder valores. “Descartar datos” pide confirmación si el borrador fue modificado. Consultar otra referencia tampoco desmonta el formulario ni borra el borrador.

API devuelve Observables sin suscribirse; store tiene una suscripción controlada por acción, errores explícitos y limpieza con `takeUntilDestroyed`. No lanzar POST desde effects, no `switchMap` para POST, no colas ni reintentos automáticos. GET puede usar `switchMap` para descartar consultas antiguas. La consulta convierte la referencia visible a mayúsculas, sin `trim`, antes de construir el primer GET.

Estados de envío: `idle`, `submitting`, `resolved`, `invalid`, `conflict`, `unconfirmed`. Lecturas con estados independientes. Nunca usar un único indicador de carga para todo.

Red, timeout configurable, 5xx o respuesta incompatible dejan `unconfirmed`, no rechazo. Conservar edición bloqueada, snapshot y clave; reintentar exactamente ese cuerpo con la misma `Idempotency-Key`. La referencia puede ser desconocida hasta recibir respuesta. HTTP 429 también conserva la clave para el reintento.

Una solicitud nueva utiliza otra clave, incluso con datos idénticos. Un 409 indica conflicto de clave; 400 permite corregir. Un error tardío no reemplaza un resultado confirmado.

Estado en memoria, sin localStorage. Recargar pierde borrador; consultar por referencia recupera únicamente resultados ya persistidos. Cancelar la espera no confirma reversión del backend.

## Contratos y errores

`POST /api/applications` con `Idempotency-Key`; `GET /api/applications/{reference}`; `GET /api/applications?page=0&size=20`. Codificar la referencia de consulta como segmento URL.

Entrada: `customerId`, `amount` como texto decimal y `termMonths`. La respuesta añade `applicationReference`, `status`, `message`, `processedAt`, `reasonCode` y `reason`; las aprobaciones traen los dos últimos en `null`.

201: registro nuevo; 200 en POST: reintento idéntico con la misma clave. El servicio conserva el status HTTP y el DTO completo; ambos pueden contener `APPROVED` o `REJECTED`. El 409 entra en conflicto y el 429 conserva la clave para reintentar. Red, timeout, respuesta incompatible y 5xx quedan sin confirmar. Cliente inexistente al procesar: rechazo `CUSTOMER_NOT_FOUND`, no 404.

Parser estricto para monto textual, mensaje, estado, fecha, nulos y motivos permitidos. Tipos TS no validan JSON. El mapper conserva `code`, el mensaje contractual 4xx y `traceId` —con respaldo en `X-Trace-Id`—, pero no expone mensajes internos de 5xx.

Actualizar recientes al entrar, confirmar y actualizar manualmente. Un 201 se inserta localmente antes del GET; un 200 reemplaza por referencia sin duplicar. Tras la primera carga exitosa, si no hay una consulta activa, la página selecciona el primer registro real con `seleccionarConsulta`, sin otro GET ni referencia fija. Error del listado no borra el upsert confirmado, no repite POST ni se convierte en lista vacía exitosa.

## Protección, local y pruebas

Texto normal, no HTML de API ni bypass de sanitización. Sin secretos, solicitudes en almacenamiento persistente o logs completos. Etiquetas, teclado y avisos accesibles desde ahora. Sin autenticación/autorización: demo local, no despliegue público con datos reales.

Docker: construir con Node y servir con Nginx. Navegador usa `/api`; proxy a `backend:8080` quitando prefijo. Fallos API no devuelven index.html. Cola futura solo con backend. El proyecto fija Angular 22.2, Node 24 y npm 11.

La suite ejecutada cubre validaciones, cuerpo exacto, revisión, doble envío, snapshot de reintento, respuestas, estados independientes, parser, listado, descarte y foco. La consulta por referencia se probó en navegador con el backend activo en `localhost:8080`; el listado espera su nuevo contrato. El POST real y la concurrencia del core deben probarse directamente allí, sin quitar el bloqueo de botones.

## Presentación implementada

Identidad IAS clara fija con Montserrat y Arial como fallback. Tokens principales: fondo `#f7f9fe` y azul eléctrico `#2454f5`; superficies, controles, texto, foco y estados deben mantener contraste accesible sobre esa base.

La página mantiene tres vistas montadas y navegables por fragmento: `#solicitud` contiene el hero con ilustración y formulario; `#comprobante` presenta a pantalla completa el envío y su resultado; `#consulta` muestra el buscador junto a la tarjeta de detalle. La transición de navegación es visual y suave: no recrea el formulario, los organismos ni `SolicitudesStore`. En móvil se prioriza el formulario y los dos bloques de consulta se apilan sin desplazamiento horizontal.

Las escenas se asignan por foco: monto → `portatil.png`, plazo → `bicicleta.png`, cliente → `hogar.png` y referencia → `solicitud.png`. Cada selección espera 200 ms, cancela el cambio pendiente y aplica semántica latest-wins. La siguiente imagen se precarga y decodifica antes de sustituir la anterior; la disolución dura 1050 ms con `cubic-bezier(.37, 0, .63, 1)`, sin traslación ni giro y respetando `prefers-reduced-motion`.

La escena se administra con estado visual local de `SolicitudesPage`, la página de composición, separado de `SolicitudesStore`, Reactive Forms y la API. Cambiar de campo no valida de nuevo, no hace peticiones, no reinicia resultados o consultas y no recrea el formulario: conserva valores, borrador, foco, errores, `dirty`, `touched` y `disabled`.

Los controles miden al menos 44 px, el foco es visible y los estados usan texto e icono. Las fechas se muestran en `America/Bogota`; los importes se formatean con `BigInt` e `Intl.NumberFormat`, sin perder la fracción textual.

La dirección visual clara no incluye selector de tema. El estado de negocio vive en memoria y no usa `localStorage`. No hay login, permisos ni cola en el navegador. `bancoias-demo.html` es solo una referencia visual: no importarlo, ejecutar su JavaScript ni copiar sus validadores, parser monetario, envío simulado, ventanas o datos de ejemplo dentro de Angular.

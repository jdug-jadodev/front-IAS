# Contexto de implementación: frontend de créditos

Diseño, no código implementado. Ampliación de `ARQUITECTURA.md`; decisiones y fuentes completas en `ARQUITECTURA_FRONTEND.md`. No modificar el backend, modelar tablas ni diseñar estilos en esta etapa.

## Arquitectura

Angular standalone, TypeScript y plantillas estrictos, Reactive Forms tipados, Signals y HttpClient. Organización por funcionalidad y UI atómica. Sin NgRx, arquitectura hexagonal completa, bus global de eventos, fachadas redundantes ni módulos propios innecesarios.

`shared/ui/atoms` y `shared/ui/molecules`: piezas genéricas, sin HTTP ni store de créditos. Preferir controles HTML nativos. No crear wrappers o carpetas vacías para completar categorías atómicas.

`features/solicitudes` contiene `pages`, `ui/organisms`, `state`, `api`, `models` y `validation`. Organismos: formulario, resultado, recientes y consulta por referencia. Pruebas junto a cada archivo.

## Comunicación y estado

`SolicitudesPage` registra `providers: [SolicitudesStore]`. Store con `@Injectable()` sin `providedIn: 'root'`. Los organismos inyectan la misma instancia; no volver a proporcionarla en cada hijo.

`SolicitudesStore` inyecta `SolicitudesApiService`, registrado con `providedIn: 'root'`. API sin estado de formulario; solo este servicio usa HttpClient. Inyectar con `inject()`. No replicar los puertos del backend.

Los organismos llaman acciones del store y leen Signals; no reenvían eventos entre varios niveles. Inputs/outputs directos siguen permitidos para piezas genéricas.

Formulario dueño de campos y validación. Store dueño de la copia del envío, resultado, recientes y consulta. No duplicar cada pulsación. Signals modificables privadas; lectura pública; `computed` para derivados. No mutar objetos/listas desde componentes.

Acciones: `enviar`, `reintentarEnvio`, `consultarEnvioPendiente`, `cargarRecientes`, `consultarPorReferencia`, `nuevaSolicitud`.

## Validación

Referencia y cliente obligatorios y no blancos. Monto numérico, finito y mayor que cero. Plazo entero entre 6 y 60. Validadores explícitos en TypeScript; no `ngModel`.

No imponer patrones a identificadores ni cambiarlos silenciosamente. No verificar cupo, existencia/habilitación del cliente o unicidad para bloquear solicitudes. Backend decide y conserva rechazos; validaciones del navegador no sustituyen sus reglas.

No redondear ni calcular dinero. Precisión, escala y representación monetaria están pendientes de cerrar con backend; no inventarlas. Los ejemplos actuales usan monto numérico JSON, sin prometer precisión decimal arbitraria.

## Envío y recuperación

Único `(ngSubmit)`. Validar también en el manejador. Obtener `getRawValue()` antes de deshabilitar controles. Store comprueba el estado, copia los cuatro datos y marca `submitting` antes de HTTP. Bloquear enviar, limpiar y editar. Una segunda llamada activa no genera otro POST.

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

Docker: construir con Node y servir con Nginx. Navegador usa `/api`; proxy a `backend:8080` quitando prefijo. Fallos API no devuelven index.html. Cola futura solo con backend. Fijar versiones al implementar.

Probar validaciones, doble envío, snapshot de reintento, respuestas, estados independientes, parser, listado y proxy real. Concurrencia del core se prueba directamente en backend con PostgreSQL real; no quitar bloqueo de botones. No afirmar pruebas ejecutadas.

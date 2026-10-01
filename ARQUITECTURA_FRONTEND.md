# Arquitectura del frontend de créditos

**Estado al 1 de octubre de 2026:** arquitectura implementada en Angular 22.2, con identidad oscura BancoIAS, build de producción y 76 pruebas unitarias aprobadas. La validación end-to-end contra Docker sigue fuera de este repositorio.

**Base:** el enunciado pide registrar solicitudes, mostrar su resultado y consultar las recientes. La concurrencia y las referencias repetidas deben estar protegidas en el core. [^prueba]

Este documento concreta el frontend de `ARQUITECTURA.md`. Mantiene sus rutas, respuestas y despliegue. Ajusta el bosquejo inicial: los componentes específicos de solicitudes vivirán dentro de esa funcionalidad; solo la UI realmente reutilizable será compartida. No modifica el diseño del backend. [^backend]

## 1. Decisión principal

**Angular por funcionalidad + componentes atómicos + un servicio de estado por pantalla + un servicio HTTP.**

| Decisión | Motivo y límite |
|---|---|
| Componentes standalone, TypeScript estricto y comprobación estricta de plantillas | Detectar incompatibilidades temprano. No crear módulos propios innecesarios. [^componentes] [^tipado] |
| Organización por funcionalidad | Mantener juntos formulario, estado y acceso a datos de solicitudes. [^organizacion] |
| Diseño atómico para la UI | Reutilizar piezas pequeñas; no convertir cada elemento HTML en un componente. [^atomico] |
| `SolicitudesStore` con Signals | Compartir el estado sin pasar datos y eventos por varios componentes intermedios. No añadir NgRx. [^signals] |
| Reactive Forms tipados | Mantener campos, errores y validaciones explícitos en TypeScript. No mezclar con `ngModel`. [^formularios] |
| `SolicitudesApiService` con `HttpClient` | Concentrar HTTP en una sola pieza, separada de la pantalla. [^http] |

No usaremos arquitectura hexagonal completa en el frontend por ahora. Tampoco una fachada adicional encima del store: aquí **el store ya es la entrada a las acciones de la pantalla**.

## 2. Estructura implementada

```text
src/app/
├── app.config.ts
├── app.routes.ts
├── shared/ui/
│   ├── atoms/                       # Mensaje e indicador de carga
│   └── molecules/                   # Campo con etiqueta, ayuda y error
└── features/solicitudes/
    ├── pages/solicitudes-page/
    ├── ui/
    │   ├── organisms/
    │   │   ├── solicitud-form/
    │   │   ├── solicitud-resultado/
    │   │   ├── solicitudes-recientes/
    │   │   ├── consulta-referencia/
    │   │   └── consulta-resultado/
    │   └── pipes/
    │       ├── monto-cop.pipe.ts
    │       └── fecha-solicitud.pipe.ts
    ├── state/solicitudes.store.ts
    ├── api/
    │   ├── solicitudes-api.service.ts
    │   ├── solicitud-response.parser.ts
    │   └── error-api.mapper.ts
    ├── models/solicitud.model.ts
    └── validation/solicitud-form.validators.ts
```

Cada prueba `.spec.ts` irá junto a su archivo. No crear carpetas vacías. `templates` se incorporará cuando exista una distribución reutilizable; para una sola pantalla, la página puede componer los organismos directamente. [^organizacion]

**Atoms y molecules:** piezas genéricas. Reciben propiedades y, cuando haga falta, emiten una acción directa. No conocen créditos, el store ni HTTP.

**Organisms:** bloques de esta funcionalidad. Pueden inyectar el store. El formulario maneja sus controles; resultado y recientes muestran el estado compartido.

**Page:** compone los bloques, proporciona el store e inicia la carga de recientes. Después de la primera carga exitosa selecciona el primer registro real mediante `seleccionarConsulta(resultado)`, sin disparar otro GET y sin una referencia fija. No aprueba créditos ni hace peticiones HTTP directamente.

Preferir controles HTML nativos. No construir inputs personalizados con adaptadores de formularios solo para cumplir una categoría atómica. La molécula puede envolver un input mediante proyección de contenido.

## 3. Comunicación e inyección

```text
SolicitudesPage proporciona una instancia de SolicitudesStore
    ├── SolicitudForm          → llama enviar()
    ├── SolicitudResultado     → lee resultado y estado de envío
    ├── SolicitudesRecientes   → lee recientes; llama cargarRecientes()
    ├── ConsultaReferencia     → llama consultarPorReferencia()
    └── ConsultaResultado      → presenta una consulta independiente

SolicitudesStore → SolicitudesApiService → HttpClient → Backend
```

El problema que evitamos es la cadena de `inputs` y `outputs` usada únicamente para transportar información. Un evento directo entre padre e hijo sigue siendo válido; no necesitamos prohibir toda comunicación local.

### Dónde usar `root`

| Pieza | Registro | Por qué |
|---|---|---|
| `SolicitudesApiService` | `@Injectable({ providedIn: 'root' })` | Instancia compartida, sin estado de formulario. |
| `SolicitudesStore` | `@Injectable()` y `providers: [SolicitudesStore]` en `SolicitudesPage` | Una instancia compartida por la página y sus descendientes. |

Angular permite ambos alcances. El servicio proporcionado por la página se destruye con ella. No volver a declararlo en cada organismo: eso crearía estados separados. [^inyeccion]

**Centralizado no significa global.** El estado de solicitudes no necesita vivir en toda la aplicación. Si más adelante varias rutas necesitan compartirlo, revisaremos el alcance.

Usar `inject(SolicitudesStore)` en los organismos y `inject(SolicitudesApiService)` en el store. No usar un bus global de eventos ni acceso entre componentes hermanos.

En esta versión se inyectan servicios concretos de Angular. No se replica la regla de puertos del backend. Una futura interfaz TypeScript necesitaría un token de inyección real; una interfaz sola no sirve como token. [^proveedores]

## 4. Quién guarda cada dato

| Dato | Responsable |
|---|---|
| Campos mientras se escriben, errores y estado de interacción | Formulario con Reactive Forms. |
| Copia exacta del último envío | Store; se conserva para reintentar. |
| Resultado del envío y estado de procesamiento | Store. |
| Listado reciente, su carga y su error | Store, independientes del envío. |
| Consulta por referencia, su resultado y su error | Store, independientes del envío. |
| Solicitudes persistidas, cupo y decisión de crédito | Backend. |

No copiar cada pulsación del formulario a un estado global. El store recibe una copia de los datos al enviar; el formulario sigue siendo dueño de la edición.

Las Signals modificables serán privadas y se expondrán para lectura. Los cambios ocurrirán mediante acciones del store. Usar `computed` para valores derivados y reemplazar objetos/listas en vez de mutarlos desde los componentes. `asReadonly()` no impide por sí solo modificar objetos internos. [^signals]

Acciones implementadas: `enviar(datos)`, `reintentarEnvio()`, `consultarEnvioPendiente()`, `cargarRecientes()`, `consultarPorReferencia(referencia)`, `seleccionarConsulta(resultado)` y `nuevaSolicitud()`.

No disparar un POST desde un `effect`, desde la plantilla ni por cambios automáticos en los campos.

## 5. Validación del formulario

Usar validadores de Reactive Forms y funciones propias pequeñas. Las reglas se declaran explícitamente en TypeScript; no agregar lógica a los modelos de transporte. La decisión del backend de no usar `@Valid` no impide utilizar los validadores de Angular. [^formularios]

| Campo | Validación en la interfaz |
|---|---|
| `applicationReference` | Obligatorio; no vacío ni compuesto solo por espacios. Editable antes del envío. |
| `customerId` | Obligatorio; no vacío ni compuesto solo por espacios. |
| `amount` | String decimal con punto, sin exponente ni separadores; estrictamente mayor que cero. |
| `termMonths` | Obligatorio, entero, entre 6 y 60 inclusive. |

No imponer formatos como `REF-001` o `CLI-1001`: son ejemplos del documento, no patrones obligatorios. No cambiar mayúsculas ni transformar identificadores silenciosamente. [^datos]

No comprobar en el navegador si el cliente existe, está bloqueado, tiene cupo o si la referencia ya existe para impedir el envío. Eso pertenece al backend; una referencia existente puede ser un reintento válido. [^backend]

Mostrar errores después de interactuar con el campo o intentar enviar. Un envío inválido marca los campos para mostrar sus errores y no llama a la API. Validar también dentro del manejador: el botón deshabilitado no es la única comprobación. [^validacion]

**Esto no elimina los rechazos persistidos:** el backend seguirá guardando los rechazos de solicitudes que reciba y procese, incluidos casos enviados directamente por API. Los datos detenidos en el navegador todavía no son solicitudes procesadas.

**Dinero:** `amount` viaja como string decimal en COP. No calcular cupos, convertir a punto flotante ni redondear en JavaScript. La comparación normaliza texto decimal y la presentación agrupa la parte entera con `BigInt` e `Intl.NumberFormat`, conservando la fracción original. El frontend no impone dos decimales, un máximo o una escala nueva; esos límites siguen perteneciendo al contrato del backend. [^datos]

## 6. Un envío a la vez, sin perder la protección real

**Sí bloquearemos el botón y la edición mientras se envía.** Eso mejora la interacción, pero la protección entre pestañas, usuarios y llamadas directas sigue siendo del backend. [^prueba]

Recorrido implementado:

1. El formulario valida y obtiene sus datos con `getRawValue()`. [^formularios]
2. Un snapshot inmutable alimenta el paso de revisión; todavía no existe un POST.
3. La persona puede editar sin perder valores o confirmar los cuatro datos.
4. `enviar()` comprueba el estado. Si ya hay un envío activo, termina sin hacer otro POST.
5. El store conserva otra copia independiente y pasa a `submitting` **antes** de iniciar HTTP.
6. La interfaz bloquea acciones incompatibles. Dos clics de confirmación producen una sola petición.
7. La respuesta actualiza el estado. El resultado permanece visible hasta iniciar explícitamente otra solicitud.

El descarte de un formulario modificado usa una confirmación dentro de la página. No se presenta una acción destructiva inmediata ni se pierde el borrador al alternar con consultas.

El API service devuelve Observables sin suscribirse. El store realiza una sola suscripción por acción. Dos suscripciones a la misma petición de `HttpClient` pueden producir dos peticiones reales. [^http]

El store gestiona las suscripciones con `takeUntilDestroyed`, asociado a su ciclo de vida. El error debe tener tratamiento explícito. No copiar aquí la prohibición de `.subscribe()` del backend: en Angular necesitamos ejecutar la petición en un punto controlado. [^destruccion]

No usar `switchMap` para los envíos ni ponerlos en una cola automática. Para consultas GET sí puede usarse para conservar únicamente la consulta más reciente. Cancelar la espera del navegador no se interpretará como una reversión confirmada del backend. [^http]

## 7. Estados y reintentos

Usar un estado de envío explícito, no varios booleanos que puedan contradecirse.

| Estado | Significado y acción |
|---|---|
| `idle` | Se puede preparar y enviar una solicitud. |
| `submitting` | Petición en curso; no aceptar otro envío. |
| `resolved` | Resultado confirmado, aprobado **o rechazado**. Mostrarlo; nueva solicitud solo por acción explícita. |
| `invalid` | HTTP 400: datos no procesados según el contrato. Permitir corregir. |
| `conflict` | HTTP 409: la referencia pertenece a otros datos. Consultar el original o iniciar explícitamente otra solicitud con otra referencia. |
| `unconfirmed` | No pudimos confirmar el resultado: red, tiempo agotado, 5xx o respuesta incompatible. No asumir aprobación ni rechazo. |

`recientes` y `consulta` tendrán sus propios estados de carga/error. Una consulta no debe borrar el resultado del envío ni desbloquearlo.

### Cuando se pierde una respuesta

En `unconfirmed`, conservar los campos sin editar y la copia exacta del envío. Ofrecer **consultar esa referencia** o **reintentar ese mismo envío**. No habilitar una nueva operación que descarte silenciosamente la pendiente.

Reintentar significa mismo `applicationReference`, cliente, monto y plazo. No leer valores nuevos del formulario ni generar una referencia diferente.

Ejecutar una sola acción de recuperación a la vez: consulta o reintento. Bloquear ambas mientras una esté activa y comprobarlo también en el store. Un error tardío nunca debe reemplazar un resultado ya confirmado.

Si la consulta encuentra los mismos datos, recuperar el resultado. Si encuentra datos distintos, mostrar conflicto. Un 404 durante la recuperación significa que todavía no se encontró el registro; no demuestra que otra petición haya terminado. Puede repetirse el envío original, protegido por la idempotencia del backend.

No hay reintentos automáticos de POST. El tiempo máximo es de 15 segundos por defecto y se configura con `SOLICITUD_TIMEOUT_MS`; agotarlo lleva a `unconfirmed`, no a `REJECTED`.

El estado es de memoria: al recargar se pierde el borrador. No guardar solicitudes en `localStorage` en esta versión. La consulta manual por referencia permite recuperar resultados persistidos; recuperar automáticamente un borrador tras recargar queda fuera del alcance.

## 8. API y presentación de resultados

Se conservan los contratos acordados. [^backend]

| Operación desde Angular | Uso |
|---|---|
| `POST /api/applications` | Enviar o repetir una solicitud. |
| `GET /api/applications/{reference}` | Consultar un resultado; codificar el identificador como segmento de URL. |
| `GET /api/applications?limit=20` | Consultar las últimas solicitudes. |

La entrada contiene `applicationReference`, `customerId`, `amount` y `termMonths`. La respuesta añade `status`, `processedAt` y, en rechazos, `reasonCode` y `reason`.

**201 no significa aprobado.** Significa nueva solicitud registrada. HTTP 200 en un POST significa repetición idéntica. La decisión se toma de `status`: `APPROVED` o `REJECTED`.

Mostrar la fecha del backend, nunca inventar la fecha de procesamiento con el reloj del navegador. Mostrar la referencia junto al resultado para identificar qué solicitud se está viendo.

`error-api.mapper.ts` traduce errores HTTP a un objeto pequeño de UI, con mensaje seguro y `traceId` cuando exista. No copia las jerarquías de excepciones Java ni expone SQL o trazas. Un cliente inexistente durante el procesamiento llega como rechazo `CUSTOMER_NOT_FOUND`, no como error de consulta 404.

`solicitud-response.parser.ts` comprueba los campos esenciales, el estado permitido y la fecha recibida. Los tipos de `HttpClient` no validan el JSON en ejecución. Una respuesta desconocida no se convertirá por defecto en una aprobación. [^http]

Cargar recientes al entrar, después de confirmar un resultado y al pulsar actualizar. En la primera carga exitosa, si no existe una consulta activa, seleccionar dinámicamente el primer elemento recibido para abrir su detalle; reutilizar el objeto de la lista y no hacer otro GET. Evitar que una respuesta antigua sobrescriba una consulta posterior. Si falla la actualización, conservar el resultado confirmado y avisar que el listado no pudo actualizarse; **no repetir el POST**. No sustituir un error de listado por un array vacío exitoso.

## 9. Protecciones sin construir otro sistema

**Contenido:** mostrar identificadores, motivos y errores como texto. No usar HTML recibido de la API ni `bypassSecurityTrustHtml` para estos datos. Angular ofrece protecciones de sanitización, pero evitaremos desactivarlas. [^seguridad]

**Datos:** sin credenciales de PostgreSQL o RabbitMQ en Angular, sin registros completos del formulario en consola y sin almacenamiento persistente de solicitudes en el navegador.

**Accesibilidad:** usar etiquetas asociadas a los campos, mensajes vinculados al control, botones nativos y una zona de aviso accesible para resultado/error. El estado se explica con texto e icono. La implementación incluye foco visible, controles de 44 px y traslado de foco al inspector en una columna. [^accesibilidad]

**Límite de seguridad:** este alcance es una demostración local. No incluye autenticación ni autorización. No exponer datos reales o desplegarlo públicamente sin definir esos controles en el backend, HTTPS y protección contra abuso. Ni botones bloqueados, ni CORS, ni guards del frontend reemplazan esos controles. [^seguridad]

## 10. Docker y conexión local

El contenedor frontend construirá Angular en una etapa con Node y servirá los archivos con Nginx. Angular llamará rutas relativas `/api/*`; Nginx reenviará al servicio `backend:8080` quitando `/api`. El nombre `backend` se resuelve entre contenedores, no desde el navegador. [^backend] [^docker] [^nginx]

El retorno de `index.html` para rutas de Angular no debe capturar errores de `/api`. No cachear respuestas de solicitudes en esta primera versión. Publicar los puertos necesarios para la demostración solo en la interfaz local.

Para desarrollo con Angular CLI, configurar un proxy equivalente. El destino depende de si el servidor de desarrollo corre en el host o dentro de Docker. [^proxy]

La cola futura se conectará al backend, nunca directamente al navegador. Angular 22.2, Node 24 y npm 11 están fijados en el manifiesto y el archivo de bloqueo.

## 11. Qué se prueba

Las pruebas de componentes, servicio y store usan Vitest y `HttpTestingController`. En el último cierre pasan 76 pruebas de 9 archivos. La integración real todavía debe comprobarse con el backend activo y, cuando exista en este repositorio, el entorno Docker. [^pruebas]

| Prueba | Resultado esperado |
|---|---|
| Campos y límites | Vacíos y monto cero no envían; plazos 6 y 60 pasan, 5, 61 y fracciones fallan; el primer inválido recibe foco. |
| Revisión y doble envío | El POST espera confirmación; editar conserva valores y dos confirmaciones rápidas producen un solo POST. |
| Respuesta perdida | Reintento con referencia y cuerpo originales; no aparece un rechazo inventado. |
| Decisión y errores | 201 con `REJECTED` se muestra como rechazo; 200, 400, 404, 409 y 5xx siguen sus flujos. |
| Estados compartidos | Los organismos usan el mismo store; errores de consultas no alteran el envío. |
| HTTP y respuesta inválida | Rutas, cuerpos, códigos y parser correctos; respuesta desconocida nunca se muestra como aprobada. |
| Recientes | La primera carga selecciona el primer registro real sin un GET adicional; una actualización fallida no repite el POST ni borra un resultado confirmado. |

La concurrencia del core debe verificarse además con peticiones simultáneas directamente al backend y PostgreSQL real. No añadiremos un botón de “enviar muchas veces” ni quitaremos las protecciones del formulario para demostrarla. [^prueba]

**Pendiente fuera del frontend:** confirmar escala y respuestas monetarias con ejemplos reales, revalidar un POST end-to-end y añadir Docker/Nginx si se incorpora despliegue a este repositorio. Login, estado persistente, colas y funcionalidades adicionales no forman parte de esta etapa.

---

## Referencias

El enunciado define requisitos. `ARQUITECTURA.md` define acuerdos previos. Este documento registra las decisiones concretas implementadas; las fuentes técnicas explican las capacidades utilizadas, no imponen esta estructura.

[^prueba]: `Prueba_Tecnica_Full_Stack_Java_Spring_Boot_WebFlux_Angular_Core_Creditos.pdf`, página 2, RF02–RF07, restricciones y pruebas automatizadas.
[^datos]: Mismo enunciado, página 1, datos mínimos y ejemplos; página 2, RF02.
[^backend]: `ARQUITECTURA.md`, secciones 5–7: idempotencia, errores, API y despliegue. Este documento amplía y concreta su apartado Angular.
[^componentes]: Angular, Components: `https://angular.dev/guide/components`
[^tipado]: Angular, Template type checking: `https://angular.dev/tools/cli/template-typecheck`
[^organizacion]: Angular, Style guide: `https://angular.dev/style-guide`
[^atomico]: Brad Frost, Atomic Design Methodology: `https://atomicdesign.bradfrost.com/chapter-2/`
[^signals]: Angular, Signals: `https://angular.dev/guide/signals`
[^formularios]: Angular, Strictly typed reactive forms: `https://angular.dev/guide/forms/typed-forms`
[^validacion]: Angular, Form validation: `https://angular.dev/guide/forms/form-validation`
[^inyeccion]: Angular, Hierarchical injectors: `https://angular.dev/guide/di/hierarchical-dependency-injection`
[^proveedores]: Angular, Defining dependency providers: `https://angular.dev/guide/di/defining-dependency-providers`
[^http]: Angular, Making HTTP requests: `https://angular.dev/guide/http/making-requests`
[^destruccion]: Angular, takeUntilDestroyed: `https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed`
[^seguridad]: Angular, Security: `https://angular.dev/best-practices/security`
[^accesibilidad]: Angular, Accessibility: `https://angular.dev/best-practices/a11y`
[^docker]: Docker, Networking in Compose: `https://docs.docker.com/compose/how-tos/networking/`
[^nginx]: Nginx, HTTP proxy module: `https://nginx.org/en/docs/http/ngx_http_proxy_module.html`
[^proxy]: Angular, Development server and proxying: `https://angular.dev/tools/cli/serve`
[^pruebas]: Angular, HTTP testing: `https://angular.dev/guide/http/testing`

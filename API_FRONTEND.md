# Contrato de la API para el frontend

Guía de integración del backend de créditos IAS. Describe los endpoints implementados, sus respuestas y cómo interpretarlas desde el frontend.

## 1. URL base y formato

- Backend local: `http://localhost:8080`.
- Solicitudes POST: `Content-Type: application/json`.
- Respuestas de negocio y errores: `application/json`.
- Nombres de campos y códigos: inglés. Mensajes para mostrar al usuario: español.
- Fechas: texto ISO 8601 con zona horaria UTC, por ejemplo `2026-10-01T12:00:00Z`.
- Montos: enviar preferentemente como texto decimal y conservarlos como texto en el frontend. El backend los procesa con `BigDecimal` y siempre los devuelve como texto decimal.

Las rutas del backend son `/applications` y `/applications/{reference}`. Para integrar Angular mediante un proxy con prefijo `/api`, configurar la reescritura de `/api/applications` a `/applications` y usar `/api` como URL base del servicio frontend.

### Endpoints disponibles

| Método | Ruta del backend | Función |
|---|---|---|
| POST | `/applications` | Procesar una solicitud nueva o recuperar el resultado de un reintento idéntico. |
| GET | `/applications/{reference}` | Consultar una solicitud procesada por su referencia. |
| GET | `/applications?limit=20` | Listar las solicitudes procesadas más recientes. |

Swagger UI: `http://localhost:8080/swagger-ui.html`. OpenAPI: `http://localhost:8080/v3/api-docs`.

Los ejemplos siguientes ilustran el contrato. La aprobación depende del estado del cliente y del cupo disponible al procesar la solicitud.

## 2. Crear o reintentar una solicitud

### `POST /applications`

#### Cuerpo de entrada

```json
{
  "applicationReference": "REF-FRONT-001",
  "customerId": "CLI-1001",
  "amount": "1000000.00",
  "termMonths": 12
}
```

| Campo | Tipo recomendado en el frontend | Obligatorio | Comportamiento |
|---|---|---|---|
| `applicationReference` | `string` | Sí | Referencia única para una solicitud nueva. No puede ser nula ni estar en blanco. |
| `customerId` | `string` | Sí | Identificador solicitado. No puede ser nulo ni estar en blanco. |
| `amount` | `string` decimal | Sí | Usar punto decimal, sin símbolos monetarios ni separadores de miles: `"1000000.00"`. El backend también admite un número JSON. |
| `termMonths` | `number` entero | Sí | Para aprobar, debe estar entre 6 y 60, inclusive. |

Los identificadores se conservan como se reciben: el backend no recorta espacios ni cambia mayúsculas/minúsculas. El frontend debe decidir y aplicar su formato antes del primer envío, y conservarlo al reintentar.

### Solicitud nueva aprobada: HTTP 201

```json
{
  "applicationReference": "REF-FRONT-001",
  "customerId": "CLI-1001",
  "amount": "1000000.00",
  "termMonths": 12,
  "status": "APPROVED",
  "message": "Esta solicitud fue aprobada",
  "processedAt": "2026-10-01T12:00:00Z",
  "reasonCode": null,
  "reason": null
}
```

**Frontend:** mostrar la aprobación y actualizar el listado. `reasonCode` y `reason` son nulos.

### Solicitud nueva rechazada: HTTP 201

Ejemplo de entrada para un cliente bloqueado:

```json
{
  "applicationReference": "REF-FRONT-002",
  "customerId": "CLI-1002",
  "amount": "500000.00",
  "termMonths": 12
}
```

Respuesta:

```json
{
  "applicationReference": "REF-FRONT-002",
  "customerId": "CLI-1002",
  "amount": "500000.00",
  "termMonths": 12,
  "status": "REJECTED",
  "message": "Esta solicitud fue rechazada",
  "processedAt": "2026-10-01T12:01:00Z",
  "reasonCode": "CUSTOMER_BLOCKED",
  "reason": "El cliente no está habilitado"
}
```

**Frontend:** mostrar el rechazo y su `reason`, y actualizar el listado. La solicitud quedó guardada. Un rechazo de crédito es una respuesta de negocio exitosa y llega por el flujo exitoso de `HttpClient`, porque su HTTP es 201.

### Reintento idéntico: HTTP 200

Si se vuelve a enviar `REF-FRONT-001` con el mismo cliente, monto y plazo:

```json
{
  "applicationReference": "REF-FRONT-001",
  "customerId": "CLI-1001",
  "amount": "1000000.00",
  "termMonths": 12,
  "status": "APPROVED",
  "message": "Esta solicitud ya fue aprobada",
  "processedAt": "2026-10-01T12:00:00Z",
  "reasonCode": null,
  "reason": null
}
```

Si se vuelve a enviar `REF-FRONT-002` con sus mismos datos:

```json
{
  "applicationReference": "REF-FRONT-002",
  "customerId": "CLI-1002",
  "amount": "500000.00",
  "termMonths": 12,
  "status": "REJECTED",
  "message": "Esta solicitud ya fue rechazada",
  "processedAt": "2026-10-01T12:01:00Z",
  "reasonCode": "CUSTOMER_BLOCKED",
  "reason": "El cliente no está habilitado"
}
```

En ambos casos:

- Se devuelve el resultado original, con su fecha y motivo originales.
- No se crea otra solicitud ni se consume cupo adicional.
- No se reevalúa la decisión, aunque cambien el cupo o el estado del cliente.
- El monto se compara numéricamente: `"1000000"` y `"1000000.00"` representan el mismo monto. El texto devuelto es el de la solicitud persistida, no necesariamente el enviado en el reintento.

**Frontend:** mostrar `message` y actualizar el registro identificado por `applicationReference`, sin duplicarlo en el listado.

### Misma referencia con datos diferentes: HTTP 409

Cambiar cliente, monto o plazo después de procesar una referencia produce:

```json
{
  "code": "REFERENCE_CONFLICT",
  "message": "La referencia REF-FRONT-001 ya está asociada a una solicitud con datos diferentes",
  "traceId": "7a0fd604-7f80-4bce-a2af-b840bcc3191e"
}
```

**Frontend:** mostrar el conflicto. Para crear una solicitud distinta, generar una referencia nueva. Para recuperar la anterior, consultarla por referencia. La solicitud original conserva sus datos y su decisión.

### Resumen de estados de POST

| HTTP | Cuerpo | Interpretación |
|---|---|---|
| 201 | Respuesta de solicitud | Solicitud nueva persistida. Revisar `status` para distinguir aprobación y rechazo. |
| 200 | Respuesta de solicitud | Reintento idéntico; se devuelve el resultado original. |
| 400 | Respuesta de error | Datos obligatorios ausentes, identificadores en blanco, cuerpo vacío, JSON o tipos inválidos. |
| 409 | Respuesta de error | Referencia procesada previamente con otros datos. |
| 413 | Respuesta de error | Cuerpo de la petición demasiado grande. |
| 415 | Respuesta de error | Tipo de contenido no soportado. |
| 500 | Respuesta de error | Fallo técnico. No significa rechazo de crédito. |

## 3. Consultar una solicitud

### `GET /applications/{reference}`

Ejemplo:

```http
GET /applications/REF-FRONT-001
Accept: application/json
```

### Solicitud encontrada: HTTP 200

```json
{
  "applicationReference": "REF-FRONT-001",
  "customerId": "CLI-1001",
  "amount": "1000000.00",
  "termMonths": 12,
  "status": "APPROVED",
  "message": "Esta solicitud fue aprobada",
  "processedAt": "2026-10-01T12:00:00Z",
  "reasonCode": null,
  "reason": null
}
```

Las solicitudes rechazadas también devuelven HTTP 200, con `status: "REJECTED"`, `message: "Esta solicitud fue rechazada"`, `reasonCode` y `reason`. El formato es el mismo que en POST.

La consulta usa «fue aprobada/rechazada»; el mensaje «ya fue aprobada/rechazada» corresponde al reintento por POST.

### Referencia inexistente: HTTP 404

```json
{
  "code": "APPLICATION_NOT_FOUND",
  "message": "No se encontró la solicitud con referencia: REF-FRONT-MISSING",
  "traceId": "7a0fd604-7f80-4bce-a2af-b840bcc3191e"
}
```

**Frontend:** mostrar que no se encontró la solicitud. Codificar la referencia para la URL con `encodeURIComponent(reference)`.

Otros errores: HTTP 400 para una referencia inválida y HTTP 500 para un fallo técnico. Un cliente inexistente en POST genera un rechazo `CUSTOMER_NOT_FOUND` con HTTP 201; el 404 de esta consulta corresponde a una solicitud inexistente.

## 4. Listar solicitudes recientes

### `GET /applications?limit=20`

| Parámetro | Obligatorio | Valor por defecto | Rango |
|---|---|---|---|
| `limit` | No | 20 | Entero entre 1 y 100, inclusive. |

Ejemplos:

```http
GET /applications
GET /applications?limit=2
```

### Lista encontrada: HTTP 200

```json
[
  {
    "applicationReference": "REF-FRONT-002",
    "customerId": "CLI-1002",
    "amount": "500000.00",
    "termMonths": 12,
    "status": "REJECTED",
    "message": "Esta solicitud fue rechazada",
    "processedAt": "2026-10-01T12:01:00Z",
    "reasonCode": "CUSTOMER_BLOCKED",
    "reason": "El cliente no está habilitado"
  },
  {
    "applicationReference": "REF-FRONT-001",
    "customerId": "CLI-1001",
    "amount": "1000000.00",
    "termMonths": 12,
    "status": "APPROVED",
    "message": "Esta solicitud fue aprobada",
    "processedAt": "2026-10-01T12:00:00Z",
    "reasonCode": null,
    "reason": null
  }
]
```

- La respuesta es un arreglo JSON directo; no tiene un contenedor `data` ni metadatos de paginación.
- Incluye aprobaciones y rechazos, del más reciente al más antiguo.
- Si las fechas coinciden, el orden se desempata por el identificador interno descendente.
- `limit` es el máximo de resultados, no una cantidad garantizada.
- Sin solicitudes: HTTP 200 con `[]`. Mostrar el estado de lista vacía.

### Límite inválido: HTTP 400

Para `limit=0`, `limit=-1` o `limit=101`:

```json
{
  "code": "INVALID_APPLICATION_DATA",
  "message": "El límite debe estar entre 1 y 100",
  "traceId": "7a0fd604-7f80-4bce-a2af-b840bcc3191e"
}
```

Para `limit=abc` o un valor no interpretable como entero:

```json
{
  "code": "INVALID_REQUEST",
  "message": "El cuerpo o los parámetros de la petición no son válidos",
  "traceId": "7a0fd604-7f80-4bce-a2af-b840bcc3191e"
}
```

Un fallo técnico devuelve HTTP 500 con el contrato de error común.

## 5. Contrato común de las respuestas de solicitud

| Campo | Tipo JSON | Uso en el frontend |
|---|---|---|
| `applicationReference` | `string` | Identificar el registro y evitar duplicados visuales. |
| `customerId` | `string` | Identificador solicitado, incluso si el cliente no existe. |
| `amount` | `string` | Mostrar el monto conservando precisión decimal. |
| `termMonths` | `number` entero | Mostrar el plazo. |
| `status` | `"APPROVED"` o `"REJECTED"` | Decidir el estado visual del resultado. |
| `message` | `string` | Mostrar el resultado o indicar que ya estaba procesado. |
| `processedAt` | `string` ISO 8601 | Fecha original de procesamiento; convertir para presentación local. |
| `reasonCode` | `string` o `null` | Código estable del motivo de rechazo; nulo en aprobaciones. |
| `reason` | `string` o `null` | Explicación del rechazo; nula en aprobaciones. |

Para lógica del frontend usar `status`, `reasonCode` y el estado HTTP. `message` y `reason` son textos de presentación; pueden cambiar o conservar una descripción histórica.

### Motivos de rechazo

| `reasonCode` | Descripción actual | Significado |
|---|---|---|
| `INVALID_AMOUNT` | El monto debe ser mayor que cero | Se solicitó un monto cero o negativo. |
| `INVALID_TERM` | El plazo debe estar entre 6 y 60 meses | El plazo está fuera del rango permitido. |
| `CUSTOMER_NOT_FOUND` | El cliente no existe | No se encontró el identificador recibido. |
| `CUSTOMER_BLOCKED` | El cliente no está habilitado | El cliente está bloqueado. |
| `INSUFFICIENT_LIMIT` | El cupo disponible es insuficiente | El acumulado aprobado más el monto solicitado supera el cupo. |

Si el cliente existe, la precedencia es monto, plazo, estado del cliente y cupo. Si no existe, el motivo es `CUSTOMER_NOT_FOUND`.

El cupo se consume sumando todas las solicitudes aprobadas del cliente. Los rechazos y los reintentos idénticos no consumen cupo. Completar exactamente el cupo está permitido.

## 6. Contrato común de errores

```json
{
  "code": "INVALID_APPLICATION_DATA",
  "message": "El monto de la solicitud es obligatorio",
  "traceId": "7a0fd604-7f80-4bce-a2af-b840bcc3191e"
}
```

La cabecera `X-Trace-Id` contiene el mismo valor que `traceId`. Está presente en las respuestas de error generadas por el manejador global; no se debe asumir su presencia en respuestas exitosas.

| HTTP | `code` | Manejo recomendado |
|---|---|---|
| 400 | `INVALID_APPLICATION_DATA` | Mostrar `message` y permitir corregir los datos. |
| 400 | `INVALID_REQUEST` | Revisar el formato del cuerpo o los parámetros. |
| 404 | `APPLICATION_NOT_FOUND` | Mostrar que la referencia no tiene una solicitud procesada. |
| 404 | `RESOURCE_NOT_FOUND` | Revisar la ruta utilizada. |
| 409 | `REFERENCE_CONFLICT` | Recuperar la solicitud original o usar una referencia nueva para otra solicitud. |
| 413 | `PAYLOAD_TOO_LARGE` | Reducir el cuerpo enviado. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Enviar JSON con `Content-Type: application/json`. |
| 500 | `INTERNAL_ERROR` | Mostrar el mensaje genérico y conservar `traceId` para diagnóstico. |

El manejador global también puede representar errores HTTP con `METHOD_NOT_ALLOWED` (405), `NOT_ACCEPTABLE` (406), `HTTP_ERROR` para otros errores HTTP no 5xx e `INTERNAL_ERROR` para otros errores 5xx. No depender de esos códigos para interpretar una decisión de crédito.

### Mensajes de validación habituales

| Condición | `message` |
|---|---|
| Referencia nula, ausente o en blanco | La referencia de la solicitud es obligatoria |
| Cliente nulo, ausente o en blanco | El identificador del cliente es obligatorio |
| Monto nulo o ausente | El monto de la solicitud es obligatorio |
| Plazo nulo o ausente | El plazo de la solicitud es obligatorio |
| Límite de consulta fuera de rango | El límite debe estar entre 1 y 100 |
| JSON ilegible, cuerpo vacío o parámetro no interpretable | El cuerpo o los parámetros de la petición no son válidos |

Se informa el primer error encontrado; no se devuelve un arreglo de errores por campo. El cuerpo de error no incluye un campo `field`, por lo que el frontend debe validar sus campos localmente y mostrar `message` como detalle del backend.

### Fallo técnico: HTTP 500

```json
{
  "code": "INTERNAL_ERROR",
  "message": "No fue posible procesar la petición",
  "traceId": "7a0fd604-7f80-4bce-a2af-b840bcc3191e"
}
```

Un fallo técnico no debe mostrarse como «crédito rechazado». Tampoco debe agregarse al listado como si fuera una solicitud con `status: "REJECTED"`.

## 7. Tipos TypeScript sugeridos

```typescript
export type ApplicationStatus = 'APPROVED' | 'REJECTED';

export type RejectionReasonCode =
  | 'INVALID_AMOUNT'
  | 'INVALID_TERM'
  | 'CUSTOMER_NOT_FOUND'
  | 'CUSTOMER_BLOCKED'
  | 'INSUFFICIENT_LIMIT';

export interface ApplicationRequest {
  applicationReference: string;
  customerId: string;
  amount: string;
  termMonths: number;
}

export interface ApplicationResponse {
  applicationReference: string;
  customerId: string;
  amount: string;
  termMonths: number;
  status: ApplicationStatus;
  message: string;
  processedAt: string;
  reasonCode: RejectionReasonCode | null;
  reason: string | null;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  traceId: string;
}

export type RecentApplicationsResponse = ApplicationResponse[];
```

En Angular, solicitar la respuesta HTTP completa en POST para distinguir 201 de 200:

```typescript
this.http.post<ApplicationResponse>(
  `${apiBaseUrl}/applications`,
  request,
  { observe: 'response' }
);
```

- En el flujo exitoso, revisar `response.status` y `response.body.status`.
- Si `response.body.status === 'REJECTED'`, mostrar `message` y `reason`.
- En el flujo de error, los datos del backend están en `HttpErrorResponse.error`.
- Un error de red o un timeout puede no traer el contrato JSON. En Angular, `status === 0` indica un problema de comunicación; no es un estado HTTP devuelto por este backend.

## 8. Referencias, reintentos y estado de la pantalla

1. Crear una referencia una sola vez para cada intención de solicitud nueva; por ejemplo, `crypto.randomUUID()`.
2. Conservar la referencia y los datos exactos enviados mientras la solicitud esté pendiente o se reintente.
3. Para un nuevo crédito, generar una referencia distinta, aunque sea para el mismo cliente y monto.
4. Si se pierde la respuesta por un timeout o error de red, el resultado puede haberse guardado. Consultar la referencia o reintentar POST con la misma referencia y datos.
5. Para editar una solicitud ya procesada, iniciar una solicitud nueva con otra referencia. El backend conserva las decisiones originales.
6. Identificar los elementos del listado por `applicationReference`. Un reintento debe actualizar el elemento existente.
7. Mantener `amount` como texto decimal en el estado y al reenviar. Convertirlo a `number` para cálculos monetarios puede perder precisión.
8. Validar presencia, monto positivo y plazo entero entre 6 y 60 para orientar el formulario. El backend sigue siendo quien decide la aprobación según el cliente y el cupo.

La API actual no expone endpoints de catálogo de clientes, consulta de cupo disponible, edición o eliminación de solicitudes. Tampoco devuelve el cupo restante en la respuesta de procesamiento. El listado de recientes puede estar limitado y no permite calcular de forma completa el cupo disponible del cliente.

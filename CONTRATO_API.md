# Integración con el backend

Fuente de peticiones: `IAS.postman_collection.json`. Las respuestas y los códigos
siguen `ARQUITECTURA_FRONTEND.md` hasta disponer de ejemplos reales del backend.
La colección no contiene respuestas guardadas.

## Rutas

| Navegador | Backend local |
| --- | --- |
| `POST /api/applications` | `POST http://localhost:8080/applications` |
| `GET /api/applications/{reference}` | `GET http://localhost:8080/applications/{reference}` |
| `GET /api/applications?limit=20` | `GET http://localhost:8080/applications?limit=20` |

`proxy.conf.cjs` elimina `/api` durante el desarrollo. La referencia se codifica
como un segmento de URL. El listado esperado es un array JSON, incluso vacío.

## Dinero

La colección actualiza el ejemplo anterior: `amount` se envía como **string decimal**,
por ejemplo `"1000000.00"`. El formulario conserva ese texto y los reintentos envían
exactamente el mismo cuerpo. No convierte el monto a `Number`, no lo redondea y
no impone un máximo ni una escala. El separador decimal de transporte es el punto.

El parser admite respuestas con monto textual y, provisionalmente, números JSON
finitos dentro del rango seguro de JavaScript, según el diseño original. Los
números JSON no garantizan precisión decimal arbitraria; para ella, el backend
debe responder también con texto. Se comparan representaciones decimales sin
aritmética de punto flotante (`1.00` equivale a `1`). Moneda y escala siguen pendientes.

## Respuestas esperadas

- Campos: los cuatro de entrada, `status` y `processedAt` con zona horaria.
- `status`: `APPROVED` o `REJECTED`; el rechazo incluye `reasonCode` y `reason`.
- POST 201: registro nuevo; POST 200: repetición idéntica. Ambos pueden ser rechazos.
- 400 permite corregir; 409 indica conflicto; 404 en consulta indica no encontrado.
- Red, timeout, 5xx y respuesta incompatible dejan un envío sin confirmar.
- Los mensajes HTTP se traducen a textos de interfaz; solo se conserva el
  identificador `traceId` o `requestId`, sin mostrar trazas del servidor.
- Espera predeterminada: 15 segundos, configurable con `SOLICITUD_TIMEOUT_MS`.

## Verificación inicial local

El listado respondió `200` con `[]`. Una consulta inexistente y un POST de prueba
con cliente inexistente respondieron `500`, en vez de los resultados previstos.
El backend todavía requiere validar esos flujos; la interfaz conserva la
incertidumbre y permite recuperación sin inventar una decisión de crédito.

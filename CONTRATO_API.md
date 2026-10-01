# Integración con el backend

Fuente de peticiones: `IAS.postman_collection.json`. La colección no contiene
respuestas guardadas. Las formas y códigos siguen `ARQUITECTURA_FRONTEND.md`;
el listado se observó en ejecución, pero el POST y todos los errores todavía deben
revalidarse con el backend real disponible.

## Rutas

| Navegador | Backend local |
| --- | --- |
| `POST /api/applications` | `POST http://localhost:8080/applications` |
| `GET /api/applications/{reference}` | `GET http://localhost:8080/applications/{reference}` |
| `GET /api/applications?limit=20` | `GET http://localhost:8080/applications?limit=20` |

`proxy.conf.cjs` elimina `/api` durante el desarrollo. La referencia se codifica
como un segmento de URL. El listado esperado es un array JSON, incluso vacío.

## Dinero

La colección actualiza el ejemplo anterior: `amount` se envía como **string decimal
en COP**, por ejemplo `"1000000.00"`. El formulario conserva ese texto, la revisión
lo presenta sin alterar el snapshot y los reintentos envían exactamente el mismo cuerpo.
No convierte el monto a `Number`, no lo redondea y no impone un máximo ni una escala.
El separador decimal de transporte es el punto.

El parser admite respuestas con monto textual y, provisionalmente, números JSON
finitos dentro del rango seguro de JavaScript, según el diseño original. Los
números JSON no garantizan precisión decimal arbitraria; para ella, el backend
debe responder también con texto. Se comparan representaciones decimales sin
aritmética de punto flotante (`1.00` equivale a `1`). La moneda ya está fijada en COP;
la escala admitida y la serialización definitiva de las respuestas aún deben confirmarse
contra ejemplos reales del backend.

## Respuestas esperadas

- Campos: los cuatro de entrada, `status` y `processedAt` con zona horaria.
- `status`: `APPROVED` o `REJECTED`; el rechazo incluye `reasonCode` y `reason`.
- POST 201: registro nuevo; POST 200: repetición idéntica. Ambos pueden ser rechazos.
- 400 permite corregir; 409 indica conflicto; 404 en consulta indica no encontrado.
- Red, timeout, 5xx y respuesta incompatible dejan un envío sin confirmar.
- Los mensajes HTTP se traducen a textos de interfaz; solo se conserva el
  identificador `traceId` o `requestId`, sin mostrar trazas del servidor.
- Espera predeterminada: 15 segundos, configurable con `SOLICITUD_TIMEOUT_MS`.

## Estado de la verificación local

Durante la sesión del 1 de octubre de 2026, el proxy llegó a cargar nueve solicitudes
reales desde el backend. En la comprobación final, `localhost:8080` ya no aceptaba
conexiones y `/api/applications` respondió 502 por esa causa.

La suite automatizada valida las rutas, el cuerpo exacto, los códigos y el parser
mediante `HttpTestingController`. Para cerrar una prueba end-to-end de escritura se
debe reiniciar el backend y verificar un POST, su consulta por referencia y su aparición
en recientes. La interfaz mantiene `unconfirmed` ante incertidumbre y no inventa una
decisión de crédito.

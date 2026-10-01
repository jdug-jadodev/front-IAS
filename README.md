# BancoIAS · solicitudes de crédito

Frontend Angular para registrar solicitudes de crédito, revisar los datos antes de enviarlos, consultar resultados por referencia y explorar las operaciones recientes.

La interfaz aplica una identidad visual clara de IAS Software, con fondo `#f7f9fe`, azul eléctrico `#2454f5` y tipografía Montserrat, y consume el backend mediante rutas relativas `/api`. No contiene datos simulados ni reproduce el JavaScript del archivo visual de referencia.

## Funcionalidad

- Alta con Reactive Forms tipados y validación accesible.
- Revisión explícita de cliente, monto y plazo antes del POST.
- Cliente y referencia de búsqueda convertidos a mayúsculas antes del POST o GET correspondiente; la referencia de la solicitud la genera el backend.
- Monto decimal conservado como `string`, sin convertirlo a punto flotante.
- Estados de envío separados: en curso, resuelto, inválido, conflicto y sin confirmar.
- Recuperación de respuestas inciertas mediante reintento del cuerpo exacto y la misma `Idempotency-Key`.
- Mensajes, motivos y trazabilidad tomados del contrato real del backend.
- Consulta por referencia e historial paginado de hasta 20 solicitudes por página.
- Actualización local por referencia antes del refresco, sin duplicar reintentos.
- Selección inicial del primer registro real recibido, sin una consulta GET adicional.
- Borrador conservado al alternar entre alta y consulta durante la sesión.
- Navegación suave entre tres vistas persistentes mediante los fragmentos `#solicitud`, `#comprobante` y `#consulta`, sin destruir el formulario ni los organismos.
- Comprobante de envío como vista completa y consulta con buscador y detalle en paralelo; en móvil los bloques se apilan sin perder funcionalidad.
- Ilustración vinculada únicamente al foco del campo, con precarga, cancelación del cambio pendiente, última selección prevalente y movimiento reducido.

## Presentación visual

La vista `#solicitud` coloca una ilustración PNG transparente a la izquierda y la tarjeta del formulario a la derecha. Al confirmar, la navegación lleva a `#comprobante`, que dedica la pantalla al estado del envío y a su resultado. Los enlaces de consulta llevan a `#consulta`, donde el buscador y la tarjeta de detalle comparten la composición en escritorio y se apilan en móvil. Las tres vistas permanecen montadas: la navegación visual no recrea el formulario, el resultado, la consulta ni la instancia del store.

En la solicitud, el foco selecciona la escena sin alterar el flujo funcional: monto usa `portatil.png`, plazo `bicicleta.png` y cliente usa `hogar.png`. Cada cambio espera 200 ms, cancela la selección pendiente y conserva la imagen actual mientras la siguiente se precarga y decodifica. Después aplica una disolución suave de 1050 ms con `cubic-bezier(.37, 0, .63, 1)`, sin desplazamiento ni giro y respetando `prefers-reduced-motion`. Este estado es local a la página de composición y no modifica validadores, store, peticiones, resultados o consultas.

El identificador del cliente y la referencia del buscador se normalizan con mayúsculas antes de la primera petición correspondiente, sin aplicar `trim`. El snapshot de envío y su `Idempotency-Key` se conservan sin cambios para cualquier reintento; `amount` sigue viajando como el mismo string decimal introducido.

## Requisitos

- Node.js 24 LTS (`24.21.0` recomendado).
- npm 11.
- Backend disponible en `http://localhost:8080` para usar los flujos reales.

## Instalación y desarrollo

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200/`. `proxy.conf.cjs` reenvía `/api/*` al backend local y elimina el prefijo `/api`.

## Verificaciones

```bash
npm run format:check
npm run build
npm test -- --watch=false
```

Las 101 pruebas aprobadas en 10 archivos cubren validadores, DTO completo, estados HTTP 200/201, errores contractuales, parser defensivo, store, doble envío, recuperación, upsert, navegación, foco y preservación del borrador.

## Documentación

- [Arquitectura del frontend](ARQUITECTURA_FRONTEND.md)
- [Contexto para continuar con IA](CONTEXTO_IA_FRONTEND.md)
- [Contrato de la API para el frontend](API_FRONTEND.md)
- [Uso de IA y referencias de diseño](USO_IA.md)

## Límites conocidos

- El borrador vive en memoria: recargar la pestaña lo elimina.
- No hay autenticación ni autorización; el alcance es una demostración local.
- La dirección visual clara es fija; no hay selector de tema.
- La disponibilidad, persistencia e idempotencia entre clientes pertenecen al backend.
- `bancoias-demo.html` es únicamente una referencia visual local y no forma parte del bundle Angular.

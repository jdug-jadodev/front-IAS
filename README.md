# BancoIAS · solicitudes de crédito

Frontend Angular para registrar solicitudes de crédito, revisar los datos antes de enviarlos, consultar resultados por referencia y explorar las operaciones recientes.

La interfaz aplica la identidad visual oscura de IAS Software y consume el backend mediante rutas relativas `/api`. No contiene datos simulados ni reproduce el JavaScript del archivo visual de referencia.

## Funcionalidad

- Alta con Reactive Forms tipados y validación accesible.
- Revisión explícita de referencia, cliente, monto y plazo antes del POST.
- Monto decimal conservado como `string`, sin convertirlo a punto flotante.
- Estados de envío separados: en curso, resuelto, inválido, conflicto y sin confirmar.
- Recuperación de respuestas inciertas mediante consulta o reintento del cuerpo exacto.
- Consulta por referencia y listado de las últimas 20 solicitudes.
- Selección inicial del primer registro real recibido, sin una consulta GET adicional.
- Borrador conservado al alternar entre alta y consulta durante la sesión.
- Presentación adaptable maestro–detalle, navegación por teclado y movimiento reducido.

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

Las 76 pruebas aprobadas cubren validadores, contrato HTTP, parser defensivo, store, doble envío, revisión previa, recuperación, selección inicial, foco y preservación del borrador.

## Documentación

- [Arquitectura del frontend](ARQUITECTURA_FRONTEND.md)
- [Contexto para continuar con IA](CONTEXTO_IA_FRONTEND.md)
- [Contrato de integración](CONTRATO_API.md)
- [Uso de IA y referencias de diseño](USO_IA.md)

## Límites conocidos

- El borrador vive en memoria: recargar la pestaña lo elimina.
- No hay autenticación ni autorización; el alcance es una demostración local.
- El tema oscuro es fijo; no hay selector de tema ni variante clara.
- La disponibilidad, persistencia e idempotencia entre clientes pertenecen al backend.
- `bancoias-identidad-ias.html` es únicamente una referencia visual local y no forma parte del bundle Angular.

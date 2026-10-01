# Uso de IA y referencias de diseño

## Alcance

La IA se utilizó como apoyo para:

- inspeccionar el repositorio y el contrato existente;
- comparar la aplicación con `bancoias-demo.html`;
- proponer y ejecutar la refactorización Angular;
- revisar accesibilidad, estados difíciles y adaptación responsive;
- ampliar pruebas automatizadas;
- reconciliar la documentación con el código final.

Las decisiones de negocio no se delegaron a una respuesta generativa: se conservaron las rutas, estados y reglas del contrato local, y cada cambio de código se verificó con build y pruebas.

## Referencias consultadas

Las skills solicitadas no estaban instaladas como comandos ejecutables en este entorno. Para mantener su intención se consultaron sus fuentes oficiales:

- [Impeccable](https://github.com/pbakaus/impeccable): forma, craft floor, hardening, crítica y pulido.
- [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design): dirección visual específica y rechazo de una apariencia genérica.
- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines): controles, foco, formularios, movimiento y responsive.

El HTML entregado por el usuario fue la autoridad para composición, color, marca, tono y transición de ilustraciones. La aplicación adopta la variante clara solicitada con fondo `#f7f9fe`, azul eléctrico `#2454f5` y Montserrat, trasladándola a componentes y plantillas Angular.

No se copiaron mocks, datos de ejemplo, identificadores, montos, decisiones, scripts de manipulación del DOM ni comportamiento simulado. La interfaz trabaja con los resultados reales del backend.

## Decisiones influenciadas por la revisión

### Identidad

- Paleta clara con fondo `#f7f9fe` y azul eléctrico `#2454f5`, manteniendo contraste accesible para texto, controles, foco y estados.
- Montserrat como fuente de marca con Arial como fallback.
- Tres vistas persistentes en la misma página: solicitud con hero y formulario, comprobante de pantalla completa y consulta con buscador y detalle en paralelo.
- Sin gradientes decorativos adicionales, sombras intensas o tarjetas anidadas sin función.
- Sin selector de tema; la dirección visual implementada es clara.

### Interacción

- Los enlaces navegan suavemente mediante `#solicitud`, `#comprobante` y `#consulta`; los organismos y el store conservan su identidad durante el cambio visual.
- En `#consulta`, buscador y detalle se muestran lado a lado en escritorio y se apilan en móvil.
- Escenas por foco: monto usa `portatil.png`, plazo `bicicleta.png`, cliente `hogar.png` y referencia `solicitud.png`.
- Cambio latest-wins con espera cancelable de 200 ms, precarga y decodificación antes de conmutar, y conservación de la escena anterior hasta que la siguiente esté lista.
- Disolución de 1050 ms con `cubic-bezier(.37, 0, .63, 1)`, sin desplazamiento vertical ni giro.
- La primera carga exitosa selecciona dinámicamente el primer registro real, sin hardcodear una referencia ni lanzar otro GET.
- Formulario conservado en el DOM para proteger el borrador al consultar.
- Revisión de los cuatro datos antes de un POST financiero.
- Confirmación seguida de una transición hacia el comprobante completo, en vez de sustituir contenido dentro de la tarjeta del formulario.
- Confirmación antes de descartar un borrador modificado.
- Foco gestionado hacia el resultado cuando la acción lo requiere, sin que los cambios de ilustración lo roben.
- Recuperación explícita para resultados sin confirmar.

### Accesibilidad

- Controles nativos con etiquetas, ayudas y errores asociados.
- Altura interactiva mínima de 44 px.
- Foco visible y primer campo inválido enfocado.
- Estados expresados con texto e icono, no solo color.
- Respeto de `prefers-reduced-motion`.
- Diseño comprobado en escritorio, anchura intermedia y vista estrecha.

## Salvaguardas técnicas

- `amount` permanece como string decimal y no se convierte a punto flotante.
- Referencia, cliente y búsqueda se convierten a mayúsculas antes del primer POST o GET, sin `trim`; el monto queda intacto y cada reintento conserva el snapshot exacto ya enviado.
- La respuesta HTTP se valida en ejecución antes de presentarla.
- Un error de red o contrato no se transforma en una decisión de crédito.
- El store conserva un snapshot exacto para recuperación y bloquea el doble envío.
- Los organismos comparten una instancia de estado limitada a la página.
- La escena usa estado visual local de `SolicitudesPage`, responsable de la composición, y no modifica Reactive Forms, store, API, resultados ni consultas.
- No se añadieron dependencias visuales ni librerías de iconos.

## Evidencia

En el cierre funcional previo a esta documentación:

- 10 archivos de pruebas y 105 de 105 pruebas aprobaron;
- el build de producción aprobó;
- la consulta por referencia se verificó contra el backend; el listado quedó expresamente pendiente de su nuevo contrato, sin cambiar parámetros por suposición;
- no se ejecutó un POST real para evitar modificar los datos del backend; su cuerpo exacto, el bloqueo de doble envío y la recuperación quedaron cubiertos por pruebas automatizadas;
- el HTML de referencia se mantuvo fuera del bundle.

La evidencia vigente debe regenerarse si cambian el contrato, el backend o la versión de Angular.

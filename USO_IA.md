# Uso de IA y referencias de diseño

## Alcance

La IA se utilizó como apoyo para:

- inspeccionar el repositorio y el contrato existente;
- comparar la aplicación con `bancoias-identidad-ias.html`;
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

El HTML entregado por el usuario fue la autoridad para color, marca y tono. No se copiaron sus datos de ejemplo, scripts de manipulación del DOM ni comportamiento simulado.

## Decisiones influenciadas por la revisión

### Identidad

- Paleta IAS: `#023365`, `#0997E6`, `#FEBD04` y `#FB2F70`.
- Montserrat como fuente de marca con Arial como fallback.
- Masthead azul marino, franja multicolor y jerarquía compacta.
- Sin gradientes decorativos adicionales, sombras intensas o tarjetas anidadas sin función.

### Interacción

- Composición maestro–detalle para mantener búsqueda, recientes y contexto visibles.
- Formulario conservado en el DOM para proteger el borrador al consultar.
- Revisión de los cuatro datos antes de un POST financiero.
- Confirmación antes de descartar un borrador modificado.
- Foco trasladado al inspector cuando el resultado queda debajo del historial en una columna.
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
- La respuesta HTTP se valida en ejecución antes de presentarla.
- Un error de red o contrato no se transforma en una decisión de crédito.
- El store conserva un snapshot exacto para recuperación y bloquea el doble envío.
- Los organismos comparten una instancia de estado limitada a la página.
- No se añadieron dependencias visuales ni librerías de iconos.

## Evidencia

En el cierre funcional previo a esta documentación:

- 9 archivos de pruebas y 74 pruebas aprobaron;
- el build de producción aprobó;
- el proxy llegó a mostrar nueve solicitudes reales;
- la revisión final del backend falló por conexión rechazada en `localhost:8080`, por lo que el POST end-to-end quedó pendiente de repetir;
- el HTML de referencia se mantuvo fuera del bundle.

La evidencia vigente debe regenerarse si cambian el contrato, el backend o la versión de Angular.

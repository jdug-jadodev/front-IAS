# Guía visual implementada para BancoIAS

**Estado al 1 de octubre de 2026:** identidad y tokens aplicados en la interfaz Angular. `bancoias-identidad-ias.html` se utilizó como autoridad visual, no como código de producción.

Esta guía busca una interfaz sobria, clara y confiable para registrar y consultar solicitudes de crédito. La presentación debe ayudar a distinguir datos, acciones y estados sin depender únicamente del color.

## 1. Principios visuales

- **Confianza:** usar una base azul institucional, superficies limpias y jerarquías previsibles.
- **Claridad:** priorizar etiquetas explícitas, mensajes breves y suficiente espacio entre bloques.
- **Accesibilidad:** mantener contraste WCAG AA, foco visible y estados acompañados por texto e iconos.
- **Consistencia:** consumir tokens semánticos en lugar de repetir valores directos en componentes.
- **Sobriedad:** reservar el gradiente para la franja de marca; evitar gradientes adicionales, sombras fuertes y animaciones que distraigan del proceso.

## 2. Paleta base

### Marca y acciones

| Token | Color | Uso |
|---|---:|---|
| `--color-brand-navy` | `#023365` | Cabecera, títulos fuertes e identidad BancoIAS. |
| `--color-brand-blue` | `#0997E6` | Acento IAS e interacción. |
| `--color-brand-yellow` | `#FEBD04` | Acción primaria y franja de marca. |
| `--color-brand-pink` | `#FB2F70` | Acento limitado en la franja de marca. |
| `--color-focus` | `#087FBE` | Anillo de foco visible. |

El botón principal usa amarillo con texto azul marino. El masthead usa azul marino con texto blanco. Ningún color de marca comunica por sí solo el estado de una solicitud.

### Superficies y texto

| Token | Color | Uso |
|---|---:|---|
| `--color-background` | `#F1F5FA` | Fondo general de la aplicación. |
| `--color-surface` | `#FFFFFF` | Tarjetas, formulario y paneles. |
| `--color-surface-muted` | `#EAF4FC` | Resúmenes y secciones secundarias. |
| `--color-text` | `#193754` | Texto principal. |
| `--color-text-muted` | `#53677E` | Ayudas y metadatos. |
| `--color-border` | `#D6E1EC` | Bordes y divisores. |
| `--color-control-border` | `#71849A` | Contorno de controles. |

### Estados semánticos

| Estado | Texto/icono | Fondo suave | Uso previsto |
|---|---:|---:|---|
| Aprobado | `#176543` | `#E8F5ED` | Solicitud procesada con estado `APPROVED`. |
| Rechazado | `#9C383F` | `#FCEBED` | Solicitud procesada con estado `REJECTED`. |
| Advertencia | `#805400` | `#FFF4D4` | Conflicto o acción que requiere atención. |
| Información | `#075A91` | `#EAF4FC` | Ayudas y mensajes informativos. |
| No confirmado | `#643287` | `#F3EAFB` | Resultado pendiente de recuperación o confirmación. |

Cada estado debe mostrar un título o etiqueta textual. El color y el icono son refuerzos, no la única forma de comunicar significado.

## 3. Tipografía

Usar Montserrat como tipografía de marca, con Arial como fallback:

```css
font-family: Montserrat, Arial, sans-serif;
```

La implementación actual solicita Montserrat a Google Fonts desde `index.html`. Un despliegue con política de contenido estricta o funcionamiento sin red debe alojar los archivos tipográficos localmente.

| Nivel | Tamaño sugerido | Peso | Uso |
|---|---:|---:|---|
| Título de página | `2rem` / 32 px | 700 | Encabezado principal. |
| Título de sección | `1.5rem` / 24 px | 700 | Formulario, resultado y recientes. |
| Subtítulo | `1.25rem` / 20 px | 600 | Bloques internos. |
| Cuerpo | `1rem` / 16 px | 400 | Contenido y controles. |
| Texto auxiliar | `0.875rem` / 14 px | 400 | Ayudas y metadatos. |
| Etiqueta pequeña | `0.75rem` / 12 px | 600 | Etiquetas compactas, con uso limitado. |

Mantener una altura de línea mínima de `1.5` para texto de lectura y evitar párrafos con anchuras excesivas.

## 4. Espaciado y distribución

Usar una escala basada en múltiplos de 4 px:

```text
4, 8, 12, 16, 24, 32, 48, 64 px
```

- Ancho máximo del contenido: `1200px`.
- Margen lateral: `10px` en móvil y `16px` desde 640 px.
- Separación principal: `20–24px`.
- Relleno de paneles: `16px` en móvil y `20–24px` en escritorio.
- El formulario usa una columna en móvil y dos en pantallas amplias.
- El maestro–detalle usa dos columnas hasta `58rem`; después se apila.
- El inspector permanece sticky únicamente cuando ambos paneles comparten fila.

## 5. Controles y acciones

- Altura mínima interactiva: `44px`.
- Radio de borde de controles: `6px`.
- Radio de borde de paneles: `12px`.
- Borde normal: `1px solid var(--color-border)`.
- Foco: contorno visible de al menos `2px`, separado del borde y sin eliminar `outline` sin reemplazo.
- Botón principal sólido; botón secundario con superficie blanca y borde visible.
- Acciones destructivas o de descarte deben identificarse con texto explícito y pedir confirmación si existe un borrador modificado.
- Un botón deshabilitado mantiene una etiqueta legible y no debe ser la única señal de que existe una operación en curso.

Los campos usarán controles HTML nativos con etiqueta asociada. La ayuda y el error aparecerán debajo del control, reservando una estructura consistente para evitar saltos visuales innecesarios.

## 6. Tarjetas, tablas y listas

- Usar tarjetas blancas sobre el fondo general para separar formulario, resultado y consultas.
- Separar niveles mediante borde, superficie y espacio. La implementación no necesita sombras en los paneles principales.

- En pantallas pequeñas, transformar tablas anchas en listas o tarjetas de pares etiqueta–valor.
- Mantener visibles la referencia, el estado y la fecha de procesamiento en cada solicitud.
- Alinear importes a la derecha cuando se presenten en columnas.
- Presentar COP con agrupación `es-CO`, preservando todos los decimales recibidos. No convertir el string a `Number` ni agregar redondeos visuales.

## 7. Retroalimentación y movimiento

- Mostrar carga con indicador y texto como “Enviando solicitud” o “Actualizando solicitudes”.
- Reservar una región accesible para mensajes importantes mediante `aria-live` según su urgencia.
- Las transiciones opcionales tendrán una duración aproximada de `150–200ms`.
- Respetar `prefers-reduced-motion` y evitar animaciones continuas no esenciales.
- No reemplazar contenido confirmado por esqueletos durante una actualización secundaria.

## 8. Iconografía

- Usar una única familia de iconos cuando se incorpore.
- Los iconos decorativos deben ocultarse de tecnologías de asistencia.
- Los iconos de estado deben acompañarse de texto visible.
- No añadir una librería de iconos hasta confirmar que sus beneficios justifican la dependencia.

## 9. Tokens implementados

Los tokens se declaran una sola vez en `src/styles.scss` y los componentes consumen nombres semánticos:

```css
:root {
  --color-brand-navy: #023365;
  --color-brand-blue: #0997e6;
  --color-brand-yellow: #febd04;
  --color-brand-pink: #fb2f70;
  --color-background: #f1f5fa;
  --color-surface: #ffffff;
  --color-text: #193754;
  --color-text-muted: #53677e;
  --color-border: #d6e1ec;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --radius-control: 0.375rem;
  --radius-panel: 0.75rem;
}
```

No repetir colores de marca dentro de componentes salvo que una excepción visual esté documentada.

## 10. Criterios de aceptación visual

- Contraste de texto y controles validado al menos contra WCAG AA.
- Navegación completa mediante teclado y foco siempre visible.
- Etiquetas, errores y ayudas asociados programáticamente a sus controles.
- Estados comprensibles en escala de grises y sin depender solo del color.
- Diseño usable desde `320px` de ancho sin desplazamiento horizontal general.
- Zoom al `200%` sin pérdida de información ni acciones.
- Resultado aprobado, rechazado, conflicto y no confirmado claramente diferenciados.
- La fecha y la referencia permanecen visibles junto al resultado correspondiente.

## 11. Fuera de alcance

- Modo oscuro.
- Ilustraciones y animaciones de marca.
- Selección de una librería de componentes o iconos.
- Tipografía autoalojada.
- Persistencia del borrador entre recargas.

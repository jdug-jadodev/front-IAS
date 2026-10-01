# Guía visual propuesta para el sistema de créditos

**Estado:** propuesta inicial. Define criterios y tokens; no implica que los estilos ya estén implementados.

Esta guía busca una interfaz sobria, clara y confiable para registrar y consultar solicitudes de crédito. La presentación debe ayudar a distinguir datos, acciones y estados sin depender únicamente del color.

## 1. Principios visuales

- **Confianza:** usar una base azul institucional, superficies limpias y jerarquías previsibles.
- **Claridad:** priorizar etiquetas explícitas, mensajes breves y suficiente espacio entre bloques.
- **Accesibilidad:** mantener contraste WCAG AA, foco visible y estados acompañados por texto e iconos.
- **Consistencia:** consumir tokens semánticos en lugar de repetir valores directos en componentes.
- **Sobriedad:** evitar gradientes decorativos, sombras fuertes y animaciones que distraigan del proceso.

## 2. Paleta base

### Marca y acciones

| Token sugerido | Color | Uso |
|---|---:|---|
| `--color-primary` | `#1D4ED8` | Acción principal, enlaces y elementos activos. |
| `--color-primary-hover` | `#1E40AF` | Hover de la acción principal. |
| `--color-primary-strong` | `#1E3A8A` | Encabezados destacados o navegación. |
| `--color-secondary` | `#0F766E` | Acciones secundarias y acentos puntuales. |
| `--color-focus` | `#2563EB` | Anillo de foco visible. |

Usar texto blanco sobre los colores primario, primario intenso y secundario. No usar el azul primario para comunicar por sí solo el estado de una solicitud.

### Superficies y texto

| Token sugerido | Color | Uso |
|---|---:|---|
| `--color-background` | `#F7F9FC` | Fondo general de la aplicación. |
| `--color-surface` | `#FFFFFF` | Tarjetas, formulario y paneles. |
| `--color-surface-muted` | `#F1F5F9` | Cabeceras de tabla y secciones secundarias. |
| `--color-text` | `#172033` | Texto principal. |
| `--color-text-muted` | `#4B5563` | Ayudas y metadatos. |
| `--color-border` | `#CBD5E1` | Bordes de controles y divisores. |
| `--color-border-strong` | `#94A3B8` | Bordes activos o de mayor jerarquía. |

### Estados semánticos

| Estado | Texto/icono | Fondo suave | Uso previsto |
|---|---:|---:|---|
| Aprobado | `#047857` | `#ECFDF5` | Solicitud procesada con estado `APPROVED`. |
| Rechazado | `#B42318` | `#FEF3F2` | Solicitud procesada con estado `REJECTED`. |
| Advertencia | `#92400E` | `#FFF7ED` | Conflicto o acción que requiere atención. |
| Información | `#075985` | `#F0F9FF` | Ayudas y mensajes informativos. |
| No confirmado | `#5B21B6` | `#F5F3FF` | Resultado pendiente de recuperación o confirmación. |

Cada estado debe mostrar un título o etiqueta textual. El color y el icono son refuerzos, no la única forma de comunicar significado.

## 3. Tipografía

Usar inicialmente una pila de fuentes del sistema para evitar dependencias externas y mejorar el tiempo de carga:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;
```

`Inter` solo se utilizará cuando esté disponible localmente; no se descargará desde un tercero en esta etapa.

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

- Ancho máximo sugerido del contenido: `1200px`.
- Margen lateral: `16px` en móvil, `24px` en tableta y `32px` en escritorio.
- Separación entre secciones principales: `32px`.
- Relleno de tarjetas: `16px` en móvil y `24px` en escritorio.
- El formulario se presenta en una columna en móvil y puede usar dos columnas en pantallas amplias.
- Resultado y listado reciente pueden compartir una cuadrícula cuando exista espacio suficiente, sin comprimir el formulario.

## 5. Controles y acciones

- Altura mínima interactiva: `44px`.
- Radio de borde de controles: `8px`.
- Radio de borde de tarjetas: `12px`.
- Borde normal: `1px solid var(--color-border)`.
- Foco: contorno visible de al menos `2px`, separado del borde y sin eliminar `outline` sin reemplazo.
- Botón principal sólido; botón secundario con superficie blanca y borde visible.
- Acciones destructivas o de descarte deben identificarse con texto explícito.
- Un botón deshabilitado mantiene una etiqueta legible y no debe ser la única señal de que existe una operación en curso.

Los campos usarán controles HTML nativos con etiqueta asociada. La ayuda y el error aparecerán debajo del control, reservando una estructura consistente para evitar saltos visuales innecesarios.

## 6. Tarjetas, tablas y listas

- Usar tarjetas blancas sobre el fondo general para separar formulario, resultado y consultas.
- Aplicar sombras discretas únicamente cuando ayuden a distinguir niveles:

```css
box-shadow: 0 1px 2px rgb(15 23 42 / 0.06),
  0 4px 12px rgb(15 23 42 / 0.04);
```

- En pantallas pequeñas, transformar tablas anchas en listas o tarjetas de pares etiqueta–valor.
- Mantener visibles la referencia, el estado y la fecha de procesamiento en cada solicitud.
- Alinear importes a la derecha cuando se presenten en columnas.
- No inventar formato monetario hasta cerrar moneda, precisión y escala con el backend.

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

## 9. Aplicación futura de tokens

La implementación debería declarar los tokens globales una sola vez y consumir nombres semánticos desde los componentes. Ejemplo orientativo:

```css
:root {
  --color-primary: #1d4ed8;
  --color-primary-hover: #1e40af;
  --color-background: #f7f9fc;
  --color-surface: #ffffff;
  --color-text: #172033;
  --color-text-muted: #4b5563;
  --color-border: #cbd5e1;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --radius-control: 0.5rem;
  --radius-card: 0.75rem;
}
```

Este fragmento es una referencia para la etapa de estilos; no obliga a crear componentes o wrappers adicionales.

## 10. Criterios de aceptación visual

- Contraste de texto y controles validado al menos contra WCAG AA.
- Navegación completa mediante teclado y foco siempre visible.
- Etiquetas, errores y ayudas asociados programáticamente a sus controles.
- Estados comprensibles en escala de grises y sin depender solo del color.
- Diseño usable desde `320px` de ancho sin desplazamiento horizontal general.
- Zoom al `200%` sin pérdida de información ni acciones.
- Resultado aprobado, rechazado, conflicto y no confirmado claramente diferenciados.
- La fecha y la referencia permanecen visibles junto al resultado correspondiente.

## 11. Fuera de esta propuesta

- Logotipo y manual de marca definitivo.
- Modo oscuro.
- Ilustraciones y animaciones de marca.
- Selección de una librería de componentes o iconos.
- Formato definitivo de moneda.
- Implementación de estilos en los componentes Angular.

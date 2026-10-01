import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-indicador-carga',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="carga" role="status">
    <span class="spinner" aria-hidden="true"></span>{{ texto() }}
  </p>`,
})
export class IndicadorCarga {
  readonly texto = input('Cargando…');
}

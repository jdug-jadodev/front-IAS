import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-indicador-carga',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './indicador-carga.html',
  styleUrl: './indicador-carga.scss',
})
export class IndicadorCarga {
  readonly texto = input('Cargando…');
}

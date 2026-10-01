import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { IndicadorCarga } from '../../../../../shared/ui/atoms/indicador-carga';
import { Mensaje } from '../../../../../shared/ui/atoms/mensaje';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { ResultadoDetalle } from './resultado-detalle';

@Component({
  selector: 'app-solicitud-resultado',
  imports: [IndicadorCarga, Mensaje, ResultadoDetalle],
  templateUrl: './solicitud-resultado.html',
  styleUrl: './solicitud-resultado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudResultado {
  protected readonly store = inject(SolicitudesStore);
  readonly nuevaSolicitudSolicitada = output<void>();
}

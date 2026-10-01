import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IndicadorCarga } from '../../../../../shared/ui/atoms/indicador-carga';
import { Mensaje } from '../../../../../shared/ui/atoms/mensaje';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { ResultadoDetalle } from '../solicitud-resultado/resultado-detalle';

@Component({
  selector: 'app-consulta-resultado',
  imports: [IndicadorCarga, Mensaje, ResultadoDetalle],
  templateUrl: './consulta-resultado.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultaResultado {
  protected readonly store = inject(SolicitudesStore);
}

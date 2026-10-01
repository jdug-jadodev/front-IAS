import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IndicadorCarga } from '../../../../../shared/ui/atoms/indicador-carga';
import { Mensaje } from '../../../../../shared/ui/atoms/mensaje';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { ResultadoDetalle } from '../solicitud-resultado/resultado-detalle';

@Component({
  selector: 'app-solicitudes-recientes',
  imports: [DatePipe, IndicadorCarga, Mensaje, ResultadoDetalle],
  templateUrl: './solicitudes-recientes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudesRecientes {
  protected readonly store = inject(SolicitudesStore);
}

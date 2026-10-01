import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { IndicadorCarga } from '../../../../../shared/ui/atoms/indicador-carga';
import { Mensaje } from '../../../../../shared/ui/atoms/mensaje';
import { SolicitudResultado } from '../../../models/solicitud.model';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { MontoCopPipe } from '../../pipes/monto-cop.pipe';

@Component({
  selector: 'app-solicitudes-recientes',
  imports: [IndicadorCarga, Mensaje, MontoCopPipe],
  templateUrl: './solicitudes-recientes.html',
  styleUrl: './solicitudes-recientes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudesRecientes {
  protected readonly store = inject(SolicitudesStore);
  readonly solicitudSeleccionada = output<SolicitudResultado>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SolicitudResultado } from '../../../models/solicitud.model';
import { FechaSolicitudPipe } from '../../pipes/fecha-solicitud.pipe';
import { MontoCopPipe } from '../../pipes/monto-cop.pipe';

@Component({
  selector: 'app-resultado-detalle',
  imports: [FechaSolicitudPipe, MontoCopPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resultado-detalle.html',
  styleUrl: './resultado-detalle.scss',
})
export class ResultadoDetalle {
  readonly resultado = input.required<SolicitudResultado>();
}

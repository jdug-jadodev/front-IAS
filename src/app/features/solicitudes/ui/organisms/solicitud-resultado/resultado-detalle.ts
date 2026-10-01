import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SolicitudResultado } from '../../../models/solicitud.model';

@Component({
  selector: 'app-resultado-detalle',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resultado-detalle.html',
  styleUrl: './resultado-detalle.scss',
})
export class ResultadoDetalle {
  readonly resultado = input.required<SolicitudResultado>();
}

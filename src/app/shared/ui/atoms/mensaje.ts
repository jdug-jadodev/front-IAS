import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-mensaje',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mensaje.html',
})
export class Mensaje {
  readonly texto = input.required<string>();
  readonly detalle = input('');
  readonly tono = input<'error' | 'info'>('error');
}

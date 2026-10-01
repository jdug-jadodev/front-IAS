import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-mensaje',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="mensaje"
      [class.mensaje--error]="tono() === 'error'"
      [attr.role]="tono() === 'error' ? 'alert' : 'status'"
    >
      <p>{{ texto() }}</p>
      @if (detalle()) {
        <small>{{ detalle() }}</small>
      }
    </div>
  `,
})
export class Mensaje {
  readonly texto = input.required<string>();
  readonly detalle = input('');
  readonly tono = input<'error' | 'info'>('error');
}

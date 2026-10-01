import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-campo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="campo">
      <label [for]="controlId()">{{ etiqueta() }}</label>
      <ng-content />
      <small class="ayuda" [id]="controlId() + '-ayuda'">{{ ayuda() }}</small>
      <small class="error-campo" [id]="controlId() + '-error'">{{ error() }}</small>
    </div>
  `,
})
export class Campo {
  readonly controlId = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly ayuda = input('');
  readonly error = input('');
}

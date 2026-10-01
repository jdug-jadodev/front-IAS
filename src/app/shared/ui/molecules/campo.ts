import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-campo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campo.html',
  styleUrl: './campo.scss',
})
export class Campo {
  readonly controlId = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly ayuda = input('');
  readonly error = input('');
}

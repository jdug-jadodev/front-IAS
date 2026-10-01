import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Campo } from '../../../../../shared/ui/molecules/campo';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import {
  montoPositivo,
  noBlancos,
  plazoValido,
} from '../../../validation/solicitud-form.validators';

@Component({
  selector: 'app-solicitud-form',
  imports: [ReactiveFormsModule, Campo],
  templateUrl: './solicitud-form.html',
  styleUrl: './solicitud-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudForm {
  protected readonly store = inject(SolicitudesStore);
  protected readonly intentado = signal(false);
  protected readonly form = new FormGroup({
    applicationReference: new FormControl('', { nonNullable: true, validators: [noBlancos] }),
    customerId: new FormControl('', { nonNullable: true, validators: [noBlancos] }),
    amount: new FormControl('', { nonNullable: true, validators: [montoPositivo] }),
    termMonths: new FormControl<number | null>(null, [plazoValido]),
  });

  constructor() {
    effect(() => {
      const bloqueado = this.store.edicionBloqueada();
      untracked(() =>
        bloqueado
          ? this.form.disable({ emitEvent: false })
          : this.form.enable({ emitEvent: false }),
      );
    });
    effect(() => {
      this.store.revisionFormulario();
      untracked(() => {
        this.form.reset();
        this.intentado.set(false);
      });
    });
  }

  protected enviar(): void {
    if (this.store.edicionBloqueada()) return;
    this.intentado.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const datos = this.form.getRawValue();
    if (datos.termMonths === null) return;
    this.store.enviar({ ...datos, termMonths: datos.termMonths });
  }

  protected error(campo: keyof typeof this.form.controls): string {
    const control = this.form.controls[campo];
    if (!control.invalid || !(control.touched || control.dirty || this.intentado())) return '';
    switch (campo) {
      case 'applicationReference':
        return 'Escribe una referencia; no puede contener solo espacios.';
      case 'customerId':
        return 'Escribe el identificador del cliente.';
      case 'amount':
        return 'Escribe un monto decimal mayor que cero, usando punto decimal.';
      case 'termMonths':
        return 'El plazo debe ser un número entero entre 6 y 60 meses.';
    }
  }
}

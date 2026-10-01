import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Mensaje } from '../../../../../shared/ui/atoms/mensaje';
import { Campo } from '../../../../../shared/ui/molecules/campo';
import { SolicitudEntrada } from '../../../models/solicitud.model';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { MontoCopPipe } from '../../pipes/monto-cop.pipe';
import {
  montoPositivo,
  noBlancos,
  plazoValido,
} from '../../../validation/solicitud-form.validators';

@Component({
  selector: 'app-solicitud-form',
  imports: [ReactiveFormsModule, Campo, Mensaje, MontoCopPipe],
  templateUrl: './solicitud-form.html',
  styleUrl: './solicitud-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudForm {
  protected readonly store = inject(SolicitudesStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly intentado = signal(false);
  protected readonly revisionPendiente = signal<SolicitudEntrada | null>(null);
  protected readonly confirmacionDescarte = signal(false);
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
        this.revisionPendiente.set(null);
        this.confirmacionDescarte.set(false);
      });
    });
  }

  protected enviar(): void {
    if (this.store.edicionBloqueada()) return;
    this.intentado.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      queueMicrotask(() =>
        this.host.nativeElement
          .querySelector<HTMLInputElement>('input[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    const datos = this.form.getRawValue();
    if (datos.termMonths === null) return;
    this.confirmacionDescarte.set(false);
    this.revisionPendiente.set(
      Object.freeze({
        ...datos,
        termMonths: datos.termMonths,
      }),
    );
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLElement>('#titulo-revision')?.focus(),
    );
  }

  protected confirmarEnvio(): void {
    const datos = this.revisionPendiente();
    if (!datos || this.store.edicionBloqueada()) return;
    this.revisionPendiente.set(null);
    this.store.enviar(datos);
  }

  protected editarSolicitud(): void {
    this.revisionPendiente.set(null);
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLInputElement>('#referencia')?.focus(),
    );
  }

  protected solicitarDescarte(): void {
    if (this.form.pristine) {
      this.store.nuevaSolicitud();
      return;
    }
    this.confirmacionDescarte.set(true);
  }

  protected descartarBorrador(): void {
    this.store.nuevaSolicitud();
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLInputElement>('#referencia')?.focus(),
    );
  }

  protected conservarBorrador(): void {
    this.confirmacionDescarte.set(false);
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLInputElement>('#referencia')?.focus(),
    );
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

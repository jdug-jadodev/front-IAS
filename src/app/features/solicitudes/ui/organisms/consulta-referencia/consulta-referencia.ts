import { ChangeDetectionStrategy, Component, ElementRef, inject, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  MayusculasDirective,
  normalizarMayusculas,
} from '../../../../../shared/ui/directives/mayusculas.directive';
import { Campo } from '../../../../../shared/ui/molecules/campo';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { noBlancos } from '../../../validation/solicitud-form.validators';

@Component({
  selector: 'app-consulta-referencia',
  imports: [ReactiveFormsModule, Campo, MayusculasDirective],
  templateUrl: './consulta-referencia.html',
  styleUrl: './consulta-referencia.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultaReferencia {
  protected readonly store = inject(SolicitudesStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly consultaSolicitada = output<void>();
  protected readonly referencia = new FormControl('', {
    nonNullable: true,
    validators: [noBlancos],
  });
  protected readonly form = new FormGroup({ referencia: this.referencia });

  protected consultar(): void {
    const referenciaNormalizada = normalizarMayusculas(this.referencia.value);
    if (this.referencia.value !== referenciaNormalizada) {
      this.referencia.setValue(referenciaNormalizada, { emitEvent: false });
    }
    this.referencia.markAsTouched();
    if (this.referencia.invalid) {
      queueMicrotask(() =>
        this.host.nativeElement.querySelector<HTMLInputElement>('input')?.focus(),
      );
      return;
    }
    this.store.consultarPorReferencia(referenciaNormalizada);
    this.consultaSolicitada.emit();
  }
}

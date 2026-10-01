import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IndicadorCarga } from '../../../../../shared/ui/atoms/indicador-carga';
import { Mensaje } from '../../../../../shared/ui/atoms/mensaje';
import { Campo } from '../../../../../shared/ui/molecules/campo';
import { SolicitudesStore } from '../../../state/solicitudes.store';
import { noBlancos } from '../../../validation/solicitud-form.validators';
import { ResultadoDetalle } from '../solicitud-resultado/resultado-detalle';

@Component({
  selector: 'app-consulta-referencia',
  imports: [ReactiveFormsModule, IndicadorCarga, Mensaje, Campo, ResultadoDetalle],
  templateUrl: './consulta-referencia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultaReferencia {
  protected readonly store = inject(SolicitudesStore);
  protected readonly referencia = new FormControl('', {
    nonNullable: true,
    validators: [noBlancos],
  });
  protected readonly form = new FormGroup({ referencia: this.referencia });

  protected consultar(): void {
    this.referencia.markAsTouched();
    if (this.referencia.invalid) return;
    this.store.consultarPorReferencia(this.referencia.value);
  }
}

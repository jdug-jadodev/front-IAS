import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { SolicitudesStore } from '../../state/solicitudes.store';
import { ConsultaReferencia } from '../../ui/organisms/consulta-referencia/consulta-referencia';
import { SolicitudForm } from '../../ui/organisms/solicitud-form/solicitud-form';
import { SolicitudResultado } from '../../ui/organisms/solicitud-resultado/solicitud-resultado';
import { SolicitudesRecientes } from '../../ui/organisms/solicitudes-recientes/solicitudes-recientes';

@Component({
  selector: 'app-solicitudes-page',
  imports: [SolicitudForm, SolicitudResultado, ConsultaReferencia, SolicitudesRecientes],
  providers: [SolicitudesStore],
  templateUrl: './solicitudes-page.html',
  styleUrl: './solicitudes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudesPage implements OnInit {
  private readonly store = inject(SolicitudesStore);

  ngOnInit(): void {
    this.store.cargarRecientes();
  }
}

import { Pipe, PipeTransform } from '@angular/core';

const FECHA_BOGOTA = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

@Pipe({ name: 'fechaSolicitud' })
export class FechaSolicitudPipe implements PipeTransform {
  transform(value: string): string {
    return FECHA_BOGOTA.format(new Date(value));
  }
}

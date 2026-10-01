import { Pipe, PipeTransform } from '@angular/core';

const FECHA_BOGOTA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Bogota',
});
const MESES_ABREVIADOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sept',
  'oct',
  'nov',
  'dic',
] as const;

@Pipe({ name: 'fechaSolicitud' })
export class FechaSolicitudPipe implements PipeTransform {
  transform(value: string): string {
    const partes = FECHA_BOGOTA.formatToParts(new Date(value));
    const valor = (tipo: 'day' | 'month' | 'year' | 'hour' | 'minute') =>
      partes.find((parte) => parte.type === tipo)?.value ?? '';
    const mes = MESES_ABREVIADOS[Number(valor('month')) - 1] ?? '';
    return `${valor('day')} ${mes} ${valor('year')}, ${valor('hour')}:${valor('minute')}`;
  }
}

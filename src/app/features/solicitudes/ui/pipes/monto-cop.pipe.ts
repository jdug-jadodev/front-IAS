import { Pipe, PipeTransform } from '@angular/core';

const ENTERO_COP = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

@Pipe({ name: 'montoCop' })
export class MontoCopPipe implements PipeTransform {
  transform(value: string): string {
    const partes = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(value);
    if (!partes) return value;

    const [, signo, entero, fraccion = ''] = partes;
    const enteroFormateado = ENTERO_COP.format(BigInt(entero));
    return `${signo === '-' ? '-' : ''}$${enteroFormateado}${fraccion ? `,${fraccion}` : ''}`;
  }
}

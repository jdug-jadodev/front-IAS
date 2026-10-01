import { ValidatorFn } from '@angular/forms';
import { SolicitudEntrada } from '../models/solicitud.model';

// Comparación decimal textual: no redondea ni convierte dinero a punto flotante.
export function decimalCanonico(value: string): string | null {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const negativo = value.startsWith('-');
  const [entero, fraccion = ''] = value.replace(/^[+-]/, '').split('.');
  const parteEntera = entero.replace(/^0+/, '') || '0';
  const parteDecimal = fraccion.replace(/0+$/, '');
  const numero = parteDecimal ? `${parteEntera}.${parteDecimal}` : parteEntera;
  return negativo && numero !== '0' ? `-${numero}` : numero;
}

export const noBlancos: ValidatorFn = ({ value }) =>
  typeof value === 'string' && value.trim().length > 0 ? null : { requerido: true };

export const montoPositivo: ValidatorFn = ({ value }) => {
  const decimal = typeof value === 'string' ? decimalCanonico(value) : null;
  return decimal && decimal !== '0' && !decimal.startsWith('-') ? null : { monto: true };
};

export const plazoValido: ValidatorFn = ({ value }) =>
  Number.isInteger(value) && value >= 6 && value <= 60 ? null : { plazo: true };

export function mismosDatos(a: SolicitudEntrada, b: SolicitudEntrada): boolean {
  const monto = decimalCanonico(a.amount);
  return (
    a.applicationReference === b.applicationReference &&
    a.customerId === b.customerId &&
    monto !== null &&
    monto === decimalCanonico(b.amount) &&
    a.termMonths === b.termMonths
  );
}

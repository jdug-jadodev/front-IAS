import { FormControl } from '@angular/forms';
import {
  decimalCanonico,
  mismosDatos,
  montoPositivo,
  noBlancos,
  plazoValido,
} from './solicitud-form.validators';

describe('Validación de solicitudes', () => {
  it.each(['', ' ', '\t\n'])('rechaza un identificador blanco: %j', (value) => {
    expect(noBlancos(new FormControl(value))).not.toBeNull();
  });

  it.each(['cliente/ñ', ' REF Mixta '])(
    'admite identificadores sin imponer patrones: %j',
    (value) => {
      expect(noBlancos(new FormControl(value))).toBeNull();
    },
  );

  it.each(['', '0', '0.000', '-1', 'NaN', 'Infinity', '1,50', '1 000'])(
    'rechaza el monto %j',
    (value) => {
      expect(montoPositivo(new FormControl(value))).not.toBeNull();
    },
  );

  it.each(['0.0001', '1.00', '9007199254740993.001'])('conserva el monto decimal %j', (value) => {
    expect(montoPositivo(new FormControl(value))).toBeNull();
  });

  it.each([6, 60])('admite el plazo límite %i', (value) => {
    expect(plazoValido(new FormControl(value))).toBeNull();
  });

  it.each([null, 5, 61, 6.5, NaN, Infinity])('rechaza el plazo %j', (value) => {
    expect(plazoValido(new FormControl(value))).not.toBeNull();
  });

  it('compara decimales sin perder precisión ni modificar identificadores', () => {
    const datos = { customerId: 'c', amount: '0001.00', termMonths: 12 };
    expect(mismosDatos(datos, { ...datos, amount: '1' })).toBe(true);
    expect(mismosDatos(datos, { ...datos, customerId: 'otro' })).toBe(false);
    expect(decimalCanonico('9007199254740993.00100')).toBe('9007199254740993.001');
    expect(
      mismosDatos(
        { ...datos, amount: '9007199254740993' },
        { ...datos, amount: '9007199254740992' },
      ),
    ).toBe(false);
  });
});

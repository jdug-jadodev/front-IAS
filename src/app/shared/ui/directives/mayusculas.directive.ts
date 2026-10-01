import { Directive, ElementRef, forwardRef, HostListener, inject, Renderer2 } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export function normalizarMayusculas(valor: string): string {
  return valor.toUpperCase();
}

@Directive({
  selector: 'input[appMayusculas]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MayusculasDirective),
      multi: true,
    },
  ],
  host: {
    autocapitalize: 'characters',
  },
})
export class MayusculasDirective implements ControlValueAccessor {
  private readonly elemento = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private componiendo = false;
  private cambiarValor: (valor: string) => void = () => undefined;
  private marcarTocado: () => void = () => undefined;

  writeValue(valor: string | null | undefined): void {
    this.renderer.setProperty(
      this.elemento.nativeElement,
      'value',
      normalizarMayusculas(valor ?? ''),
    );
  }

  registerOnChange(cambiarValor: (valor: string) => void): void {
    this.cambiarValor = cambiarValor;
  }

  registerOnTouched(marcarTocado: () => void): void {
    this.marcarTocado = marcarTocado;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.renderer.setProperty(this.elemento.nativeElement, 'disabled', deshabilitado);
  }

  @HostListener('input')
  alEscribir(): void {
    if (!this.componiendo) this.aplicarMayusculas();
  }

  @HostListener('compositionstart')
  alIniciarComposicion(): void {
    this.componiendo = true;
  }

  @HostListener('compositionend')
  alTerminarComposicion(): void {
    this.componiendo = false;
    this.aplicarMayusculas();
  }

  @HostListener('blur')
  alPerderFoco(): void {
    this.marcarTocado();
  }

  private aplicarMayusculas(): void {
    const input = this.elemento.nativeElement;
    const valorOriginal = input.value;
    const inicio = input.selectionStart;
    const fin = input.selectionEnd;
    const direccion = input.selectionDirection;
    const valorNormalizado = normalizarMayusculas(valorOriginal);

    if (valorNormalizado !== valorOriginal) {
      this.renderer.setProperty(input, 'value', valorNormalizado);
      if (inicio !== null && fin !== null) {
        input.setSelectionRange(
          normalizarMayusculas(valorOriginal.slice(0, inicio)).length,
          normalizarMayusculas(valorOriginal.slice(0, fin)).length,
          direccion ?? undefined,
        );
      }
    }

    this.cambiarValor(valorNormalizado);
  }
}

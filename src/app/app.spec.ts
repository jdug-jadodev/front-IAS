import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the BancoIAS brand and navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const normalizar = (texto: string | null | undefined) => texto?.replace(/\s+/g, ' ').trim();
    const marca = compiled.querySelector<HTMLAnchorElement>('.marca');
    const enlaces = Array.from(compiled.querySelectorAll<HTMLAnchorElement>('nav a'));

    expect(normalizar(marca?.textContent)?.replace(/\s/g, '')).toContain('BancoIAS');
    expect(marca?.getAttribute('href')).toBe('/#solicitud');
    expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual([
      '/#consulta',
      '/#recientes',
    ]);
    expect(enlaces.map((enlace) => normalizar(enlace.textContent))).toEqual([
      'Consultar solicitud',
      'Recientes',
    ]);
  });
});

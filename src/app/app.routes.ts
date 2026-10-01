import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Solicitudes de crédito | IAS',
    loadComponent: () =>
      import('./features/solicitudes/pages/solicitudes-page/solicitudes-page').then(
        (m) => m.SolicitudesPage,
      ),
  },
  { path: '**', redirectTo: '' },
];

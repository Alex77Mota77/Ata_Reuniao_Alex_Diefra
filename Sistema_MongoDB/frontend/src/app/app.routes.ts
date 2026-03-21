import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'setup',
    loadComponent: () => import('./features/auth/setup.component').then(m => m.SetupComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'contratos',
        loadComponent: () => import('./features/contratos/contratos.component').then(m => m.ContratosComponent)
      },
      {
        path: 'financeiro',
        loadComponent: () => import('./features/financeiro/financeiro.component').then(m => m.FinanceiroComponent)
      },
      {
        path: 'medicoes',
        loadComponent: () => import('./features/medicoes/medicoes.component').then(m => m.MedicoesComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
        canActivate: [authGuard],
        data: { roles: ['admin'] }
      },
    ]
  },
  {
    path: 'acesso-negado',
    loadComponent: () => import('./features/auth/denied.component').then(m => m.DeniedComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];

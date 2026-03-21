import { CanActivateFn, Router } from '@angular/router';
import { inject }                 from '@angular/core';
import { AuthService }            from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Verifica roles definidas na rota
  const requiredRoles: string[] = route.data?.['roles'] ?? [];
  if (requiredRoles.length && !requiredRoles.includes(auth.currentUser()?.role ?? '')) {
    router.navigate(['/acesso-negado']);
    return false;
  }

  return true;
};

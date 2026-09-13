import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.initialize().pipe(
    take(1),
    map(
      () =>
        auth.isAuthenticated() ||
        router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};

export const staffGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.initialize().pipe(
    take(1),
    map(() => {
      if (!auth.isAuthenticated())
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
      return auth.user()?.is_staff || router.createUrlTree(['/account']);
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.initialize().pipe(
    take(1),
    map(() => !auth.isAuthenticated() || router.createUrlTree(['/account'])),
  );
};

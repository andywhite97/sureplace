import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map, switchMap, take } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { UserCapabilityKey, UserCapabilityService } from '../services/user-capability.service';

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

export const capabilityGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const auth = inject(AuthService);
  const capabilities = inject(UserCapabilityService);
  const router = inject(Router);
  const capability = route.data['capability'] as UserCapabilityKey | undefined;
  return auth.initialize().pipe(
    take(1),
    switchMap(() => capabilities.resolve()),
    map(() => {
      if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
      }
      if (!capability || capabilities.has(capability)) return true;
      const intent = route.data['capabilityIntent'] as string | undefined;
      return router.createUrlTree(['/account/profile'], {
        queryParams: intent ? { intent } : { from: 'account' },
      });
    }),
  );
};

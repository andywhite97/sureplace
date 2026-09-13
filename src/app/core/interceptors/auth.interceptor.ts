import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const isApi = request.url.startsWith(environment.apiBaseUrl);
  const isSessionEndpoint = /\/auth\/(login|register|logout|token\/refresh)\/$/.test(request.url);
  const token = isApi && !isSessionEndpoint ? auth.accessToken() : null;
  const authorized = (access: string) =>
    request.clone({ setHeaders: { Authorization: `Bearer ${access}` } });
  const expire = (error: HttpErrorResponse) => {
    if ([400, 401, 403].includes(error.status) && auth.status() === 'authenticated') {
      auth.clear();
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
    return throwError(() => error);
  };
  return next(token ? authorized(token) : request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isApi && error.status === 403 && error.error?.code === 'email_not_verified') {
        toast.show({
          kind: 'warning',
          title: 'Verify your email',
          message: 'Please verify your email to continue.',
        });
      }
      if (!isApi || isSessionEndpoint || error.status !== 401) return throwError(() => error);
      if (auth.status() === 'initializing') {
        // Never redirect or start a competing refresh while bootstrap owns the decision.
        return auth.initialize().pipe(
          switchMap(() => {
            const access = auth.accessToken();
            return auth.isAuthenticated() && access
              ? next(authorized(access))
              : throwError(() => error);
          }),
        );
      }
      if (!token || !auth.isAuthenticated()) return throwError(() => error);
      const current = auth.accessToken();
      // A concurrent request may already have rotated this token.
      const refreshed =
        current && current !== token
          ? of({ access: current })
          : auth.refresh().pipe(catchError(expire));
      return refreshed.pipe(
        switchMap((tokens) =>
          next(authorized(tokens.access)).pipe(
            catchError((retryError) =>
              retryError.status === 401 ? expire(retryError) : throwError(() => retryError),
            ),
          ),
        ),
      );
    }),
  );
};

import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  catchError,
  defer,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens, User } from '../models/api.models';
import { AuthApiService, LoginRequest, RegisterRequest } from './auth-api.service';
import { TokenStorage } from './token-storage.service';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(AuthApiService);
  private storage = inject(TokenStorage);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  // Session bootstrap owns its own single refresh/retry; bypass the auth interceptor.
  private rawHttp = new HttpClient(inject(HttpBackend));
  private refreshRequest: Observable<AuthTokens> | null = null;
  private initializationRequest: Observable<User | null> | null = null;
  private sessionVersion = 0;
  readonly user = signal<User | null>(null);
  readonly status = signal<AuthStatus>('initializing');
  readonly loading = signal(false);
  readonly isAuthenticated = computed(
    () => this.status() === 'authenticated' && this.user() !== null,
  );

  accessToken() {
    return this.storage.read()?.access ?? null;
  }

  login(body: LoginRequest, remember = false) {
    const version = ++this.sessionVersion;
    this.loading.set(true);
    return this.api.login(body).pipe(
      tap((tokens) => {
        if (version === this.sessionVersion) this.storage.write(tokens, remember);
      }),
      switchMap(() => this.api.me()),
      tap((user) => {
        if (version === this.sessionVersion) this.setUser(user);
      }),
      finalize(() => this.loading.set(false)),
    );
  }
  register(body: RegisterRequest) {
    return this.api.register(body);
  }
  verifyEmail(token: string) {
    return this.api.verifyEmail(token);
  }
  resendVerification(email: string) {
    return this.api.resendVerification(email);
  }
  updateMe(body: Partial<User>) {
    const version = this.sessionVersion;
    return this.api.updateMe(body).pipe(
      tap((user) => {
        if (version === this.sessionVersion) this.setUser(user);
      }),
    );
  }

  /** Idempotent browser bootstrap shared by the initializer and every route guard. */
  initialize(): Observable<User | null> {
    if (!isPlatformBrowser(this.platformId)) return of(null);
    if (this.status() !== 'initializing') return of(this.user());
    if (this.initializationRequest) return this.initializationRequest;
    const version = this.sessionVersion;
    this.initializationRequest = defer(() => {
      const tokens = this.storage.read();
      if (!tokens?.access && !tokens?.refresh) return of(null);
      this.loading.set(true);
      if (!tokens.access || this.accessExpired(tokens.access)) {
        return this.refresh().pipe(switchMap(() => this.currentUser()));
      }
      return this.currentUser().pipe(
        catchError((error) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401)
            return throwError(() => error);
          return this.refresh().pipe(switchMap(() => this.currentUser()));
        }),
      );
    }).pipe(
      catchError((error) => {
        // Preserve credentials on network/server failures; never grant unverified access.
        if (version === this.sessionVersion && this.invalidCredentials(error)) this.storage.clear();
        return of(null);
      }),
      tap((user) => {
        if (version === this.sessionVersion) this.setUser(user);
      }),
      map(() => this.user()),
      finalize(() => this.loading.set(false)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.initializationRequest;
  }
  restore() {
    return this.initialize();
  }

  refresh(): Observable<AuthTokens> {
    if (this.refreshRequest) return this.refreshRequest;
    const refresh = this.storage.read()?.refresh;
    if (!refresh)
      return throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'No refresh token' }),
      );
    const version = this.sessionVersion;
    const remembered = this.storage.remembered();
    const request = this.rawHttp
      .post<AuthTokens>(`${environment.apiBaseUrl}/auth/token/refresh/`, { refresh })
      .pipe(
        timeout(15000),
        map((tokens) => ({ access: tokens.access, refresh: tokens.refresh ?? refresh })),
        tap((tokens) => {
          if (version !== this.sessionVersion) throw new Error('Session changed during refresh.');
          this.storage.write(tokens, remembered);
        }),
        catchError((error) =>
          throwError(() =>
            version === this.sessionVersion ? error : new Error('Session changed during refresh.'),
          ),
        ),
        finalize(() => {
          if (this.refreshRequest === request) this.refreshRequest = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.refreshRequest = request;
    return request;
  }

  logout() {
    const tokens = this.storage.read();
    this.clear();
    void this.router.navigateByUrl('/');
    if (tokens?.refresh) {
      this.rawHttp
        .post(
          `${environment.apiBaseUrl}/auth/logout/`,
          { refresh: tokens.refresh },
          {
            headers: tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {},
          },
        )
        .pipe(
          timeout(15000),
          catchError(() => of(undefined)),
        )
        .subscribe();
    }
  }
  clear() {
    ++this.sessionVersion;
    this.storage.clear();
    this.refreshRequest = null;
    this.setUser(null);
    this.loading.set(false);
  }
  private setUser(user: User | null) {
    this.user.set(user);
    this.status.set(user ? 'authenticated' : 'unauthenticated');
  }
  private currentUser() {
    const access = this.accessToken();
    return this.rawHttp
      .get<User>(`${environment.apiBaseUrl}/auth/me/`, {
        headers: access ? { Authorization: `Bearer ${access}` } : {},
      })
      .pipe(timeout(15000));
  }
  private accessExpired(access: string) {
    try {
      const payload = JSON.parse(atob(access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
      return false;
    } // The backend still validates opaque/malformed tokens via /me.
  }
  private invalidCredentials(error: unknown) {
    return error instanceof HttpErrorResponse && [400, 401, 403].includes(error.status);
  }
}

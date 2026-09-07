import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens, User } from '../models/api.models';
import { AuthApiService, LoginRequest, RegisterRequest } from './auth-api.service';
import { TokenStorage } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(AuthApiService);
  private storage = inject(TokenStorage);
  private router = inject(Router);
  private rawHttp = new HttpClient(inject(HttpBackend));
  private refreshRequest: Observable<AuthTokens> | null = null;
  readonly user = signal<User | null>(null);
  readonly loading = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);

  accessToken() { return this.storage.read()?.access ?? null; }
  login(body: LoginRequest, remember = false) {
    this.loading.set(true);
    return this.api.login(body).pipe(
      tap(tokens => this.storage.write(tokens, remember)), switchMap(() => this.api.me()),
      tap(user => this.user.set(user)), finalize(() => this.loading.set(false)));
  }
  register(body: RegisterRequest) { return this.api.register(body); }
  restore() {
    if (!this.storage.read()) { this.user.set(null); return of(null); }
    this.loading.set(true);
    return this.api.me().pipe(
      tap(user => this.user.set(user)),
      catchError(() => this.refresh().pipe(switchMap(() => this.api.me()), tap(user => this.user.set(user)), catchError(() => { this.clear(); return of(null); }))),
      finalize(() => this.loading.set(false)));
  }
  refresh() {
    if (this.refreshRequest) return this.refreshRequest;
    const refresh = this.storage.read()?.refresh;
    if (!refresh) return throwError(() => new Error('No refresh token is available.'));
    this.refreshRequest = this.rawHttp.post<AuthTokens>(`${environment.apiBaseUrl}/auth/token/refresh/`, { refresh }).pipe(
      map(tokens => ({ access: tokens.access, refresh: tokens.refresh ?? refresh })),
      tap(tokens => this.storage.write(tokens, this.storage.remembered())),
      finalize(() => this.refreshRequest = null), shareReplay(1));
    return this.refreshRequest;
  }
  logout() {
    const refresh = this.storage.read()?.refresh;
    const done = () => { this.clear(); void this.router.navigateByUrl('/'); };
    if (!refresh) { done(); return; }
    this.api.logout(refresh).pipe(catchError(() => of(undefined))).subscribe(done);
  }
  clear() { this.storage.clear(); this.user.set(null); }
}

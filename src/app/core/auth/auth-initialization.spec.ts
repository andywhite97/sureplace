import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage.service';
import { AuthTokens, User } from '../models/api.models';
import { authGuard, guestGuard, staffGuard } from '../guards/auth.guard';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { ToastService } from '../services/toast.service';

@Component({ standalone: true, template: '' })
class EmptyComponent {}

const user = { id: '1', first_name: 'Andy', is_staff: true, is_email_verified: true } as User;
const expired = 'header.' + btoa(JSON.stringify({ exp: 1 })) + '.signature';

describe('Authentication bootstrap and routing', () => {
  let tokens: AuthTokens | null;
  let remembered: boolean;
  const storage = {
    read: vi.fn(() => tokens),
    write: vi.fn((value: AuthTokens, remember = false) => {
      tokens = value;
      remembered = remember;
    }),
    clear: vi.fn(() => {
      tokens = null;
    }),
    remembered: () => remembered,
  };
  beforeEach(() => {
    tokens = { access: 'persisted-access', refresh: 'persisted-refresh' };
    remembered = true;
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: EmptyComponent, canActivate: [guestGuard] },
          { path: 'account', component: EmptyComponent, canActivate: [authGuard] },
          { path: 'account/:page', component: EmptyComponent, canActivate: [authGuard] },
          { path: 'account/manage/:page', component: EmptyComponent, canActivate: [authGuard] },
          { path: 'staff', component: EmptyComponent, canActivate: [staffGuard] },
          { path: 'staff/:page', component: EmptyComponent, canActivate: [staffGuard] },
          { path: '', component: EmptyComponent },
        ]),
        { provide: TokenStorage, useValue: storage },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const auth = () => TestBed.inject(AuthService);
  const http = () => TestBed.inject(HttpTestingController);

  it.each([
    '/account/saved',
    '/account/notifications',
    '/account/manage/properties',
    '/account/manage/stays',
    '/staff',
    '/staff/listings',
  ])('keeps a persisted session on %s without ever completing a login navigation', async (path) => {
    const service = auth();
    const router = TestBed.inject(Router);
    const visited: string[] = [];
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) visited.push(event.urlAfterRedirects);
    });
    expect(service.status()).toBe('initializing');
    expect(service.isAuthenticated()).toBe(false);
    const initialize = vi.spyOn(service, 'initialize');
    service.initialize().subscribe();
    const navigation = router.navigateByUrl(path);
    await vi.waitFor(() => expect(initialize).toHaveBeenCalledTimes(2));
    const me = http().expectOne('/api/v1/auth/me/');
    expect(me.request.headers.get('Authorization')).toBe('Bearer persisted-access');
    expect(visited).toEqual([]);
    me.flush(user);
    await navigation;
    expect(service.status()).toBe('authenticated');
    expect(router.url).toBe(path);
    expect(visited).toEqual([path]);
    service.initialize().subscribe();
    http().expectNone('/api/v1/auth/me/');
  });
  it('does not emit a guard decision before the current user is resolved', () => {
    let decision: unknown;
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/account/saved' } as any),
    ) as any;
    result.subscribe((value: unknown) => (decision = value));
    expect(decision).toBeUndefined();
    http().expectOne('/api/v1/auth/me/').flush(user);
    expect(decision).toBe(true);
  });
  it('refreshes expired access first, sharing bootstrap and refresh requests', () => {
    tokens = { access: expired, refresh: 'persisted-refresh' };
    const service = auth();
    service.initialize().subscribe();
    service.restore().subscribe();
    service.refresh().subscribe();
    http().expectNone('/api/v1/auth/me/');
    const refresh = http().expectOne('/api/v1/auth/token/refresh/');
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ access: 'new-access', refresh: 'rotated' });
    http().expectOne('/api/v1/auth/me/').flush(user);
    expect(tokens).toEqual({ access: 'new-access', refresh: 'rotated' });
    expect(remembered).toBe(true);
    expect(service.status()).toBe('authenticated');
  });
  it('restores refresh-only credentials', () => {
    tokens = { access: '', refresh: 'refresh' };
    auth().initialize().subscribe();
    http().expectOne('/api/v1/auth/token/refresh/').flush({ access: 'new' });
    http().expectOne('/api/v1/auth/me/').flush(user);
    expect(auth().isAuthenticated()).toBe(true);
  });
  it('retries a rejected access token once without interceptor redirects', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    auth().initialize().subscribe();
    http().expectOne('/api/v1/auth/me/').flush({}, { status: 401, statusText: 'Expired' });
    http().expectOne('/api/v1/auth/token/refresh/').flush({ access: 'new' });
    http().expectOne('/api/v1/auth/me/').flush(user);
    expect(auth().status()).toBe('authenticated');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('clears invalid refresh and redirects once with the intended return URL', async () => {
    tokens = { access: expired, refresh: 'invalid' };
    const service = auth();
    const router = TestBed.inject(Router);
    const visited: string[] = [];
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) visited.push(event.urlAfterRedirects);
    });
    service.initialize().subscribe();
    const navigation = router.navigateByUrl('/account/manage/properties');
    http()
      .expectOne('/api/v1/auth/token/refresh/')
      .flush({}, { status: 401, statusText: 'Invalid' });
    await navigation;
    expect(service.status()).toBe('unauthenticated');
    expect(tokens).toBeNull();
    expect(visited).toHaveLength(1);
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/account/manage/properties');
    expect(router.url.startsWith('/login?')).toBe(true);
  });
  it('resolves a missing session immediately without network requests', async () => {
    tokens = null;
    const service = auth();
    await firstValueFrom(service.initialize());
    expect(service.status()).toBe('unauthenticated');
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/account/saved');
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/account/saved');
  });
  it.each([0, 503])(
    'retains credentials after temporary /me failure %s without refreshing',
    (status) => {
      auth().initialize().subscribe();
      http().expectOne('/api/v1/auth/me/').flush(null, { status, statusText: 'Unavailable' });
      expect(auth().status()).toBe('unauthenticated');
      expect(tokens?.refresh).toBe('persisted-refresh');
      http().expectNone('/api/v1/auth/token/refresh/');
    },
  );
  it('retains refresh credentials after a temporary refresh failure', () => {
    tokens = { access: expired, refresh: 'keep-me' };
    auth().initialize().subscribe();
    http()
      .expectOne('/api/v1/auth/token/refresh/')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    expect(tokens?.refresh).toBe('keep-me');
    expect(auth().isAuthenticated()).toBe(false);
  });
  it('waits for resolved staff permissions and rejects a non-staff user', async () => {
    const initialize = vi.spyOn(auth(), 'initialize');
    auth().initialize().subscribe();
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl('/staff/listings');
    await vi.waitFor(() => expect(initialize).toHaveBeenCalledTimes(2));
    http()
      .expectOne('/api/v1/auth/me/')
      .flush({ ...user, is_staff: false });
    await navigation;
    expect(router.url).toBe('/account');
  });
  it('waits before redirecting an authenticated visitor away from login', async () => {
    const initialize = vi.spyOn(auth(), 'initialize');
    auth().initialize().subscribe();
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl('/login');
    await vi.waitFor(() => expect(initialize).toHaveBeenCalledTimes(2));
    http().expectOne('/api/v1/auth/me/').flush(user);
    await navigation;
    expect(router.url).toBe('/account');
  });
  it('allows a public route while restoration is pending', async () => {
    auth().initialize().subscribe();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    expect(auth().status()).toBe('initializing');
    http().expectOne('/api/v1/auth/me/').flush(user);
  });
  it('does not access browser storage or finalize browser auth during prerender', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const service = auth();
    await firstValueFrom(service.initialize());
    expect(storage.read).not.toHaveBeenCalled();
    expect(service.status()).toBe('initializing');
    const guest = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any)) as any;
    expect(await firstValueFrom(guest)).toBe(true);
  });
  it('does not resurrect a session when logout races a refresh', () => {
    tokens = { access: expired, refresh: 'refresh' };
    const service = auth();
    service.initialize().subscribe();
    const refresh = http().expectOne('/api/v1/auth/token/refresh/');
    service.logout();
    expect(service.status()).toBe('unauthenticated');
    expect(tokens).toBeNull();
    refresh.flush({ access: 'late', refresh: 'late-refresh' });
    http().expectOne('/api/v1/auth/logout/').flush({});
    expect(tokens).toBeNull();
    expect(service.user()).toBeNull();
  });
  it('shares bootstrap with an API 401 instead of refreshing or redirecting independently', () => {
    const service = auth();
    service.initialize().subscribe();
    TestBed.inject(HttpClient).get('/api/v1/example/').subscribe();
    http().expectOne('/api/v1/example/').flush({}, { status: 401, statusText: 'Expired' });
    http().expectNone('/api/v1/auth/token/refresh/');
    http().expectOne('/api/v1/auth/me/').flush(user);
    http().expectOne('/api/v1/example/').flush({});
    expect(service.isAuthenticated()).toBe(true);
  });
  it('shares refresh across concurrent API failures and does not clear auth on retried 403', () => {
    const service = auth();
    service.initialize().subscribe();
    http().expectOne('/api/v1/auth/me/').flush(user);
    const client = TestBed.inject(HttpClient);
    client.get('/api/v1/one/').subscribe({ error: () => {} });
    client.get('/api/v1/two/').subscribe();
    http().expectOne('/api/v1/one/').flush({}, { status: 401, statusText: 'Expired' });
    http().expectOne('/api/v1/two/').flush({}, { status: 401, statusText: 'Expired' });
    http().expectOne('/api/v1/auth/token/refresh/').flush({ access: 'new' });
    http().expectOne('/api/v1/one/').flush({}, { status: 403, statusText: 'Forbidden' });
    http().expectOne('/api/v1/two/').flush({});
    expect(service.isAuthenticated()).toBe(true);
  });
  it('does not refresh recursively when the retried current-user request rejects access', () => {
    const service = auth();
    service.initialize().subscribe();
    http().expectOne('/api/v1/auth/me/').flush({}, { status: 401, statusText: 'Expired' });
    http().expectOne('/api/v1/auth/token/refresh/').flush({ access: 'rejected' });
    http().expectOne('/api/v1/auth/me/').flush({}, { status: 401, statusText: 'Rejected' });
    expect(service.status()).toBe('unauthenticated');
    expect(tokens).toBeNull();
    http().expectNone('/api/v1/auth/token/refresh/');
  });
  it('does not destroy a newly logged-in session when an old refresh fails late', () => {
    const service = auth();
    service.initialize().subscribe();
    http().expectOne('/api/v1/auth/me/').flush(user);
    TestBed.inject(HttpClient)
      .get('/api/v1/example/')
      .subscribe({ error: () => {} });
    http().expectOne('/api/v1/example/').flush({}, { status: 401, statusText: 'Expired' });
    const oldRefresh = http().expectOne('/api/v1/auth/token/refresh/');
    service.clear();
    service.login({ email: 'andy@example.com', password: 'password' }).subscribe();
    http()
      .expectOne('/api/v1/auth/login/')
      .flush({ access: 'login-access', refresh: 'login-refresh' });
    http().expectOne('/api/v1/auth/me/').flush(user);
    oldRefresh.flush({}, { status: 401, statusText: 'Expired' });
    expect(service.isAuthenticated()).toBe(true);
    expect(tokens?.refresh).toBe('login-refresh');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage.service';
import { User } from '../models/api.models';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let storage: TokenStorage;
  const user: User = { id:'1', email:'user@example.com', phone_number:'', first_name:'Sihle', last_name:'Dlamini', avatar:null, is_email_verified:true, is_phone_verified:false, onboarding_intents:[] };

  beforeEach(() => {
    installStorage('localStorage');
    installStorage('sessionStorage');
    sessionStorage.clear(); localStorage.clear();
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});
    auth=TestBed.inject(AuthService); http=TestBed.inject(HttpTestingController); storage=TestBed.inject(TokenStorage);
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); localStorage.clear(); });

  it('stores tokens and resolves the current user during login', () => {
    let completed=false;
    auth.login({email:'user@example.com',password:'secret'}).subscribe(() => completed=true);
    http.expectOne('/api/v1/auth/login/').flush({access:'access',refresh:'refresh'});
    http.expectOne('/api/v1/auth/me/').flush(user);
    expect(completed).toBe(true); expect(auth.user()).toEqual(user); expect(storage.read()?.access).toBe('access');
  });

  it('shares one token refresh between concurrent subscribers', () => {
    storage.write({access:'old',refresh:'refresh'},false);
    auth.refresh().subscribe(); auth.refresh().subscribe();
    const request=http.expectOne('/api/v1/auth/token/refresh/'); request.flush({access:'new',refresh:'rotated'});
    expect(storage.read()).toEqual({access:'new',refresh:'rotated'});
  });

  it('blacklists the refresh token and clears the session on logout', () => {
    storage.write({access:'access',refresh:'refresh'},false);
    const router=TestBed.inject(Router); const navigate=vi.spyOn(router,'navigateByUrl');
    auth.logout();
    http.expectOne('/api/v1/auth/logout/').flush({});
    expect(storage.read()).toBeNull(); expect(navigate).toHaveBeenCalledWith('/');
  });
});

function installStorage(name: 'localStorage' | 'sessionStorage') {
  if (globalThis[name]) return;
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
}

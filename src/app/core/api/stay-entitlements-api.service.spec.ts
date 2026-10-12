import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { StayEntitlementsApiService } from './stay-entitlements-api.service';
import { environment } from '../../../environments/environment';

describe('Stay entitlements API', () => {
  beforeEach(() => TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('reads the independent stay catalogue', () => {
    TestBed.inject(StayEntitlementsApiService).pricing().subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/pricing/stays/`);
    expect(request.request.method).toBe('GET'); request.flush({plans:[]});
  });
  it('uses explicit organisation and stay identifiers for preflight', () => {
    TestBed.inject(StayEntitlementsApiService).summary('company','stay').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(req=>req.url.endsWith('/account/stay-entitlements/'));
    expect(request.request.params.get('agency')).toBe('company');
    expect(request.request.params.get('stay')).toBe('stay'); request.flush({});
  });
  it('defaults to personal capacity without silently selecting a team', () => {
    TestBed.inject(StayEntitlementsApiService).summary().subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/account/stay-entitlements/`);
    expect(request.request.params.has('agency')).toBe(false); request.flush({});
  });
});

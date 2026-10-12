import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PropertyEntitlementsApiService } from './property-entitlements-api.service';
import { environment } from '../../../environments/environment';

describe('Property pricing API', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('fetches public prices from the v1 backend', () => {
    TestBed.inject(PropertyEntitlementsApiService).pricing().subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/pricing/properties/`);
    expect(request.request.method).toBe('GET'); request.flush({ plans: [] });
  });
  it('keeps agency and property scope explicit', () => {
    TestBed.inject(PropertyEntitlementsApiService).summary('agency', 'listing').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(req => req.url.endsWith('/account/property-entitlements/'));
    expect(request.request.params.get('agency')).toBe('agency');
    expect(request.request.params.get('property')).toBe('listing'); request.flush({});
  });
  it('uses personal capacity without silently selecting an agency', () => {
    TestBed.inject(PropertyEntitlementsApiService).summary().subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/account/property-entitlements/`);
    expect(request.request.params.has('agency')).toBe(false); request.flush({});
  });
});

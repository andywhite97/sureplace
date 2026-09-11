import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ConfigApiService } from './config-api.service';
import { ReferenceApiService } from './reference-api.service';

describe('bootstrap API services', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );

  it('loads and caches public config', () => {
    const service = TestBed.inject(ConfigApiService);
    const http = TestBed.inject(HttpTestingController);

    service.load().subscribe();
    service.load().subscribe();
    http.expectOne('/api/v1/config/').flush({
      default_country: 'SZ',
      default_currency: 'SZL',
      supported_currencies: ['SZL'],
      features: {
        properties: true,
        stays: false,
        bookings: true,
        internal_messaging: true,
        registration: true,
      },
      map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 },
    });

    expect(service.config().features.stays).toBe(false);
    service.load().subscribe();
    http.expectNone('/api/v1/config/');
  });

  it('loads and caches reference options', () => {
    const service = TestBed.inject(ReferenceApiService);
    const http = TestBed.inject(HttpTestingController);

    service.load().subscribe();
    service.load().subscribe();
    http.expectOne('/api/v1/reference/').flush({
      property_types: [],
      property_amenities: [],
      listing_types: [],
      stay_types: [],
      stay_amenities: [],
      regions: [{ value: 'HHOHHO', label: 'Hhohho', areas: ['Mbabane'] }],
      countries: [],
      currencies: [],
      verification_types: [],
    });

    expect(service.data().regions[0].areas).toContain('Mbabane');
    service.load().subscribe();
    http.expectNone('/api/v1/reference/');
  });
});

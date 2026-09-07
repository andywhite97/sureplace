import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StaysApiService } from './stays-api.service';

describe('StaysApiService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  it('requests backend filters and availability parameters', () => {
    TestBed.inject(StaysApiService)
      .search({
        town: 'Ezulwini',
        check_in: '2026-10-12',
        check_out: '2026-10-14',
        adults: 2,
        children: 0,
        rooms: 1,
        ordering: 'price_asc',
      })
      .subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne(
      (r) => r.url === '/api/v1/stays/' && r.params.get('town') === 'Ezulwini',
    );
    expect(req.request.params.get('check_in')).toBe('2026-10-12');
    expect(req.request.params.get('children')).toBe('0');
    expect(req.request.params.get('ordering')).toBe('price_asc');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });
  it('loads stay detail and room availability by slug', () => {
    const api = TestBed.inject(StaysApiService),
      http = TestBed.inject(HttpTestingController);
    api.detail('royal-villas').subscribe();
    http.expectOne('/api/v1/stays/royal-villas/').flush({});
    api
      .availability('royal-villas', {
        check_in: '2026-10-12',
        check_out: '2026-10-14',
        adults: 2,
        children: 0,
        rooms: 2,
      })
      .subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/stays/royal-villas/availability/');
    expect(req.request.params.get('rooms')).toBe('2');
    req.flush({ stay_id: 's1', room_types: [] });
  });
  it('creates bookings with the supplied idempotency key', () => {
    const api = TestBed.inject(StaysApiService),
      http = TestBed.inject(HttpTestingController);
    api
      .createBooking(
        's1',
        {
          room_type: 'r1',
          check_in: '2026-10-12',
          check_out: '2026-10-14',
          adults: 2,
          children: 0,
          rooms: 1,
          guest_name: 'Guest',
          guest_email: 'guest@example.com',
          guest_phone: '',
          special_requests: '',
        },
        'intent-123',
      )
      .subscribe();
    const req = http.expectOne('/api/v1/stays/s1/bookings/');
    expect(req.request.headers.get('Idempotency-Key')).toBe('intent-123');
    req.flush({ id: 'b1' });
  });
});

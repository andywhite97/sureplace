import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StaffApiService } from './staff-api.service';

describe('Staff dashboard API', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('uses the existing enriched summary in one request without per-row calls', () => {
    let result: any;
    TestBed.inject(StaffApiService)
      .dashboard()
      .subscribe((value) => (result = value));
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/staff/properties/summary/')
      .flush({ awaiting_review: 0, latest_listings: [], recent_activity: [] });
    expect(result.latest_listings).toEqual([]);
  });
  it('supports the deployed legacy endpoints and leaves unavailable counts unknown', () => {
    let result: any;
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(StaffApiService)
      .dashboard()
      .subscribe((value) => (result = value));
    http.expectOne('/api/v1/staff/properties/summary/').flush({ awaiting_review: 1 });
    const queue = http.expectOne((request) => request.url === '/api/v1/staff/properties/');
    expect(queue.request.params.get('page_size')).toBe('5');
    queue.flush({
      results: [
        {
          id: 'p1',
          images: [{ image: '/cover.jpg', is_cover: true }],
          owner: { first_name: 'Andy', last_name: 'Smith' },
        },
      ],
    });
    http
      .expectOne('/api/v1/moderation/summary/')
      .flush({
        pending_verification_requests: 2,
        recent_moderation_activity: [
          { action: 'PROPERTY_APPROVED', created_at: '2026-09-12T10:00:00Z' },
        ],
      });
    expect(result.agency_reviews).toBeNull();
    expect(result.verification_requests).toBe(2);
    expect(result.latest_listings[0].cover_image).toBe('/cover.jpg');
    expect(result.latest_listings[0].advertiser).toBe('Andy Smith');
    expect(result.recent_activity.length).toBe(1);
  });
  it('keeps the legacy queue usable if recent activity is unavailable', () => {
    let result: any;
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(StaffApiService)
      .dashboard()
      .subscribe((value) => (result = value));
    http.expectOne('/api/v1/staff/properties/summary/').flush({ awaiting_review: 0 });
    http.expectOne((request) => request.url === '/api/v1/staff/properties/').flush({ results: [] });
    http
      .expectOne('/api/v1/moderation/summary/')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(result.activity_unavailable).toBe(true);
    expect(result.verification_requests).toBeNull();
  });
});

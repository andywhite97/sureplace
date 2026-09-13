import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { StaffApiService } from '../../core/api/staff-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { StaffDashboard, StaffDashboardListing } from '../../core/models/staff.models';
import { StaffDashboardComponent } from './staff-dashboard.component';

const listing: StaffDashboardListing = {
  id: 'listing-1',
  public_id: 'SP-001',
  title: 'Family home in Mbabane',
  listing_type: 'RENT',
  price: '6500',
  currency: 'SZL',
  town: 'Mbabane',
  region: 'Hhohho',
  status: 'SUBMITTED',
  status_label: 'Submitted',
  verification_status: 'UNVERIFIED',
  latitude: null,
  longitude: null,
  updated_at: '2026-09-12T10:00:00Z',
  cover_image: '/cover.jpg',
  image_count: 1,
  advertiser: 'Andile',
  open_reports_count: 3,
};
const dashboard: StaffDashboard = {
  awaiting_review: 9,
  open_reports: 3,
  changes_requested: 2,
  approved_today: 4,
  rejected: 1,
  suspended: 2,
  agency_reviews: 6,
  verification_requests: 7,
  latest_listings: [listing],
  recent_activity: [
    {
      id: 'event-1',
      action: 'PROPERTY_APPROVED',
      listing_id: 'listing-1',
      public_id: 'SP-001',
      actor_name: 'Andy',
      created_at: '2026-09-12T10:00:00Z',
    },
  ],
};
describe('StaffDashboardComponent', () => {
  const load = vi.fn();
  beforeEach(() => {
    load.mockReset().mockReturnValue(of(dashboard));
    TestBed.configureTestingModule({
      imports: [StaffDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: StaffApiService, useValue: { dashboard: load } },
        { provide: AuthService, useValue: { user: signal({ first_name: 'Andy' }) } },
      ],
    });
  });
  function create() {
    const f = TestBed.createComponent(StaffDashboardComponent);
    f.detectChanges();
    return f;
  }
  it('uses API counts in separate primary and secondary rows', () => {
    const f = create();
    expect(
      [...f.nativeElement.querySelectorAll('.primary .metric-label')].map((x: any) =>
        x.textContent.trim(),
      ),
    ).toEqual(['Awaiting Review', 'Open Reports', 'Changes Requested', 'Approved Today']);
    expect(
      [...f.nativeElement.querySelectorAll('.primary .metric-number')].map((x: any) =>
        x.textContent.trim(),
      ),
    ).toEqual(['9', '3', '2', '4']);
    expect(
      [...f.nativeElement.querySelectorAll('.secondary .metric-number')].map((x: any) =>
        x.textContent.trim(),
      ),
    ).toEqual(['1', '2', '6', '7']);
    expect(f.nativeElement.querySelector('a[href^="/staff/reports"]')).toBeNull();
    expect(f.nativeElement.textContent).not.toContain('This week');
  });
  it('renders actual cover, factual signals, readable status and direct Review action', () => {
    const f = create();
    const row = f.nativeElement.querySelector('.review-row');
    expect(row.querySelector('img').getAttribute('src')).toBe('/cover.jpg');
    expect(row.textContent).toContain('Pending review');
    expect(row.textContent).not.toContain('SUBMITTED');
    expect(row.textContent).toContain('Only 1 photo');
    expect(row.textContent).toContain('No exact location');
    expect(row.textContent).toContain('3 open reports');
    expect(row.textContent).toContain('Andile');
    expect(row.querySelector('.primary-button').getAttribute('href')).toBe(
      '/staff/listings/listing-1',
    );
    expect(row.querySelector('.primary-button').getAttribute('aria-label')).toContain('SP-001');
  });
  it('does not invent missing-location warnings for zero coordinates or verification warnings for verified listings', () => {
    const f = create();
    expect(
      f.componentInstance.signals({
        ...listing,
        latitude: 0,
        longitude: 0,
        verification_status: 'VERIFIED',
        image_count: 3,
        open_reports_count: 0,
      }),
    ).toEqual([]);
  });
  it('shows audit activity with actor, listing link and local time', () => {
    const f = create();
    const activity = f.nativeElement.querySelector('.activity-list');
    expect(activity.textContent).toContain('Listing approved');
    expect(activity.textContent).toContain('by Andy');
    expect(activity.textContent).toContain('12:00');
    expect(activity.querySelector('a').getAttribute('href')).toBe('/staff/listings/listing-1');
  });
  it('limits queue and activity and only links working quick actions', () => {
    load.mockReturnValue(
      of({
        ...dashboard,
        latest_listings: Array.from({ length: 9 }, (_, i) => ({ ...listing, id: String(i) })),
        recent_activity: Array.from({ length: 10 }, (_, i) => ({
          ...dashboard.recent_activity[0],
          id: String(i),
        })),
      }),
    );
    const f = create();
    expect(f.nativeElement.querySelectorAll('.review-row').length).toBe(5);
    expect(f.nativeElement.querySelectorAll('.activity-list li').length).toBe(7);
    const quick = [...f.nativeElement.querySelectorAll('.quick-actions a')] as HTMLAnchorElement[];
    expect(quick.length).toBe(3);
    expect(quick.every((a) => a.getAttribute('href')?.startsWith('/staff/listings?status='))).toBe(
      true,
    );
  });
  it('shows skeletons instead of zero counts and prevents duplicate in-flight loads', () => {
    const response = new Subject<StaffDashboard>();
    load.mockReturnValue(response);
    const f = create();
    f.componentInstance.load();
    expect(load).toHaveBeenCalledTimes(1);
    expect(f.nativeElement.querySelector('[aria-label="Loading staff dashboard"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('.metric-number')).toBeNull();
    response.next(dashboard);
    response.complete();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.metric-number')).toBeTruthy();
  });
  it('offers a recoverable error and keeps quick actions available', () => {
    load.mockReturnValue(throwError(() => new Error('offline')));
    const f = create();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('.quick-actions')).toBeTruthy();
    load.mockReturnValue(of(dashboard));
    f.nativeElement.querySelector('.error-state button').click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.primary .metric')).toBeTruthy();
  });
  it('shows calm empty states and does not present unknown counts as zero', () => {
    load.mockReturnValue(
      of({
        ...dashboard,
        agency_reviews: null,
        verification_requests: null,
        awaiting_review: 0,
        open_reports: 0,
        latest_listings: [],
        recent_activity: [],
      }),
    );
    const f = create();
    expect(f.nativeElement.textContent).toContain('All caught up.');
    expect(f.nativeElement.textContent).toContain('No moderation activity yet.');
    expect(f.nativeElement.textContent).toContain('Count unavailable');
    expect(f.nativeElement.textContent).toContain('No open property reports');
  });
});

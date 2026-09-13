import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountNotification, SeekerSummary } from '../../core/models/account.models';
import { AuthService } from '../../core/auth/auth.service';
import { AccountActivityStore } from '../../core/services/account-activity.store';
import { NotificationNavigationService } from '../../core/services/notification-navigation.service';
import { AccountOverviewComponent } from './account-overview.component';

const summary = (overrides: Partial<SeekerSummary> = {}): SeekerSummary => ({
  total_saved_properties: 2,
  total_saved_stays: 1,
  active_saved_searches: 4,
  new_alert_count: 0,
  unread_notifications: 5,
  upcoming_stays: 1,
  pending_bookings: 2,
  confirmed_bookings: 1,
  unread_messages: 3,
  next_viewing: null,
  next_stay: null,
  verification_attention: [],
  advertiser_summary: null,
  ...overrides,
});

describe('AccountOverviewComponent', () => {
  let store: {
    summary: ReturnType<typeof signal<SeekerSummary | null>>;
    notifications: ReturnType<typeof signal<AccountNotification[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    summaryError: ReturnType<typeof signal<boolean>>;
    notificationsError: ReturnType<typeof signal<boolean>>;
    savedTotal: () => number;
    refresh: ReturnType<typeof vi.fn>;
    startPolling: ReturnType<typeof vi.fn>;
  };
  let navigation: { label: ReturnType<typeof vi.fn>; open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const currentSummary = signal<SeekerSummary | null>(summary());
    store = {
      summary: currentSummary,
      notifications: signal<AccountNotification[]>([]),
      loading: signal(false),
      summaryError: signal(false),
      notificationsError: signal(false),
      savedTotal: () =>
        (currentSummary()?.total_saved_properties || 0) +
        (currentSummary()?.total_saved_stays || 0),
      refresh: vi.fn(),
      startPolling: vi.fn(),
    };
    navigation = { label: vi.fn(() => 'Open'), open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [AccountOverviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { user: signal({ first_name: 'Andile', last_name: 'Hlophe' }) },
        },
        { provide: AccountActivityStore, useValue: store },
        { provide: NotificationNavigationService, useValue: navigation },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(AccountOverviewComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the authenticated name, six real counts and their routes', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Welcome back, Andile');
    const cards = Array.from(
      fixture.nativeElement.querySelectorAll('.summary-card'),
    ) as HTMLAnchorElement[];
    expect(cards).toHaveLength(6);
    expect(cards.map((card) => card.getAttribute('href'))).toEqual([
      '/account/saved',
      '/account/messages',
      '/account/alerts',
      '/account/notifications',
      '/account/bookings',
      '/account/bookings',
    ]);
    expect(cards.map((card) => card.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Saved listings3'),
        expect.stringContaining('Unread messages3'),
      ]),
    );
  });

  it('shows six skeleton cards instead of false zeroes while loading', () => {
    store.summary.set(null);
    store.loading.set(true);
    const fixture = create();
    expect(fixture.nativeElement.querySelectorAll('.summary-skeleton')).toHaveLength(6);
    expect(fixture.nativeElement.querySelectorAll('.summary-card')).toHaveLength(0);
  });

  it('prioritizes changes requested before the nearest viewing and stay', () => {
    store.summary.set(
      summary({
        next_viewing: {
          id: 'v1',
          property_title: 'Another Bedroom',
          property_slug: 'another-bedroom',
          requested_date: '2026-09-18',
          requested_time: '14:00:00',
          status: 'CONFIRMED',
        },
        next_stay: {
          id: 'b1',
          stay_name: 'Andy Guest House',
          stay_slug: 'andy-guest-house',
          check_in: '2026-09-22',
          check_out: '2026-09-24',
          status: 'CONFIRMED',
        },
        verification_attention: [
          {
            id: 'r1',
            verification_type: 'AGENCY',
            status: 'SUBMITTED',
            reviewer_notes: '',
            updated_at: '2026-09-13',
          },
          {
            id: 'r2',
            verification_type: 'IDENTITY',
            status: 'CHANGES_REQUESTED',
            reviewer_notes: 'Upload a clearer image.',
            updated_at: '2026-09-14',
          },
        ],
      }),
    );
    const fixture = create();
    const cards = Array.from(
      fixture.nativeElement.querySelectorAll('.attention-card'),
    ) as HTMLElement[];
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain('Changes requested');
    expect(cards[1].textContent).toContain('Upcoming viewing');
    expect(cards[2].textContent).toContain('Upcoming stay');
  });

  it('hides advertiser activity unless backend context exists', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('.advertiser-section')).toBeNull();
    store.summary.set(
      summary({
        advertiser_summary: {
          published_property_count: 1,
          pending_property_count: 1,
          published_stay_count: 0,
          pending_stay_count: 0,
          has_properties: true,
          has_stays: false,
          agency: { id: 'a1', name: "Andy's Real Estate" },
        },
      }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.advertiser-section').textContent).toContain(
      "Andy's Real Estate",
    );
    expect(
      fixture.nativeElement.querySelector('a[href="/account/manage/properties"]'),
    ).not.toBeNull();
  });

  it('shows the clear attention and activity empty states', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Nothing needs your attention right now');
    expect(fixture.nativeElement.textContent).toContain('No recent activity yet');
  });

  it('renders recent notification activity through existing navigation', () => {
    const item: AccountNotification = {
      id: 'n1',
      notification_type: 'LISTING_STATUS_UPDATE',
      title: 'Listing approved',
      message: 'Your listing Another Bedroom was approved.',
      data: {},
      action: { label: 'View listing', url: '/properties/another-bedroom' },
      is_read: false,
      read_at: null,
      created_at: '2026-09-13T12:00:00Z',
      expires_at: null,
    };
    store.notifications.set([item]);
    navigation.label.mockReturnValue('View listing');
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Listing approved');
    fixture.nativeElement.querySelector('sp-notification-item button').click();
    expect(navigation.open).toHaveBeenCalledWith(item, expect.any(Function));
  });
});

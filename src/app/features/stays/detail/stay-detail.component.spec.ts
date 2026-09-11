import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { StayDetailComponent } from './stay-detail.component';
import { StaysApiService } from '../../../core/api/stays-api.service';
import { FavouritesApiService } from '../../../core/api/favourites-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { StayQueryService } from '../../../core/services/stay-query.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { MessagingApiService } from '../../../core/api/messaging-api.service';
import { LeafletLoaderService } from '../../../shared/map/leaflet-loader.service';

describe('StayDetailComponent', () => {
  let route: BehaviorSubject<any>;
  let detail: ReturnType<typeof vi.fn>;
  let availability: ReturnType<typeof vi.fn>;
  let seoApply: ReturnType<typeof vi.fn>;
  const stay: any = {
    id: 's1',
    public_id: 'SP-STAY-1',
    slug: 'demo-piggs-peak-mountain-retreat',
    name: 'Demo Piggs Peak Mountain Retreat',
    stay_type: 'GUEST_HOUSE',
    description: 'A quiet mountain stay with room options.',
    country_code: 'SZ',
    region: 'Hhohho',
    town: 'Piggs Peak',
    suburb: '',
    address: '',
    latitude: '-25.9600',
    longitude: '31.2500',
    verification_status: 'VERIFIED',
    verification_badges: [{ type: 'STAY', label: 'Verified Stay' }],
    featured: false,
    is_favourited: false,
    created_at: '',
    published_at: '2026-01-01',
    updated_at: '',
    phone: '+26876000000',
    email: 'stay@example.com',
    whatsapp_number: '',
    website: '',
    check_in_time: '14:00:00',
    check_out_time: '10:00:00',
    images: [
      {
        id: 'i1',
        image: '/stay.jpg',
        caption: 'Mountain view',
        sort_order: 0,
        is_cover: true,
        created_at: '',
      },
    ],
    amenities: [{ id: 'a1', name: 'Wi-Fi', slug: 'wifi', icon: 'wifi', category: '' }],
    room_types: [
      {
        id: 'r1',
        name: 'Mountain Room',
        slug: 'mountain-room',
        description: 'A calm room.',
        capacity_adults: 2,
        capacity_children: 0,
        total_capacity: 2,
        number_of_beds: 1,
        bed_configuration: 'Queen',
        bathroom_type: 'Private',
        quantity: 1,
        base_price: '950.00',
        currency: 'SZL',
        minimum_stay: 1,
        is_active: true,
        images: [],
        created_at: '',
        updated_at: '',
      },
    ],
    agency: null,
    agent: null,
  };
  const authenticated = signal(false);
  const user = signal(null);

  beforeEach(() => {
    route = new BehaviorSubject(convertToParamMap({ slug: stay.slug }));
    detail = vi.fn(() => of(stay));
    availability = vi.fn(() =>
      of({
        room_types: [
          {
            available: true,
            room_type_id: 'r1',
            rooms_available: 1,
            nightly_prices: [{ date: '2026-10-12', price: '950.00' }],
            total: '950.00',
          },
        ],
      }),
    );
    seoApply = vi.fn();
    TestBed.configureTestingModule({
      imports: [StayDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: route,
            snapshot: {
              paramMap: convertToParamMap({ slug: stay.slug }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        {
          provide: StaysApiService,
          useValue: {
            detail,
            search: vi.fn(() => of({ count: 0, next: null, previous: null, results: [] })),
            availability,
            report: vi.fn(() => of({ id: 'report-1' })),
            createBooking: vi.fn(),
          },
        },
        {
          provide: FavouritesApiService,
          useValue: { addStay: vi.fn(() => of({})), remove: vi.fn(() => of(undefined)) },
        },
        { provide: AuthService, useValue: { user, isAuthenticated: authenticated } },
        { provide: StayQueryService },
        {
          provide: SeoService,
          useValue: {
            set: vi.fn(),
            apply: seoApply,
            absoluteUrl: (path: string) => `http://localhost:4200${path}`,
          },
        },
        { provide: ToastService, useValue: { show: vi.fn() } },
        {
          provide: MessagingApiService,
          useValue: { createForStay: vi.fn(() => of({ id: 'c1' })) },
        },
        { provide: LeafletLoaderService, useValue: { load: vi.fn(() => Promise.resolve(null)) } },
      ],
    });
  });

  it('keeps prerender-compatible stay content visible after loading by slug', () => {
    const fixture = TestBed.createComponent(StayDetailComponent);
    fixture.detectChanges();

    expect(detail).toHaveBeenCalledWith(stay.slug);
    expect(fixture.nativeElement.textContent).toContain('Demo Piggs Peak Mountain Retreat');
    expect(fixture.nativeElement.textContent).toContain('Choose your room');
    expect(fixture.nativeElement.textContent).toContain('Piggs Peak, Hhohho, Eswatini');
    expect(fixture.nativeElement.textContent).not.toContain('Reviews');
    expect(fixture.nativeElement.querySelector('.mobile-booking')).toBeTruthy();
  });

  it('shows Verified Stay only from the stay verification status', () => {
    const fixture = TestBed.createComponent(StayDetailComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.verified-stay')?.textContent).toContain(
      'Verified Stay',
    );

    detail.mockReturnValueOnce(of({ ...stay, verification_status: 'PENDING' }));
    route.next(convertToParamMap({ slug: 'pending-stay' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.verified-stay')).toBeNull();
  });

  it('hydrates dates, guests, and rooms from the stay search URL', () => {
    TestBed.resetTestingModule();
    detail = vi.fn(() => of(stay));
    availability = vi.fn(() => of({ room_types: [] }));
    seoApply = vi.fn();
    TestBed.configureTestingModule({
      imports: [StayDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: new BehaviorSubject(convertToParamMap({ slug: stay.slug })),
            snapshot: {
              paramMap: convertToParamMap({ slug: stay.slug }),
              queryParamMap: convertToParamMap({
                check_in: '2026-10-12',
                check_out: '2026-10-13',
                adults: '3',
                children: '1',
                rooms: '2',
              }),
            },
          },
        },
        {
          provide: StaysApiService,
          useValue: {
            detail,
            search: vi.fn(() => of({ count: 0, next: null, previous: null, results: [] })),
            availability,
            report: vi.fn(() => of({ id: 'report-1' })),
            createBooking: vi.fn(),
          },
        },
        {
          provide: FavouritesApiService,
          useValue: { addStay: vi.fn(() => of({})), remove: vi.fn(() => of(undefined)) },
        },
        { provide: AuthService, useValue: { user, isAuthenticated: authenticated } },
        { provide: StayQueryService },
        {
          provide: SeoService,
          useValue: {
            set: vi.fn(),
            apply: seoApply,
            absoluteUrl: (path: string) => `http://localhost:4200${path}`,
          },
        },
        { provide: ToastService, useValue: { show: vi.fn() } },
        {
          provide: MessagingApiService,
          useValue: { createForStay: vi.fn(() => of({ id: 'c1' })) },
        },
        { provide: LeafletLoaderService, useValue: { load: vi.fn(() => Promise.resolve(null)) } },
      ],
    });

    const fixture = TestBed.createComponent(StayDetailComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.criteria()).toEqual({
      check_in: '2026-10-12',
      check_out: '2026-10-13',
      adults: 3,
      children: 1,
      rooms: 2,
    });
    expect(availability).toHaveBeenCalledWith(stay.slug, fixture.componentInstance.criteria());
  });

  it('normalizes string coordinates for the stay detail map marker', () => {
    const fixture = TestBed.createComponent(StayDetailComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.markers()).toEqual([
      {
        id: 's1',
        latitude: -25.96,
        longitude: 31.25,
        label: 'Stay',
        title: 'Demo Piggs Peak Mountain Retreat',
      },
    ]);
  });

  it('redirects anonymous favourite actions and preserves the stay URL', () => {
    const fixture = TestBed.createComponent(StayDetailComponent);
    fixture.detectChanges();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.toggleFavourite();

    expect(nav).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: `/stays/${stay.slug}` },
    });
  });

  it('shows the stay-specific not-found state', () => {
    detail.mockReturnValue(throwError(() => ({ status: 404 })));
    const fixture = TestBed.createComponent(StayDetailComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no longer available');
    expect(seoApply).toHaveBeenCalledWith(expect.objectContaining({ robots: 'noindex, follow' }));
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { PropertiesApiService } from '../../core/api/properties-api.service';
import { StaysApiService } from '../../core/api/stays-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ConfigApiService } from '../../core/api/config-api.service';
import { AuthService } from '../../core/auth/auth.service';
describe('HomeComponent', () => {
  const page = { count: 0, next: null, previous: null, results: [] };
  const properties = { featured: vi.fn(() => of(page)) };
  const stays = { featured: vi.fn(() => of(page)) };
  const propertyTypes = [
    { value: 'HOUSE', label: 'House' },
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'TOWNHOUSE', label: 'Townhouse' },
    { value: 'FLAT', label: 'Flat' },
    { value: 'LAND', label: 'Land' },
    { value: 'OFFICE', label: 'Office' },
    { value: 'SHOP', label: 'Shop' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'COMMERCIAL', label: 'Commercial' },
    { value: 'OTHER', label: 'Other' },
  ];
  const propertyCard = {
    id: 'property-1',
    public_id: 'SP-1',
    slug: 'async-villa',
    title: 'Async Villa',
    listing_type: 'RENT',
    property_type: 'HOUSE',
    price: '12000.00',
    currency: 'SZL',
    town: 'Mbabane',
    suburb: 'Sidwashini',
    region: 'Hhohho',
    latitude: null,
    longitude: null,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    featured: true,
    verification_status: 'UNVERIFIED',
    verification_badges: [],
    availability_status: 'AVAILABLE',
    availability_confirmed_at: null,
    cover_image: null,
    is_favourited: false,
    created_at: '2026-09-09T00:00:00Z',
  };
  const stayCard = {
    id: 'stay-1',
    public_id: 'SS-1',
    slug: 'async-lodge',
    name: 'Async Lodge',
    stay_type: 'LODGE',
    region: 'Hhohho',
    town: 'Ezulwini',
    suburb: 'Valley',
    verification_status: 'UNVERIFIED',
    verification_badges: [],
    featured: true,
    cover_image: null,
    minimum_nightly_price: '950.00',
    available_room_type_count: 2,
    is_favourited: false,
    created_at: '2026-09-09T00:00:00Z',
  };
  const refs = {
    data: signal({
      property_types: propertyTypes,
      property_amenities: [],
      listing_types: [],
      stay_types: [],
      regions: [{ value: 'HH', label: 'Hhohho', areas: ['Mbabane', 'Ezulwini'] }],
      countries: [],
      currencies: [],
      verification_types: [],
    }),
  };
  const config = {
    config: signal({
      default_country: 'SZ',
      default_currency: 'SZL',
      supported_currencies: ['SZL'],
      features: {
        properties: true,
        stays: true,
        bookings: true,
        internal_messaging: true,
        registration: true,
      },
      map: { default_latitude: 0, default_longitude: 0, default_zoom: 8 },
    }),
  };
  beforeEach(() => {
    properties.featured.mockClear();
    stays.featured.mockClear();
    refs.data.set({
      property_types: propertyTypes,
      property_amenities: [],
      listing_types: [],
      stay_types: [],
      regions: [{ value: 'HH', label: 'Hhohho', areas: ['Mbabane', 'Ezulwini'] }],
      countries: [],
      currencies: [],
      verification_types: [],
    });
    config.config.update((v) => ({ ...v, features: { ...v.features, stays: true } }));
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: PropertiesApiService, useValue: properties },
        { provide: StaysApiService, useValue: stays },
        { provide: ReferenceApiService, useValue: refs },
        { provide: ConfigApiService, useValue: config },
        { provide: AuthService, useValue: { isAuthenticated: signal(false) } },
      ],
    });
  });
  it('renders and fetches both featured sections', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Find your SurePlace.');
    expect(properties.featured).toHaveBeenCalled();
    expect(stays.featured).toHaveBeenCalled();
  });
  it('switches Rent, Buy and Stay without navigating', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const c = f.componentInstance;
    c.setMode('BUY');
    expect(c.mode()).toBe('BUY');
    c.setMode('STAY');
    expect(c.mode()).toBe('STAY');
  });
  it.each([
    ['RENT', 'RENT'],
    ['BUY', 'SALE'],
  ] as const)('navigates %s searches with property params', (mode, listing) => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate');
    f.componentInstance.setMode(mode);
    f.componentInstance.propertyForm.patchValue({ town: 'Ezulwini', property_type: 'HOUSE' });
    f.componentInstance.search();
    expect(nav).toHaveBeenCalledWith(['/properties'], {
      queryParams: expect.objectContaining({
        listing_type: listing,
        town: 'Ezulwini',
        property_type: 'HOUSE',
      }),
    });
  });
  it('navigates stay searches with occupancy and dates', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate');
    const c = f.componentInstance;
    c.setMode('STAY');
    c.stayForm.patchValue({
      town: 'Mbabane',
      check_in: '2026-10-01',
      check_out: '2026-10-03',
      adults: 2,
      children: 1,
      rooms: 1,
    });
    c.search();
    expect(nav).toHaveBeenCalledWith(['/stays'], {
      queryParams: expect.objectContaining({ town: 'Mbabane', children: 1 }),
    });
  });
  it('allows a destination-only stay search', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate');
    f.componentInstance.setMode('STAY');
    f.componentInstance.stayForm.patchValue({ town: 'Ezulwini', check_in: '', check_out: '' });
    f.componentInstance.search();
    expect(nav).toHaveBeenCalledWith(['/stays'], {
      queryParams: expect.objectContaining({ town: 'Ezulwini' }),
    });
  });
  it('shows stable skeletons while sections load', () => {
    properties.featured.mockReturnValueOnce(
      new (class {
        subscribe() {
          return { unsubscribe() {} };
        }
        pipe(..._args: unknown[]) {
          return this;
        }
      })() as never,
    );
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });
  it('renders delayed featured properties as soon as async data arrives', () => {
    const delayedProperties = new Subject<typeof page>();
    properties.featured.mockReturnValueOnce(delayedProperties.asObservable());
    const f = TestBed.createComponent(HomeComponent);

    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.skeleton').length).toBeGreaterThan(0);

    delayedProperties.next({
      count: 1,
      next: null,
      previous: null,
      results: [propertyCard] as never,
    });
    delayedProperties.complete();
    f.detectChanges();

    expect(f.nativeElement.querySelector('sp-property-card')).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('Async Villa');
  });
  it('updates mobile Swipers when async reference slides arrive', () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const frameCallbacks: FrameRequestCallback[] = [];
    const flushFrames = () => {
      const callbacks = frameCallbacks.splice(0);
      callbacks.forEach((callback) => callback(0));
    };
    const raf = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    globalThis.requestAnimationFrame = raf as never;
    globalThis.cancelAnimationFrame = vi.fn() as never;
    refs.data.update((v) => ({ ...v, property_types: [] }));
    const f = TestBed.createComponent(HomeComponent);

    try {
      f.detectChanges();
      const swiper = f.nativeElement.querySelector('swiper-container.type-swiper') as HTMLElement & {
        swiper: { update: ReturnType<typeof vi.fn> };
        update: ReturnType<typeof vi.fn>;
      };
      swiper.swiper = { update: vi.fn() };
      swiper.update = vi.fn();
      flushFrames();
      swiper.swiper.update.mockClear();
      swiper.update.mockClear();
      raf.mockClear();

      refs.data.update((v) => ({ ...v, property_types: propertyTypes }));
      f.detectChanges();
      flushFrames();

      expect(raf).toHaveBeenCalled();
      expect(swiper.swiper.update).toHaveBeenCalled();
      expect(swiper.update).toHaveBeenCalled();
      expect(f.nativeElement.querySelectorAll('.type-swiper swiper-slide').length).toBe(
        propertyTypes.length,
      );
    } finally {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
  it('keeps the homepage usable when one featured request fails', () => {
    stays.featured.mockReturnValueOnce(throwError(() => new Error('offline')));
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Featured Properties');
    expect(f.nativeElement.textContent).toContain('Discover stays across Eswatini');
  });
  it('hides stay UI and does not fetch stays when disabled', () => {
    config.config.update((v) => ({ ...v, features: { ...v.features, stays: false } }));
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    expect(stays.featured).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).not.toContain('Featured Stays');
  });
  it('renders six photographic destinations without numbering or fake counts', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const cards = el.querySelectorAll('.destination-grid .destination-card');
    expect(cards.length).toBe(6);
    for (const place of ['Mbabane', 'Manzini', 'Ezulwini', 'Matsapha', 'Lobamba', 'Siteki']) {
      expect(el.textContent).toContain(place);
    }
    expect(el.textContent).not.toContain('01');
    expect(el.textContent).not.toContain('24 properties');
    expect(el.textContent).not.toContain('8 stays');
  });
  it('links destination actions to existing town filters', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.destination-card a')).filter(
      (link) => link.getAttribute('href')?.includes('Mbabane'),
    );
    expect(links.some((link) => link.getAttribute('href')?.startsWith('/properties'))).toBe(true);
    expect(links.some((link) => link.getAttribute('href')?.startsWith('/stays'))).toBe(true);
    expect(links.every((link) => link.getAttribute('href')?.includes('town=Mbabane'))).toBe(true);
  });
  it('uses image fallbacks and accessible image labels', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const firstPhoto: HTMLElement = f.nativeElement.querySelector('.destination-photo');
    expect(firstPhoto.getAttribute('role')).toBe('img');
    expect(firstPhoto.getAttribute('aria-label')).toContain('Mbabane');
    f.componentInstance.markDestinationImageFailed();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.destination-photo.is-fallback')).toBeTruthy();
    expect(
      f.componentInstance.destinationBackground(f.componentInstance.destinations[0]),
    ).toBeNull();
  });
  it('initializes mobile Swiper while preserving desktop grid markup', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const swiper = f.nativeElement.querySelector('swiper-container.destination-swiper');
    expect(swiper).toBeTruthy();
    expect(swiper.getAttribute('slides-per-view')).toBe('1.12');
    expect(swiper.getAttribute('auto-height')).toBe('true');
    expect(swiper.getAttribute('observer')).toBe('true');
    expect(swiper.getAttribute('observe-parents')).toBe('true');
    expect(swiper.getAttribute('pagination')).toBe('true');
    expect(f.nativeElement.querySelector('.destination-grid')).toBeTruthy();
  });
  it('renders all backend property types as visual card links', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const gridCards = el.querySelectorAll<HTMLAnchorElement>('.type-grid .type-card');
    expect(gridCards.length).toBe(propertyTypes.length);
    for (const type of propertyTypes) {
      expect(el.textContent).toContain(type.label);
    }
    expect(el.textContent).toContain('Find the right space for every chapter');
    expect(el.textContent).not.toContain('View listings');
  });
  it('maps property types to distinct descriptors and fallback icons', () => {
    const f = TestBed.createComponent(HomeComponent);
    const c = f.componentInstance;
    expect(c.propertyTypeDescriptor({ value: 'HOUSE', label: 'House' })).toBe('Family homes');
    expect(c.propertyTypeDescriptor({ value: 'WAREHOUSE', label: 'Warehouse' })).toBe(
      'Storage & logistics',
    );
    expect(c.propertyTypeIcon({ value: 'HOUSE', label: 'House' })).toBe('fa-solid fa-house');
    expect(c.propertyTypeIcon({ value: 'SHOP', label: 'Shop' })).toBe('fa-solid fa-store');
    expect(c.propertyTypeIcon({ value: 'LAND', label: 'Land' })).not.toBe(
      c.propertyTypeIcon({ value: 'OFFICE', label: 'Office' }),
    );
  });
  it('links property type cards to the existing property_type query filter', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const house = Array.from(el.querySelectorAll<HTMLAnchorElement>('.type-grid .type-card')).find(
      (link) => link.getAttribute('aria-label') === 'Browse House listings',
    );
    expect(house?.getAttribute('href')).toBe('/properties?property_type=HOUSE');
  });
  it('omits unavailable counts and pluralizes real counts when provided', () => {
    refs.data.update((v) => ({
      ...v,
      property_types: [
        { value: 'HOUSE', label: 'House', count: 1 },
        { value: 'APARTMENT', label: 'Apartment', count: 12 },
      ],
    }));
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const text = f.nativeElement.textContent;
    expect(text).toContain('1 listing');
    expect(text).toContain('12 listings');
    refs.data.update((v) => ({ ...v, property_types: propertyTypes }));
  });
  it('uses property type image fallbacks and accessible labels', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const firstPhoto: HTMLElement = f.nativeElement.querySelector('.type-photo');
    expect(firstPhoto.getAttribute('role')).toBe('img');
    expect(firstPhoto.getAttribute('aria-label')).toContain('House');
    f.componentInstance.markPropertyTypeImageFailed();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.type-photo.is-fallback')).toBeTruthy();
    expect(
      f.componentInstance.propertyTypeBackground(
        f.componentInstance.references.data().property_types[0],
      ),
    ).toBeNull();
  });
  it('initializes property type mobile Swiper while preserving desktop grid markup', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const swiper = f.nativeElement.querySelector('swiper-container.type-swiper');
    expect(swiper).toBeTruthy();
    expect(swiper.getAttribute('slides-per-view')).toBe('1.12');
    expect(swiper.getAttribute('auto-height')).toBe('true');
    expect(swiper.getAttribute('observer')).toBe('true');
    expect(swiper.getAttribute('observe-parents')).toBe('true');
    expect(swiper.getAttribute('pagination')).toBe('true');
    expect(f.nativeElement.querySelector('.type-grid')).toBeTruthy();
  });
  it('uses a shared homepage carousel contract for all Swiper sections', () => {
    properties.featured.mockReturnValueOnce(
      of({ count: 1, next: null, previous: null, results: [propertyCard] as never }),
    );
    stays.featured.mockReturnValueOnce(
      of({ count: 1, next: null, previous: null, results: [stayCard] as never }),
    );
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const swipers = Array.from(
      (f.nativeElement as HTMLElement).querySelectorAll('swiper-container.homepage-swiper'),
    ) as HTMLElement[];

    expect(swipers.length).toBe(4);
    expect(swipers.every((swiper) => swiper.getAttribute('pagination') === 'true')).toBe(true);
    expect(swipers.every((swiper) => swiper.getAttribute('auto-height') === 'true')).toBe(true);
    expect(swipers.every((swiper) => swiper.getAttribute('observer') === 'true')).toBe(true);
    expect(swipers.every((swiper) => swiper.getAttribute('observe-parents') === 'true')).toBe(
      true,
    );
    expect(
      swipers.every((swiper) => Number(swiper.getAttribute('slides-per-view')) <= 1.12),
    ).toBe(true);
  });
  it('keeps property type cards keyboard reachable with descriptive labels', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.type-card[aria-label]'));
    expect(links.length).toBeGreaterThanOrEqual(propertyTypes.length);
    expect(links.some((link) => link.getAttribute('aria-label') === 'Browse House listings')).toBe(
      true,
    );
  });
  it('keeps destination controls keyboard reachable with descriptive labels', () => {
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const links = Array.from(
      el.querySelectorAll<HTMLAnchorElement>('.destination-card a[aria-label]'),
    );
    expect(links.length).toBeGreaterThanOrEqual(18);
    expect(
      links.some((link) => link.getAttribute('aria-label') === 'View properties in Mbabane'),
    ).toBe(true);
    expect(links.some((link) => link.getAttribute('aria-label') === 'Explore Mbabane')).toBe(true);
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
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
  const refs = {
    data: signal({
      property_types: [{ value: 'HOUSE', label: 'Houses' }],
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
});

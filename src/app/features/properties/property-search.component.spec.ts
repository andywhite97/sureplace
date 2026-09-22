import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { PropertySearchComponent } from './property-search.component';
import { PropertiesApiService } from '../../core/api/properties-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ConfigApiService } from '../../core/api/config-api.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { FavouritesApiService } from '../../core/api/favourites-api.service';
import { ToastService } from '../../core/services/toast.service';
import { PropertyCard } from '../../core/models/listing.models';

describe('PropertySearchComponent', () => {
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let search: ReturnType<typeof vi.fn>;
  const item: PropertyCard = { id: '1', public_id: 'SP1', slug: 'home', title: 'Ezulwini Home', listing_type: 'RENT', property_type: 'HOUSE', price: '8500', currency: 'SZL', town: 'Ezulwini', suburb: '', region: 'Hhohho', latitude: -26.4, longitude: 31.2, bedrooms: 3, bathrooms: '2', parking_spaces: 1, featured: false, verification_status: 'VERIFIED', verification_badges: [], availability_status: 'AVAILABLE', availability_confirmed_at: null, cover_image: null, is_favourited: false, created_at: '' };

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ listing_type: 'RENT', town: 'Ezulwini' }));
    search = vi.fn(() => of({ count: 0, next: null, previous: null, results: [] }));
    TestBed.configureTestingModule({
      imports: [PropertySearchComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
        { provide: PropertiesApiService, useValue: { search } },
        { provide: ReferenceApiService, useValue: { data: signal({ property_types: [{ value: 'HOUSE', label: 'Houses' }], property_amenities: [{ id: 'a1', name: 'Garden', slug: 'garden', category: 'Outdoor' }], listing_types: [], stay_types: [], regions: [{ value: 'HHOHHO', label: 'Hhohho', areas: ['Ezulwini'] }], countries: [], currencies: [], verification_types: [] }) } },
        { provide: ConfigApiService, useValue: { config: signal({ map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 } }) } },
        { provide: SeoService, useValue: { apply: vi.fn(), absoluteUrl: (path: string) => `http://localhost:4200${path}` } },
        { provide: AuthService, useValue: { isAuthenticated: signal(false) } },
        { provide: FavouritesApiService, useValue: {} },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    });
  });

  it('parses URL state and performs the initial search', () => {
    const fixture = TestBed.createComponent(PropertySearchComponent);
    fixture.detectChanges();
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ listing_type: 'RENT', town: 'Ezulwini' }));
    expect(fixture.componentInstance.form.controls.town.value).toBe('Ezulwini');
    expect(fixture.nativeElement.textContent).toContain('Properties for Rent in Ezulwini');
  });

  it('renders URL-driven mobile controls and the result summary', () => {
    search.mockReturnValue(of({ count: 41, next: 'next', previous: null, results: [item] }));
    const fixture = TestBed.createComponent(PropertySearchComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.location-control')?.textContent).toContain('Ezulwini');
    expect(element.querySelector('.mobile-count')?.textContent).toContain('41 properties');
    expect(element.querySelector('.mobile-segment .active')?.textContent).toContain('Rent');
    expect(element.querySelector('.mobile-view-toggle .active')?.textContent).toContain('List');
    expect(element.querySelector('.mobile-results-summary')?.textContent).toContain('Page 1 of 3');
  });

  it('preserves query state when mobile controls change mode or view', () => {
    const fixture = TestBed.createComponent(PropertySearchComponent);
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.mobile-view-toggle button:last-child')?.click();
    expect(navigate.mock.calls.at(-1)?.[0].toString()).toContain('view=map');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.mobile-segment button:last-child')?.click();
    expect(navigate.mock.calls.at(-1)?.[0].toString()).toContain('listing_type=SALE');
  });

  it('serializes filters and map bounds', () => {
    const fixture = TestBed.createComponent(PropertySearchComponent);
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.patchValue({ listing_type: 'SALE', property_type: 'HOUSE', min_price: '4000', max_price: '10000', min_bedrooms: '3', amenities: ['a1'] });
    fixture.componentInstance.apply();
    expect(navigate.mock.calls.at(-1)?.[0].toString()).toContain('property_type=HOUSE');
    fixture.componentInstance.applyBounds({ north: '-26', south: '-27', east: '32', west: '31' });
    expect(navigate.mock.calls.at(-1)?.[0].toString()).toContain('north=-26');
  });

  it('renders matching mobile skeletons while loading', () => {
    search.mockReturnValue(new Subject());
    const fixture = TestBed.createComponent(PropertySearchComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.skeleton').length).toBe(6);
  });
});

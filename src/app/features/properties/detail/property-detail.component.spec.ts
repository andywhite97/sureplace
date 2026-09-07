import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { PropertyDetailComponent } from './property-detail.component';
import { PropertiesApiService } from '../../../core/api/properties-api.service';
import { RelatedPropertiesService } from '../../../core/services/related-properties.service';
import { PropertyActionsApiService } from '../../../core/api/property-actions-api.service';
import { FavouritesApiService } from '../../../core/api/favourites-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SeoService } from '../../../core/services/seo.service';
describe('PropertyDetailComponent', () => {
  let route: BehaviorSubject<any>;
  let detail: any;
  const property: any = {
    id: 'p1',
    public_id: 'SP-1',
    slug: 'green-home',
    title: 'Modern Green Home',
    description: 'A spacious and carefully presented family home.',
    listing_type: 'RENT',
    property_type: 'HOUSE',
    price: '8500.00',
    currency: 'SZL',
    region: 'Hhohho',
    town: 'Ezulwini',
    suburb: 'Lobamba',
    address: '',
    latitude: null,
    longitude: null,
    bedrooms: 3,
    bathrooms: '2.00',
    parking_spaces: 2,
    floor_area: '180.00',
    land_area: '900.00',
    furnished: true,
    pet_friendly: true,
    amenities: [{ id: 'a1', name: 'Garden', slug: 'garden', icon: '', category: 'Outdoor' }],
    images: [],
    verification_status: 'VERIFIED',
    verification_badges: [{ type: 'PROPERTY', label: 'Verified Property' }],
    availability_status: 'AVAILABLE',
    availability_confirmed_at: new Date().toISOString(),
    agent: null,
    agency: null,
    is_favourited: false,
    featured: false,
    created_at: '',
    published_at: '2026-01-01',
    updated_at: '',
    expires_at: null,
  };
  const authenticated = signal(false);
  beforeEach(() => {
    route = new BehaviorSubject(convertToParamMap({ slug: 'green-home' }));
    detail = vi.fn(() => of(property));
    TestBed.configureTestingModule({
      imports: [PropertyDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: route,
            snapshot: { paramMap: convertToParamMap({ slug: 'green-home' }) },
          },
        },
        { provide: PropertiesApiService, useValue: { detail } },
        { provide: RelatedPropertiesService, useValue: { for: vi.fn(() => of([])) } },
        {
          provide: PropertyActionsApiService,
          useValue: {
            message: () => of({ id: '1' }),
            viewing: () => of({ id: '1' }),
            report: () => of({ id: '1' }),
          },
        },
        {
          provide: FavouritesApiService,
          useValue: { addProperty: vi.fn(() => of({})), remove: vi.fn(() => of(undefined)) },
        },
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: SeoService, useValue: { set: vi.fn(), canonical: vi.fn() } },
      ],
    });
  });
  it('loads by slug and renders identity, price, specs, description, amenities, verification and availability', () => {
    const f = TestBed.createComponent(PropertyDetailComponent);
    f.detectChanges();
    const text = f.nativeElement.textContent;
    expect(detail).toHaveBeenCalledWith('green-home');
    expect(text).toContain('Modern Green Home');
    expect(text).toContain('E8,500');
    expect(text).toContain('3');
    expect(text).toContain('spacious');
    expect(text).toContain('Garden');
    expect(text).toContain('Verified Property');
    expect(text).toContain('Availability confirmed today');
  });
  it('reloads when the route slug changes', () => {
    TestBed.createComponent(PropertyDetailComponent).detectChanges();
    route.next(convertToParamMap({ slug: 'next-home' }));
    expect(detail).toHaveBeenLastCalledWith('next-home');
  });
  it('shows the property-specific not-found state', () => {
    detail.mockReturnValue(throwError(() => ({ status: 404 })));
    const f = TestBed.createComponent(PropertyDetailComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('no longer available');
  });
  it('redirects anonymous favourite actions and preserves return URL', () => {
    const f = TestBed.createComponent(PropertyDetailComponent);
    f.detectChanges();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    f.componentInstance.toggleFavourite();
    expect(nav).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/properties/green-home' },
    });
  });
  it('hides the map without coordinates', () => {
    const f = TestBed.createComponent(PropertyDetailComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('sp-listing-map')).toBeNull();
  });
  it('hides an empty related section', () => {
    const f = TestBed.createComponent(PropertyDetailComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('You may also like');
  });
});

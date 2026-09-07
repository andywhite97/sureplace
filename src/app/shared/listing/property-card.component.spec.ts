import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PropertyCardComponent } from './property-card.component';
import { AuthService } from '../../core/auth/auth.service';
import { FavouritesApiService } from '../../core/api/favourites-api.service';
import { ToastService } from '../../core/services/toast.service';
import { PropertyCard } from '../../core/models/listing.models';
describe('PropertyCardComponent', () => {
  const item: PropertyCard = {
    id: 'p1',
    public_id: 'SP-1',
    slug: 'green-home',
    title: 'Green Home',
    listing_type: 'RENT',
    property_type: 'HOUSE',
    price: '8500.00',
    currency: 'SZL',
    town: 'Ezulwini',
    suburb: 'Malkerns Road',
    region: 'Manzini',
    latitude: -26.4,
    longitude: 31.2,
    bedrooms: 3,
    bathrooms: '2.00',
    parking_spaces: 2,
    featured: true,
    verification_status: 'VERIFIED',
    verification_badges: [{ type: 'PROPERTY', label: 'Verified Property' }],
    availability_status: 'AVAILABLE',
    availability_confirmed_at: new Date().toISOString(),
    cover_image: null,
    is_favourited: true,
    created_at: '',
  };
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [PropertyCardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: signal(false) } },
        {
          provide: FavouritesApiService,
          useValue: { addProperty: () => of({}), remove: () => of(undefined) },
        },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }),
  );
  it('renders price, location, specs, verification and favourite state', () => {
    const f = TestBed.createComponent(PropertyCardComponent);
    f.componentRef.setInput('item', item);
    f.detectChanges();
    const text = f.nativeElement.textContent;
    expect(text).toContain('E8,500');
    expect(text).toContain('Malkerns Road, Ezulwini');
    expect(text).toContain('3 beds');
    expect(text).toContain('Verified Property');
    expect(f.nativeElement.querySelector('.fav').classList).toContain('active');
  });
  it('links the card content to its detail route', () => {
    const f = TestBed.createComponent(PropertyCardComponent);
    f.componentRef.setInput('item', item);
    f.detectChanges();
    expect(f.nativeElement.querySelector('h3 a').getAttribute('href')).toBe(
      '/properties/green-home',
    );
  });
});

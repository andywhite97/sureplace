import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { PropertiesApiService } from '../../../core/api/properties-api.service';
import { RelatedPropertiesService } from '../../../core/services/related-properties.service';
import { SeoService } from '../../../core/services/seo.service';
import { FavouritesApiService } from '../../../core/api/favourites-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PropertyCard, PropertyDetail } from '../../../core/models/listing.models';
import { PropertyGalleryComponent } from './property-gallery.component';
import { PropertyContactComponent } from './property-contact.component';
import { PropertyCardComponent } from '../../../shared/listing/property-card.component';
import { VerificationBadgeComponent } from '../../../shared/ui/verification-badge.component';
import { AvailabilityStatusComponent } from '../../../shared/ui/availability-status.component';
import { ListingMapComponent } from '../../../shared/map/listing-map.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { formatMoney } from '../../../shared/listing/price-format';
@Component({
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    PropertyGalleryComponent,
    PropertyContactComponent,
    PropertyCardComponent,
    VerificationBadgeComponent,
    AvailabilityStatusComponent,
    ListingMapComponent,
    IconComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './property-detail.component.html',
  styleUrl: './property-detail.component.scss',
})
export class PropertyDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(PropertiesApiService);
  private relatedApi = inject(RelatedPropertiesService);
  private fav = inject(FavouritesApiService);
  auth = inject(AuthService);
  private toast = inject(ToastService);
  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);
  property = signal<PropertyDetail | null>(null);
  related = signal<PropertyCard[]>([]);
  loading = signal(true);
  notFound = signal(false);
  error = signal<{ message: string; requestId: string | null } | null>(null);
  saving = signal(false);
  expanded = signal(false);
  price = computed(() => {
    const p = this.property();
    return p ? formatMoney(p.price, p.currency) : '';
  });
  constructor() {
    this.seo.set('Property', 'Discover property for rent and sale on SurePlace.');
    this.route.paramMap
      .pipe(
        map((p) => p.get('slug') || ''),
        tap(() => {
          this.loading.set(true);
          this.notFound.set(false);
          this.error.set(null);
        }),
        switchMap((slug) =>
          this.api.detail(slug).pipe(
            catchError((e) => {
              if (e.status === 404) this.notFound.set(true);
              else
                this.error.set({
                  message: e?.error?.message || 'We could not load this property.',
                  requestId: e?.error?.request_id || null,
                });
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
      )
      .subscribe((p) => {
        this.property.set(p);
        if (p) {
          const path = `/properties/${p.slug}`;
          this.seo.apply({
            title: p.title,
            description: `${p.listing_type === 'RENT' ? 'For rent' : 'For sale'} ${p.property_type.toLowerCase()} in ${p.town} from ${this.price()}.`,
            path,
            type: 'article',
            image: this.coverImage(p),
            jsonLd: this.propertyJsonLd(p, path),
          });
          this.relatedApi
            .for(p)
            .pipe(catchError(() => of([])))
            .subscribe((x) => this.related.set(x));
        }
      });
  }
  availability() {
    const p = this.property();
    if (!p) return '';
    if (p.availability_status !== 'AVAILABLE')
      return p.availability_status === 'UNDER_OFFER'
        ? 'Under offer'
        : 'Availability not recently confirmed';
    if (!p.availability_confirmed_at) return 'Available';
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(p.availability_confirmed_at).getTime()) / 86400000),
    );
    return days === 0
      ? 'Availability confirmed today'
      : `Availability confirmed ${days} day${days === 1 ? '' : 's'} ago`;
  }
  toggleFavourite() {
    const p = this.property();
    if (!p) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/properties/${p.slug}` },
      });
      return;
    }
    const before = p.is_favourited;
    this.property.set({ ...p, is_favourited: !before });
    this.saving.set(true);
    const request = before ? this.fav.remove('property', p.id) : this.fav.addProperty(p.id);
    request
      .pipe(
        catchError(() => {
          this.property.update((x) => (x ? { ...x, is_favourited: before } : x));
          this.toast.show('Could not update saved listings.', 'error');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe();
  }
  share() {
    if (!isPlatformBrowser(this.platformId)) return;
    const data = { title: this.property()?.title || 'SurePlace property', url: location.href };
    if (navigator.share) void navigator.share(data);
    else if (navigator.clipboard)
      void navigator.clipboard
        .writeText(data.url)
        .then(() => this.toast.show('Link copied.', 'success'));
  }
  retry() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loading.set(true);
      this.api
        .detail(slug)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (p) => {
            this.property.set(p);
            this.error.set(null);
          },
          error: (e) =>
            this.error.set({
              message: e?.error?.message || 'We could not load this property.',
              requestId: e?.error?.request_id || null,
            }),
        });
    }
  }
  private coverImage(p: PropertyDetail) {
    return p.images.find((image) => image.is_cover)?.image || p.images[0]?.image || null;
  }
  private propertyJsonLd(p: PropertyDetail, path: string) {
    const url = this.seo.absoluteUrl(path);
    const image = this.coverImage(p);
    return [
      {
        '@context': 'https://schema.org',
        '@type': this.schemaType(p.property_type),
        name: p.title,
        description: p.description,
        url,
        image: image ? this.seo.absoluteUrl(image) : undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: p.address || p.suburb,
          addressLocality: p.town,
          addressRegion: p.region,
          addressCountry: 'SZ',
        },
        numberOfRooms: p.bedrooms || undefined,
        floorSize: p.floor_area
          ? { '@type': 'QuantitativeValue', value: p.floor_area, unitText: 'm2' }
          : undefined,
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: p.currency,
          url,
          businessFunction:
            p.listing_type === 'RENT'
              ? 'https://purl.org/goodrelations/v1#LeaseOut'
              : 'https://purl.org/goodrelations/v1#Sell',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: this.seo.absoluteUrl('/') },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Properties',
            item: this.seo.absoluteUrl('/properties'),
          },
          { '@type': 'ListItem', position: 3, name: p.title, item: url },
        ],
      },
    ];
  }
  private schemaType(type: string) {
    if (type === 'APARTMENT' || type === 'FLAT') return 'Apartment';
    if (type === 'HOUSE' || type === 'TOWNHOUSE') return 'House';
    return 'Residence';
  }
}

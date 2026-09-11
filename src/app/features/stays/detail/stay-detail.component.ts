import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { StaysApiService } from '../../../core/api/stays-api.service';
import { FavouritesApiService } from '../../../core/api/favourites-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { StayQueryService } from '../../../core/services/stay-query.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { RoomAvailabilityResult, StayCard, StayDetail } from '../../../core/models/listing.models';
import { StayGalleryComponent } from './stay-gallery.component';
import { RoomCardComponent } from './room-card.component';
import { BookingCriteria, StayBookingComponent } from './stay-booking.component';
import { StayContactComponent } from './stay-contact.component';
import { ListingMapComponent } from '../../../shared/map/listing-map.component';
import { StayCardComponent } from '../../../shared/listing/stay-card.component';
import { FeedbackComponent } from '../../../shared/ui/feedback.component';
import { formatMoney } from '../../../shared/listing/price-format';
@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    StayGalleryComponent,
    RoomCardComponent,
    StayBookingComponent,
    StayContactComponent,
    ListingMapComponent,
    StayCardComponent,
    FeedbackComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './stay-detail.component.html',
  styleUrl: './stay-detail.component.scss',
})
export class StayDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StaysApiService);
  private fav = inject(FavouritesApiService);
  auth = inject(AuthService);
  private query = inject(StayQueryService);
  private seo = inject(SeoService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);
  stay = signal<StayDetail | null>(null);
  related = signal<StayCard[]>([]);
  loading = signal(true);
  notFound = signal(false);
  error = signal<{ message: string; requestId: string | null } | null>(null);
  availability = signal<RoomAvailabilityResult[]>([]);
  availabilityLoading = signal(false);
  availabilityError = signal('');
  selectedRoomId = signal<string | null>(null);
  saving = signal(false);
  expanded = signal(false);
  amenitiesExpanded = signal(false);
  readonly visibleAmenityCount = 8;
  minDate = this.query.today();
  searchForm = this.fb.nonNullable.group({
    check_in: [''],
    check_out: [''],
    adults: [2, [Validators.min(1)]],
    children: [0, [Validators.min(0)]],
    rooms: [1, [Validators.min(1)]],
  });
  criteria = signal<BookingCriteria>({
    check_in: '',
    check_out: '',
    adults: 2,
    children: 0,
    rooms: 1,
  });
  selectedRoom = computed(
    () => this.stay()?.room_types.find((r) => r.id === this.selectedRoomId()) || null,
  );
  selectedAvailability = computed(() => this.availabilityFor(this.selectedRoomId()));
  markers = computed(() => {
    const s = this.stay();
    const latitude = Number(s?.latitude);
    const longitude = Number(s?.longitude);
    return s && Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [{ id: s.id, latitude, longitude, label: 'Stay', title: s.name }]
      : [];
  });
  constructor() {
    const q = this.query.parse(this.route.snapshot.queryParamMap);
    this.searchForm.patchValue({
      check_in: q.check_in || '',
      check_out: q.check_out || '',
      adults: q.adults || 2,
      children: q.children ?? 0,
      rooms: q.rooms || 1,
    });
    this.criteria.set(this.searchForm.getRawValue());
    this.route.paramMap
      .pipe(
        map((p) => p.get('slug') || ''),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
          this.notFound.set(false);
        }),
        switchMap((slug) =>
          this.api.detail(slug).pipe(
            catchError((e) => {
              if (e.status === 404) {
                this.notFound.set(true);
                this.seo.apply({
                  title: 'Stay unavailable',
                  description: 'This stay is no longer available on SurePlace.',
                  path: '/stays',
                  robots: 'noindex, follow',
                  image: null,
                });
              } else
                this.error.set({
                  message: e?.error?.message || 'We could not load this stay.',
                  requestId: e?.error?.request_id || null,
                });
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
      )
      .subscribe((s) => {
        this.stay.set(s);
        if (s) {
          const path = `/stays/${s.slug}`;
          this.seo.apply({
            title: `${s.name} in ${this.locationLabel(s)}`,
            description:
              this.shortDescription(s.description) ||
              `${this.typeLabel(s.stay_type)} accommodation in ${s.town}, ${s.region}.`,
            path,
            type: 'article',
            image: this.coverImage(s),
            jsonLd: this.stayJsonLd(s, path),
          });
          this.loadRelated(s);
          if (this.validCriteria()) this.loadAvailability();
        }
      });
  }
  applyAvailability() {
    const v = this.searchForm.getRawValue(),
      d = this.query.validateDates(v.check_in, v.check_out);
    if (!d.valid) {
      this.availabilityError.set(d.message || 'Choose valid dates.');
      return;
    }
    this.criteria.set(v);
    this.selectedRoomId.set(null);
    this.availability.set([]);
    this.availabilityError.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.query.serialize(v),
      replaceUrl: true,
    });
    if (d.complete) this.loadAvailability();
  }
  loadAvailability() {
    const s = this.stay(),
      c = this.criteria();
    if (!s || !this.query.validateDates(c.check_in, c.check_out).complete) return;
    this.availabilityLoading.set(true);
    this.availabilityError.set('');
    this.api
      .availability(s.slug, c)
      .pipe(finalize(() => this.availabilityLoading.set(false)))
      .subscribe({
        next: (r) => this.availability.set(r.room_types),
        error: (e) =>
          this.availabilityError.set(e?.error?.message || 'Room availability could not be loaded.'),
      });
  }
  availabilityFor(id: string | null): RoomAvailabilityResult | null {
    if (!id || !this.validCriteria()) return null;
    return (
      this.availability().find((a) => a.room_type_id === id) || {
        available: false,
        room_type_id: id,
        rooms_available: 0,
        nightly_prices: [],
        total: '0.00',
      }
    );
  }
  selectRoom(id: string) {
    const a = this.availabilityFor(id);
    if (a && !a.available) return;
    this.selectedRoomId.set(id);
  }
  validCriteria() {
    const c = this.criteria();
    return this.query.validateDates(c.check_in, c.check_out).complete;
  }
  toggleFavourite() {
    const s = this.stay();
    if (!s) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/stays/${s.slug}` } });
      return;
    }
    const before = s.is_favourited;
    this.stay.set({ ...s, is_favourited: !before });
    this.saving.set(true);
    (before ? this.fav.remove('stay', s.id) : this.fav.addStay(s.id))
      .pipe(
        catchError(() => {
          this.stay.update((x) => (x ? { ...x, is_favourited: before } : x));
          this.toast.show('Could not update saved stays.', 'error');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe();
  }
  share() {
    if (!isPlatformBrowser(this.platformId)) return;
    const s = this.stay();
    if (!s) return;
    const url = new URL(`/stays/${s.slug}`, location.origin).href,
      data = { title: s.name, url };
    if (navigator.share) void navigator.share(data);
    else if (navigator.clipboard)
      void navigator.clipboard
        .writeText(url)
        .then(() => this.toast.show('Link copied.', 'success'));
  }
  locationLabel(s: StayDetail) {
    return [s.suburb, s.town, s.region, s.country_code === 'SZ' ? 'Eswatini' : s.country_code]
      .filter(Boolean)
      .join(', ');
  }
  shortDescription(description: string) {
    const trimmed = description.trim();
    return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
  }
  guestCapacityLabel(s: StayDetail) {
    const capacities = s.room_types
      .map((room) => room.total_capacity)
      .filter((capacity) => Number.isFinite(capacity) && capacity > 0);
    if (!capacities.length) return 'Ask the stay';
    const min = Math.min(...capacities);
    const max = Math.max(...capacities);
    return min === max ? `${max} guest${max === 1 ? '' : 's'}` : `${min}-${max} guests`;
  }
  minimumNightlyPrice(s: StayDetail) {
    const room = [...s.room_types]
      .filter((item) => Number(item.base_price) > 0)
      .sort((a, b) => Number(a.base_price) - Number(b.base_price))[0];
    return room ? formatMoney(room.base_price, room.currency) : null;
  }
  visibleAmenities(s: StayDetail) {
    return this.amenitiesExpanded() ? s.amenities : s.amenities.slice(0, this.visibleAmenityCount);
  }
  amenityIcon(value: string) {
    const normalized = value.toLowerCase();
    if (/wifi|internet/.test(normalized)) return 'fa-solid fa-wifi';
    if (/park|garage/.test(normalized)) return 'fa-solid fa-square-parking';
    if (/pool|swim/.test(normalized)) return 'fa-solid fa-water-ladder';
    if (/kitchen|cook/.test(normalized)) return 'fa-solid fa-kitchen-set';
    if (/air|ac|conditioning/.test(normalized)) return 'fa-solid fa-snowflake';
    if (/breakfast|food|restaurant/.test(normalized)) return 'fa-solid fa-utensils';
    if (/garden|outdoor/.test(normalized)) return 'fa-solid fa-seedling';
    if (/security|safe/.test(normalized)) return 'fa-solid fa-shield-halved';
    if (/work|desk/.test(normalized)) return 'fa-solid fa-briefcase';
    if (/braai|bbq|barbecue/.test(normalized)) return 'fa-solid fa-fire-burner';
    return 'fa-solid fa-circle-check';
  }
  typeLabel(v: string) {
    return v
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (x) => x.toUpperCase());
  }
  time(v: string | null) {
    if (!v) return 'Not specified';
    const [h, m] = v.split(':').map(Number),
      suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
  private loadRelated(s: StayDetail) {
    this.api
      .search({ town: s.town, stay_type: s.stay_type })
      .pipe(catchError(() => of({ count: 0, next: null, previous: null, results: [] })))
      .subscribe((p) => this.related.set(p.results.filter((x) => x.id !== s.id).slice(0, 4)));
  }
  retry() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;
    this.loading.set(true);
    this.api
      .detail(slug)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (x) => {
          this.stay.set(x);
          this.error.set(null);
        },
        error: (e) =>
          this.error.set({
            message: e?.error?.message || 'We could not load this stay.',
            requestId: e?.error?.request_id || null,
          }),
      });
  }
  private coverImage(s: StayDetail) {
    return s.images.find((image) => image.is_cover)?.image || s.images[0]?.image || null;
  }
  private stayJsonLd(s: StayDetail, path: string) {
    const url = this.seo.absoluteUrl(path);
    const image = this.coverImage(s);
    const startingPrice = s.room_types
      .map((room) => Number(room.base_price))
      .filter((price) => Number.isFinite(price) && price > 0)
      .sort((a, b) => a - b)[0];
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'LodgingBusiness',
        name: s.name,
        description: s.description,
        url,
        image: image ? this.seo.absoluteUrl(image) : undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: s.address || s.suburb,
          addressLocality: s.town,
          addressRegion: s.region,
          addressCountry: s.country_code || 'SZ',
        },
        telephone: s.phone || s.whatsapp_number,
        checkinTime: s.check_in_time || undefined,
        checkoutTime: s.check_out_time || undefined,
        priceRange: startingPrice ? `From ${startingPrice.toLocaleString('en-SZ')} SZL` : undefined,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: this.seo.absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Stays', item: this.seo.absoluteUrl('/stays') },
          { '@type': 'ListItem', position: 3, name: s.name, item: url },
        ],
      },
    ];
  }
}

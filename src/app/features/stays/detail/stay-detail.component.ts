import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { register } from 'swiper/element/bundle';
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
import { VerificationBadgeComponent } from '../../../shared/ui/verification-badge.component';
import { ListingMapComponent } from '../../../shared/map/listing-map.component';
import { StayCardComponent } from '../../../shared/listing/stay-card.component';
import { FeedbackComponent } from '../../../shared/ui/feedback.component';
register();

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    StayGalleryComponent,
    RoomCardComponent,
    StayBookingComponent,
    StayContactComponent,
    VerificationBadgeComponent,
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
    return s && Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
      ? [{ id: s.id, latitude: s.latitude!, longitude: s.longitude!, label: 'Stay', title: s.name }]
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
              if (e.status === 404) this.notFound.set(true);
              else
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
          this.seo.canonical(`/stays/${s.slug}`);
          this.seo.set(
            `${s.name} in ${s.town}`,
            `${this.typeLabel(s.stay_type)} accommodation in ${s.town}, ${s.region}${s.verification_status === 'VERIFIED' ? ' · Verified Stay' : ''}.`,
          );
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
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
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
    const s = this.stay();
    if (!s) return;
    const url = new URL(`/stays/${s.slug}`, location.origin).href,
      data = { title: s.name, url };
    if (navigator.share) void navigator.share(data);
    else
      void navigator.clipboard
        .writeText(url)
        .then(() => this.toast.show('Link copied.', 'success'));
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
}

import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, finalize, map, of, switchMap, tap } from 'rxjs';
import { StaysApiService } from '../../core/api/stays-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ConfigApiService } from '../../core/api/config-api.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { StayCard } from '../../core/models/listing.models';
import { StaySearchParams } from '../../core/models/stay-search.models';
import { StayQueryService } from '../../core/services/stay-query.service';
import { SeoService } from '../../core/services/seo.service';
import { StayCardComponent } from '../../shared/listing/stay-card.component';
import { ListingMapComponent } from '../../shared/map/listing-map.component';
import { MapMarker, MapViewportBounds } from '../../shared/map/map.models';
import { FeedbackComponent } from '../../shared/ui/feedback.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { formatMoney } from '../../shared/listing/price-format';
import { SaveSearchButtonComponent } from '../account/save-search-button.component';
import { SavedSearchCriteria } from '../../core/models/account.models';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    StayCardComponent,
    ListingMapComponent,
    FeedbackComponent,
    IconComponent,
    SmartImageComponent,
    SaveSearchButtonComponent,
  ],
  templateUrl: './stay-search.component.html',
})
export class StaySearchComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StaysApiService);
  private query = inject(StayQueryService);
  private seo = inject(SeoService);
  references = inject(ReferenceApiService);
  config = inject(ConfigApiService);
  state = signal<StaySearchParams>({ ordering: 'newest', view: 'list', page: 1 });
  results = signal<StayCard[]>([]);
  count = signal(0);
  next = signal<string | null>(null);
  previous = signal<string | null>(null);
  loading = signal(true);
  error = signal<{ message: string; requestId: string | null } | null>(null);
  filtersOpen = signal(false);
  guestsOpen = signal(false);
  selectedId = signal<string | null>(null);
  dateError = signal<string | null>(null);
  pageSize = 20;
  form = this.fb.nonNullable.group({
    destination: [''],
    region: [''],
    town: [''],
    suburb: [''],
    stay_type: [''],
    check_in: [''],
    check_out: [''],
    adults: [2, [Validators.min(1)]],
    children: [0, [Validators.min(0)]],
    rooms: [1, [Validators.min(1)]],
    min_price: ['', [Validators.min(0)]],
    max_price: ['', [Validators.min(0)]],
    amenities: [[] as string[]],
    featured: [false],
    verified: [false],
    search: [''],
    ordering: ['newest'],
  });
  heading = computed(() => {
    const s = this.state(),
      type = this.typeLabel(s.stay_type),
      place = s.town || s.suburb || s.region;
    if (type && place) return `${type} in ${place}`;
    if (place) return `Places to Stay in ${place}`;
    if (type) return `${type} in Eswatini`;
    return 'Stays across Eswatini';
  });
  availabilityActive = computed(
    () => this.query.validateDates(this.state().check_in, this.state().check_out).complete,
  );
  markers = computed<MapMarker[]>(() =>
    this.results()
      .filter((x) => Number.isFinite(x.latitude) && Number.isFinite(x.longitude))
      .map((x) => ({
        id: x.id,
        latitude: x.latitude!,
        longitude: x.longitude!,
        label: formatMoney(x.minimum_nightly_price) || 'View',
        title: x.name,
      })),
  );
  selected = computed(() => this.results().find((x) => x.id === this.selectedId()) || null);
  pages = computed(() => Math.max(1, Math.ceil(this.count() / this.pageSize)));
  chips = computed(() => this.buildChips(this.state()));
  saveCriteria = computed(() => this.cleanCriteria(this.state()));
  minDate = this.query.today();
  constructor() {
    this.route.queryParamMap
      .pipe(
        map((p) => this.query.parse(p)),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap((s) => {
          this.state.set(s);
          this.patch(s);
          this.loading.set(true);
          this.error.set(null);
          this.setSeo();
        }),
        switchMap((s) =>
          this.api.search(s).pipe(
            catchError((e) => {
              const x = normalizeApiError(e);
              this.error.set({ message: x.message, requestId: x.request_id });
              return of({ count: 0, next: null, previous: null, results: [] });
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
      )
      .subscribe((page) => {
        this.results.set(page.results);
        this.count.set(page.count);
        this.next.set(page.next);
        this.previous.set(page.previous);
      });
  }
  apply() {
    const v = this.form.getRawValue(),
      dates = this.query.validateDates(v.check_in, v.check_out);
    this.dateError.set(dates.message);
    if (!dates.valid) return;
    if (v.max_price !== '' && Number(v.min_price) > Number(v.max_price)) {
      this.form.controls.max_price.setErrors({ range: true });
      return;
    }
    const destination = this.resolveDestination(v.destination);
    void this.navigate({
      stay_type: v.stay_type,
      region: v.region || destination.region,
      town: v.town || destination.town,
      suburb: v.suburb,
      search: v.search,
      check_in: v.check_in || undefined,
      check_out: v.check_out || undefined,
      adults: dates.complete ? v.adults : undefined,
      children: dates.complete ? v.children : undefined,
      rooms: dates.complete ? v.rooms : undefined,
      min_price: v.min_price,
      max_price: v.max_price,
      amenities: v.amenities,
      featured: v.featured,
      verification_status: v.verified ? 'VERIFIED' : undefined,
      ordering: v.ordering as StaySearchParams['ordering'],
      view: this.state().view,
      page: 1,
    });
    this.filtersOpen.set(false);
    this.guestsOpen.set(false);
  }
  changeGuest(key: 'adults' | 'children' | 'rooms', delta: number) {
    const c = this.form.controls[key],
      min = key === 'children' ? 0 : 1;
    c.setValue(Math.max(min, c.value + delta));
  }
  guestValue(key: string) {
    return this.form.controls[key as 'adults' | 'children' | 'rooms'].value;
  }
  guestSummary() {
    const v = this.form.getRawValue(),
      guests = v.adults + v.children;
    return v.children
      ? `${v.adults} adults · ${v.children} children · ${v.rooms} room${v.rooms === 1 ? '' : 's'}`
      : `${guests} guest${guests === 1 ? '' : 's'} · ${v.rooms} room${v.rooms === 1 ? '' : 's'}`;
  }
  checkInChanged() {
    const ci = this.form.controls.check_in.value,
      co = this.form.controls.check_out.value;
    if (ci && co && co <= ci) this.form.controls.check_out.setValue('');
    this.dateError.set(null);
  }
  setView(view: 'list' | 'map') {
    void this.navigate({ ...this.state(), view });
  }
  sort(v: string) {
    this.form.controls.ordering.setValue(v);
    this.apply();
  }
  page(p: number) {
    if (p < 1 || p > this.pages()) return;
    void this.navigate({ ...this.state(), page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  toggleAmenity(id: string, on: boolean) {
    const a = this.form.controls.amenities.value;
    this.form.controls.amenities.setValue(on ? [...a, id] : a.filter((x) => x !== id));
  }
  isAmenity(id: string) {
    return this.form.controls.amenities.value.includes(id);
  }
  remove(key: string) {
    const n = { ...this.state() } as Record<string, unknown>;
    if (key === 'dates')
      for (const k of ['check_in', 'check_out', 'adults', 'children', 'rooms']) delete n[k];
    else if (key === 'guests') for (const k of ['adults', 'children', 'rooms']) delete n[k];
    else if (key === 'price') for (const k of ['min_price', 'max_price']) delete n[k];
    else if (key === 'bounds') for (const k of ['north', 'south', 'east', 'west']) delete n[k];
    else delete n[key];
    n['page'] = 1;
    void this.navigate(n as StaySearchParams);
  }
  clearAll() {
    void this.navigate({ view: this.state().view });
  }
  searchAllAreas() {
    void this.navigate(this.query.withoutBounds({ ...this.state(), page: 1 }));
  }
  applyBounds(b: MapViewportBounds) {
    void this.navigate({ ...this.state(), ...b, page: 1, view: 'map' });
  }
  retry() {
    this.loading.set(true);
    this.api
      .search(this.state())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => {
          this.results.set(p.results);
          this.count.set(p.count);
          this.next.set(p.next);
          this.previous.set(p.previous);
          this.error.set(null);
        },
        error: (e) => {
          const x = normalizeApiError(e);
          this.error.set({ message: x.message, requestId: x.request_id });
        },
      });
  }
  @HostListener('document:keydown.escape') closeOverlays() {
    this.filtersOpen.set(false);
    this.guestsOpen.set(false);
  }
  private navigate(v: StaySearchParams) {
    return this.router.navigate(['/stays'], { queryParams: this.query.serialize(v) });
  }
  private patch(s: StaySearchParams) {
    this.form.patchValue(
      {
        destination: s.suburb || s.town || s.region || '',
        region: s.region || '',
        town: s.town || '',
        suburb: s.suburb || '',
        stay_type: s.stay_type || '',
        check_in: s.check_in || '',
        check_out: s.check_out || '',
        adults: s.adults || 2,
        children: s.children ?? 0,
        rooms: s.rooms || 1,
        min_price: s.min_price || '',
        max_price: s.max_price || '',
        amenities: s.amenities || [],
        featured: !!s.featured,
        verified: s.verification_status === 'VERIFIED',
        search: s.search || '',
        ordering: s.ordering || 'newest',
      },
      { emitEvent: false },
    );
    this.dateError.set(this.query.validateDates(s.check_in, s.check_out).message);
  }
  private resolveDestination(value: string) {
    if (!value) return { region: '', town: '' };
    const region = this.references
      .data()
      .regions.find((r) => r.label.toLowerCase() === value.toLowerCase());
    if (region) return { region: region.label, town: '' };
    const area = this.references
      .data()
      .regions.flatMap((r) => r.areas.map((t) => ({ region: r.label, town: t })))
      .find((x) => x.town.toLowerCase() === value.toLowerCase());
    return area || { region: '', town: value };
  }
  typeLabel(v?: string) {
    return this.references.data().stay_types.find((x) => x.value === v)?.label;
  }
  readonly formatMoney = formatMoney;
  private setSeo() {
    this.seo.set(
      this.heading(),
      `Find trusted accommodation in Eswatini with nightly prices and availability.`,
    );
    this.seo.canonical('/stays');
  }
  private buildChips(s: StaySearchParams) {
    const c: { key: string; label: string }[] = [];
    if (s.town) c.push({ key: 'town', label: s.town });
    else if (s.region) c.push({ key: 'region', label: s.region });
    if (s.suburb) c.push({ key: 'suburb', label: s.suburb });
    if (s.stay_type)
      c.push({ key: 'stay_type', label: this.typeLabel(s.stay_type) || s.stay_type });
    if (s.check_in && s.check_out)
      c.push({
        key: 'dates',
        label: `${this.prettyDate(s.check_in)} – ${this.prettyDate(s.check_out)}`,
      });
    if (s.adults !== undefined)
      c.push({
        key: 'guests',
        label: `${(s.adults || 0) + (s.children || 0)} guests · ${s.rooms || 1} room${s.rooms === 1 ? '' : 's'}`,
      });
    if (s.min_price || s.max_price)
      c.push({
        key: 'price',
        label: `${s.min_price ? 'E' + Number(s.min_price).toLocaleString() : 'Any'}–${s.max_price ? 'E' + Number(s.max_price).toLocaleString() : 'Any'}/night`,
      });
    if (s.verification_status) c.push({ key: 'verification_status', label: 'Verified stays only' });
    if (s.amenities?.length) c.push({ key: 'amenities', label: `${s.amenities.length} amenities` });
    if (s.north) c.push({ key: 'bounds', label: 'Map area' });
    return c;
  }
  private cleanCriteria(s: StaySearchParams): SavedSearchCriteria {
    const out: SavedSearchCriteria = {};
    for (const key of [
      'stay_type',
      'region',
      'town',
      'suburb',
      'min_price',
      'max_price',
      'amenities',
      'adults',
      'children',
      'rooms',
    ] as const) {
      const value = s[key];
      if (value !== undefined && value !== '') out[key] = value;
    }
    return out;
  }
  private prettyDate(v: string) {
    return new Intl.DateTimeFormat('en-SZ', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(v + 'T00:00:00Z'));
  }
}

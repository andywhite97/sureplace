import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, finalize, map, of, switchMap, tap } from 'rxjs';
import { PropertiesApiService } from '../../core/api/properties-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ConfigApiService } from '../../core/api/config-api.service';
import { PropertyQueryService } from '../../core/services/property-query.service';
import { SeoService } from '../../core/services/seo.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { PropertyCard } from '../../core/models/listing.models';
import { MapBounds, PropertySearchParams } from '../../core/models/property-search.models';
import { PropertyCardComponent } from '../../shared/listing/property-card.component';
import { ListingMapComponent } from '../../shared/map/listing-map.component';
import { MapMarker } from '../../shared/map/map.models';
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
    PropertyCardComponent,
    ListingMapComponent,
    FeedbackComponent,
    IconComponent,
    SmartImageComponent,
    SaveSearchButtonComponent,
  ],
  templateUrl: './property-search.component.html',
  styleUrl: './property-search.component.scss',
})
export class PropertySearchComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(PropertiesApiService);
  private query = inject(PropertyQueryService);
  private seo = inject(SeoService);
  references = inject(ReferenceApiService);
  config = inject(ConfigApiService);
  state = signal<PropertySearchParams>({ ordering: 'newest', view: 'list', page: 1 });
  results = signal<PropertyCard[]>([]);
  count = signal(0);
  next = signal<string | null>(null);
  previous = signal<string | null>(null);
  loading = signal(true);
  error = signal<{ message: string; requestId: string | null } | null>(null);
  filtersOpen = signal(false);
  moreOpen = signal(false);
  selectedId = signal<string | null>(null);
  pageSize = 20;
  form = this.fb.nonNullable.group({
    listing_type: ['RENT'],
    property_type: [''],
    region: [''],
    town: [''],
    suburb: [''],
    min_price: ['', [Validators.min(0)]],
    max_price: ['', [Validators.min(0)]],
    min_bedrooms: [''],
    min_bathrooms: [''],
    furnished: [false],
    pet_friendly: [false],
    amenities: [[] as string[]],
    featured: [false],
    verified: [false],
    search: [''],
    ordering: ['newest'],
  });
  heading = computed(() => {
    const s = this.state(),
      type = this.typeLabel(s.property_type),
      mode = s.listing_type === 'SALE' ? 'Sale' : s.listing_type === 'RENT' ? 'Rent' : '';
    return `${type || 'Properties'}${mode ? ' for ' + mode : ''} in ${s.town || s.region || 'Eswatini'}`;
  });
  resultSummary = computed(() => {
    if (this.loading()) return 'Updating results...';
    const total = this.count();
    return `${total} ${total === 1 ? 'property' : 'properties'} - Discover verified properties across Eswatini.`;
  });
  locationLabel = computed(() => {
    const s = this.state();
    return [s.suburb, s.town || s.region || 'Eswatini'].filter(Boolean).join(', ');
  });
  typeFilterLabel = computed(() => {
    const value = this.state().property_type;
    return value ? this.typeLabel(value) || value : 'Type';
  });
  priceFilterLabel = computed(() => {
    const s = this.state();
    if (!s.min_price && !s.max_price) return 'Price';
    const min = s.min_price ? `E${Number(s.min_price).toLocaleString()}` : 'Any';
    const max = s.max_price ? `E${Number(s.max_price).toLocaleString()}` : 'Any';
    return `${min}-${max}`;
  });
  bedsFilterLabel = computed(() =>
    this.state().min_bedrooms ? `${this.state().min_bedrooms}+ Beds` : 'Beds',
  );
  markers = computed<MapMarker[]>(() =>
    this.results()
      .filter((x) => x.latitude !== null && x.longitude !== null)
      .map((x) => ({
        id: x.id,
        latitude: x.latitude!,
        longitude: x.longitude!,
        label: formatMoney(x.price, x.currency) || 'View',
        title: x.title,
      })),
  );
  selected = computed(() => this.results().find((x) => x.id === this.selectedId()) || null);
  markerPrice(property: PropertyCard) {
    return formatMoney(property.price, property.currency);
  }
  chips = computed(() => this.buildChips(this.state()));
  saveCriteria = computed(() => this.cleanCriteria(this.state()));
  pages = computed(() => Math.max(1, Math.ceil(this.count() / this.pageSize)));
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
    const v = this.form.getRawValue();
    if (Number(v.min_price) > Number(v.max_price) && v.max_price !== '') {
      this.form.controls.max_price.setErrors({ range: true });
      return;
    }
    const params: PropertySearchParams = {
      listing_type: v.listing_type as 'RENT' | 'SALE',
      property_type: v.property_type,
      region: v.region,
      town: v.town,
      suburb: v.suburb,
      min_price: v.min_price,
      max_price: v.max_price,
      min_bedrooms: v.min_bedrooms,
      min_bathrooms: v.min_bathrooms,
      furnished: v.furnished,
      pet_friendly: v.pet_friendly,
      amenities: v.amenities,
      featured: v.featured,
      verification_status: v.verified ? 'VERIFIED' : undefined,
      search: v.search,
      ordering: v.ordering as PropertySearchParams['ordering'],
      view: this.state().view,
      page: 1,
    };
    void this.navigate(params);
    this.filtersOpen.set(false);
    this.moreOpen.set(false);
  }
  setMode(mode: 'RENT' | 'SALE') {
    this.form.controls.listing_type.setValue(mode);
    this.apply();
  }
  setView(view: 'list' | 'map') {
    void this.navigate({ ...this.state(), view });
  }
  sort(ordering: string) {
    this.form.controls.ordering.setValue(ordering);
    this.apply();
  }
  page(page: number) {
    if (page < 1 || page > this.pages()) return;
    void this.navigate({ ...this.state(), page });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  remove(key: string) {
    const next = { ...this.state() } as Record<string, unknown>;
    if (key === 'price') {
      delete next['min_price'];
      delete next['max_price'];
    } else if (key === 'bounds') {
      for (const k of ['north', 'south', 'east', 'west']) delete next[k];
    } else delete next[key];
    next['page'] = 1;
    void this.navigate(next as PropertySearchParams);
  }
  clearAll() {
    void this.navigate({ listing_type: this.state().listing_type, view: this.state().view });
  }
  searchAllAreas() {
    void this.navigate(this.query.withoutBounds({ ...this.state(), page: 1 }));
  }
  applyBounds(bounds: MapBounds) {
    void this.navigate({ ...this.state(), ...bounds, page: 1, view: 'map' });
  }
  retry() {
    void this.navigate({ ...this.state() }, { reload: true });
  }
  toggleAmenity(id: string, checked: boolean) {
    const values = this.form.controls.amenities.value;
    this.form.controls.amenities.setValue(
      checked ? [...values, id] : values.filter((x) => x !== id),
    );
  }
  isAmenity(id: string) {
    return this.form.controls.amenities.value.includes(id);
  }
  private navigate(value: PropertySearchParams, extras?: { reload: boolean }) {
    const url = this.router.createUrlTree(['/properties'], {
      queryParams: this.query.serialize(value),
    });
    if (extras?.reload && url.toString() === this.router.url) {
      this.loading.set(true);
      this.api
        .search(value)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (p) => {
            this.results.set(p.results);
            this.count.set(p.count);
            this.error.set(null);
          },
          error: (e) => {
            const x = normalizeApiError(e);
            this.error.set({ message: x.message, requestId: x.request_id });
          },
        });
      return Promise.resolve(true);
    }
    return this.router.navigateByUrl(url);
  }
  private patch(s: PropertySearchParams) {
    this.form.patchValue(
      {
        listing_type: s.listing_type || 'RENT',
        property_type: s.property_type || '',
        region: s.region || '',
        town: s.town || '',
        suburb: s.suburb || '',
        min_price: s.min_price || '',
        max_price: s.max_price || '',
        min_bedrooms: s.min_bedrooms || '',
        min_bathrooms: s.min_bathrooms || '',
        furnished: !!s.furnished,
        pet_friendly: !!s.pet_friendly,
        amenities: s.amenities || [],
        featured: !!s.featured,
        verified: s.verification_status === 'VERIFIED',
        search: s.search || '',
        ordering: s.ordering || 'newest',
      },
      { emitEvent: false },
    );
  }
  private typeLabel(value?: string) {
    return this.references.data().property_types.find((x) => x.value === value)?.label;
  }
  private setSeo() {
    const state = this.state();
    const title = this.heading();
    this.seo.apply({
      title,
      description: `Browse ${title.toLowerCase()} with clear prices, verification and availability signals.`,
      path: this.canonicalPath(state),
      robots: this.shouldIndex(state) ? 'index, follow' : 'noindex, follow',
      jsonLd: this.collectionJsonLd(title, state),
    });
  }
  private shouldIndex(s: PropertySearchParams) {
    return !(
      s.suburb ||
      s.min_price ||
      s.max_price ||
      s.min_bedrooms ||
      s.min_bathrooms ||
      s.furnished ||
      s.pet_friendly ||
      s.amenities?.length ||
      s.featured ||
      s.verification_status ||
      s.search ||
      s.north ||
      s.south ||
      s.east ||
      s.west ||
      s.ordering !== 'newest' ||
      s.view === 'map' ||
      (s.page || 1) > 1
    );
  }
  private canonicalPath(s: PropertySearchParams) {
    const params = new URLSearchParams();
    if (s.listing_type) params.set('listing_type', s.listing_type);
    if (s.property_type) params.set('property_type', s.property_type);
    if (s.region) params.set('region', s.region);
    if (s.town) params.set('town', s.town);
    const query = params.toString();
    return query ? `/properties?${query}` : '/properties';
  }
  private collectionJsonLd(title: string, s: PropertySearchParams) {
    const url = this.seo.absoluteUrl(this.canonicalPath(s));
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description: `Browse ${title.toLowerCase()} on SurePlace.`,
      url,
      isPartOf: { '@type': 'WebSite', name: 'SurePlace', url: this.seo.absoluteUrl('/') },
    };
  }
  private buildChips(s: PropertySearchParams) {
    const chips: { key: string; label: string }[] = [];
    if (s.listing_type)
      chips.push({ key: 'listing_type', label: s.listing_type === 'SALE' ? 'Buy' : 'Rent' });
    if (s.region) chips.push({ key: 'region', label: s.region });
    if (s.town) chips.push({ key: 'town', label: s.town });
    if (s.suburb) chips.push({ key: 'suburb', label: s.suburb });
    if (s.property_type)
      chips.push({
        key: 'property_type',
        label: this.typeLabel(s.property_type) || s.property_type,
      });
    if (s.min_price || s.max_price)
      chips.push({
        key: 'price',
        label: `${s.min_price ? 'E' + Number(s.min_price).toLocaleString() : 'Any'} – ${s.max_price ? 'E' + Number(s.max_price).toLocaleString() : 'Any'}`,
      });
    if (s.min_bedrooms) chips.push({ key: 'min_bedrooms', label: `${s.min_bedrooms}+ Beds` });
    if (s.min_bathrooms) chips.push({ key: 'min_bathrooms', label: `${s.min_bathrooms}+ Baths` });
    if (s.furnished) chips.push({ key: 'furnished', label: 'Furnished' });
    if (s.pet_friendly) chips.push({ key: 'pet_friendly', label: 'Pet friendly' });
    if (s.verification_status) chips.push({ key: 'verification_status', label: 'Verified only' });
    if (s.amenities?.length)
      chips.push({ key: 'amenities', label: `${s.amenities.length} amenities` });
    if (s.north) chips.push({ key: 'bounds', label: 'Map area' });
    return chips;
  }
  private cleanCriteria(s: PropertySearchParams): SavedSearchCriteria {
    const out: SavedSearchCriteria = {};
    for (const key of [
      'listing_type',
      'property_type',
      'region',
      'town',
      'suburb',
      'min_price',
      'max_price',
      'min_bedrooms',
      'min_bathrooms',
      'furnished',
      'pet_friendly',
      'amenities',
      'north',
      'south',
      'east',
      'west',
    ] as const) {
      const value = s[key];
      if (value !== undefined && value !== '' && value !== false) out[key] = value;
    }
    return out;
  }
}

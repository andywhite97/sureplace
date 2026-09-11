import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  QueryList,
  ViewChildren,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, catchError, finalize, of } from 'rxjs';
import { PropertiesApiService } from '../../core/api/properties-api.service';
import { StaysApiService } from '../../core/api/stays-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ConfigApiService } from '../../core/api/config-api.service';
import { SearchParamsService } from '../../core/services/search-params.service';
import { StayQueryService } from '../../core/services/stay-query.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { ReferenceOption } from '../../core/models/api.models';
import { PropertyCard, StayCard } from '../../core/models/listing.models';
import { PropertyCardComponent } from '../../shared/listing/property-card.component';
import { StayCardComponent } from '../../shared/listing/stay-card.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { RevealOnScrollDirective } from '../../shared/ui/reveal-on-scroll.directive';
type Mode = 'RENT' | 'BUY' | 'STAY';
type Destination = {
  name: string;
  alt: string;
  position: string;
};
type PropertyTypeVisual = {
  descriptor: string;
  icon: string;
  position: string;
  alt: string;
};
type PropertyTypeOption = ReferenceOption & { count?: number };
type SwiperElement = HTMLElement & {
  swiper?: { update?: () => void };
  update?: () => void;
};

const DESTINATION_IMAGE = 'destinations-eswatini.jpg';
const PROPERTY_TYPE_IMAGE = 'property-types-sureplace.jpg';
const DESTINATIONS: Destination[] = [
  { name: 'Mbabane', alt: 'Mbabane city lights in a green mountain valley', position: '0% 0%' },
  {
    name: 'Manzini',
    alt: 'Manzini city centre with warm light and surrounding hills',
    position: '50% 0%',
  },
  { name: 'Ezulwini', alt: 'Ezulwini valley with lush hills and homes', position: '100% 0%' },
  {
    name: 'Matsapha',
    alt: 'Matsapha commercial corridor with greenery and mountain views',
    position: '0% 100%',
  },
  {
    name: 'Lobamba',
    alt: 'Lobamba cultural heartland with mountain backdrop',
    position: '50% 100%',
  },
  { name: 'Siteki', alt: 'Siteki highveld hills and town edge', position: '100% 100%' },
];
const DEFAULT_TYPE_VISUAL: PropertyTypeVisual = {
  descriptor: 'Explore more',
  icon: 'fa-solid fa-shapes',
  position: '100% 100%',
  alt: 'A polished real estate setting for additional property options',
};
const PROPERTY_TYPE_VISUALS: Record<string, PropertyTypeVisual> = {
  HOUSE: {
    descriptor: 'Family homes',
    icon: 'fa-solid fa-house',
    position: '0% 0%',
    alt: 'Detached family home with garden and mountain views',
  },
  APARTMENT: {
    descriptor: 'Urban living',
    icon: 'fa-solid fa-building',
    position: '25% 0%',
    alt: 'Modern apartment building with balconies and landscaped grounds',
  },
  TOWNHOUSE: {
    descriptor: 'Modern communities',
    icon: 'fa-solid fa-house-chimney-window',
    position: '50% 0%',
    alt: 'Contemporary row of townhouses in a neat residential community',
  },
  FLAT: {
    descriptor: 'Stylish & convenient',
    icon: 'fa-solid fa-building-user',
    position: '75% 0%',
    alt: 'Compact furnished flat interior with bright natural light',
  },
  LAND: {
    descriptor: 'Plots & land',
    icon: 'fa-solid fa-mountain-sun',
    position: '100% 0%',
    alt: 'Open green development land with distant hills',
  },
  OFFICE: {
    descriptor: 'Workspaces',
    icon: 'fa-solid fa-briefcase',
    position: '0% 100%',
    alt: 'Modern office building with glass frontage and clean landscaping',
  },
  SHOP: {
    descriptor: 'Retail spaces',
    icon: 'fa-solid fa-store',
    position: '25% 100%',
    alt: 'Bright retail storefront with display windows',
  },
  WAREHOUSE: {
    descriptor: 'Storage & logistics',
    icon: 'fa-solid fa-warehouse',
    position: '50% 100%',
    alt: 'Industrial warehouse with loading area and teal roller door',
  },
  COMMERCIAL: {
    descriptor: 'Business opportunities',
    icon: 'fa-solid fa-city',
    position: '75% 100%',
    alt: 'Modern commercial building with parking and glass shopfronts',
  },
  OTHER: DEFAULT_TYPE_VISUAL,
};
@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PropertyCardComponent,
    StayCardComponent,
    IconComponent,
    RevealOnScrollDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private propertiesApi = inject(PropertiesApiService);
  private staysApi = inject(StaysApiService);
  private params = inject(SearchParamsService);
  private stayQuery = inject(StayQueryService);
  private seo = inject(SeoService);
  references = inject(ReferenceApiService);
  config = inject(ConfigApiService);
  auth = inject(AuthService);
  @ViewChildren('homepageSwiper') private homepageSwipers?: QueryList<ElementRef<SwiperElement>>;
  private swiperChanges?: Subscription;
  private swiperFrame: number | null = null;
  private viewReady = false;
  mode = signal<Mode>('RENT');
  properties = signal<PropertyCard[]>([]);
  stays = signal<StayCard[]>([]);
  propertiesLoading = signal(true);
  staysLoading = signal(true);
  propertyFailed = signal(false);
  stayFailed = signal(false);
  guestsOpen = signal(false);
  propertyForm = this.fb.nonNullable.group({ town: [''], property_type: [''], price_range: [''] });
  stayForm = this.fb.nonNullable.group({
    town: [''],
    check_in: [''],
    check_out: [''],
    adults: [2, [Validators.min(1)]],
    children: [0, [Validators.min(0)]],
    rooms: [1, [Validators.min(1)]],
  });
  destinations = DESTINATIONS;
  locations = DESTINATIONS.map((destination) => destination.name);
  destinationImage = DESTINATION_IMAGE;
  destinationImageFailed = signal(false);
  propertyTypeImage = PROPERTY_TYPE_IMAGE;
  propertyTypeImageFailed = signal(false);
  minStayDate = this.stayQuery.today();
  prices = [
    { value: '', label: 'Any price' },
    { value: '0-5000', label: 'Up to E5,000' },
    { value: '5000-10000', label: 'E5,000 – E10,000' },
    { value: '10000-20000', label: 'E10,000 – E20,000' },
    { value: '20000-', label: 'E20,000+' },
  ];
  constructor() {
    this.registerSwiper();
    effect(() => {
      this.properties().length;
      this.stays().length;
      this.references.data().property_types.length;
      this.config.config().features.stays;
      this.scheduleSwiperUpdate();
    });
  }
  ngOnInit() {
    this.seo.apply({
      title: 'SurePlace | Property & Stays in Eswatini',
      description:
        'Find properties for rent and sale, trusted stays, and verified property professionals across Eswatini.',
      path: '/',
      exactTitle: true,
      image: '/hero-eswatini-home.jpg',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'SurePlace',
          url: this.seo.absoluteUrl('/'),
          logo: this.seo.absoluteUrl('/logo_dark.png'),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'SurePlace',
          url: this.seo.absoluteUrl('/'),
          potentialAction: {
            '@type': 'SearchAction',
            target: `${this.seo.absoluteUrl('/properties')}?search={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    });
    this.propertiesApi
      .featured()
      .pipe(
        catchError(() => {
          this.propertyFailed.set(true);
          return of({ count: 0, next: null, previous: null, results: [] });
        }),
        finalize(() => this.propertiesLoading.set(false)),
      )
      .subscribe((r) => {
        this.properties.set([...r.results]);
        this.cdr.markForCheck();
        this.scheduleSwiperUpdate();
      });
    if (this.config.config().features.stays)
      this.staysApi
        .featured()
        .pipe(
          catchError(() => {
            this.stayFailed.set(true);
            return of({ count: 0, next: null, previous: null, results: [] });
          }),
          finalize(() => this.staysLoading.set(false)),
        )
        .subscribe((r) => {
          this.stays.set([...r.results]);
          this.cdr.markForCheck();
          this.scheduleSwiperUpdate();
        });
    else {
      this.staysLoading.set(false);
      this.cdr.markForCheck();
    }
  }
  setMode(mode: Mode) {
    this.mode.set(mode);
    this.guestsOpen.set(false);
  }
  search() {
    if (this.mode() === 'STAY') {
      const dates = this.stayQuery.validateDates(
        this.stayForm.controls.check_in.value,
        this.stayForm.controls.check_out.value,
      );
      if (!dates.valid) this.stayForm.controls.check_out.setErrors({ dateRange: true });
      if (this.stayForm.invalid) {
        this.stayForm.markAllAsTouched();
        return;
      }
      void this.router.navigate(['/stays'], {
        queryParams: this.params.stay(this.stayForm.getRawValue()),
      });
    } else
      void this.router.navigate(['/properties'], {
        queryParams: this.params.property({
          ...this.propertyForm.getRawValue(),
          listing_type: this.mode() === 'BUY' ? 'SALE' : 'RENT',
        }),
      });
  }
  popular(town: string) {
    if (this.mode() === 'STAY') {
      this.stayForm.patchValue({ town });
    } else this.propertyForm.patchValue({ town });
    this.search();
  }
  propertyTypeVisual(value: string) {
    return PROPERTY_TYPE_VISUALS[value] ?? DEFAULT_TYPE_VISUAL;
  }
  propertyTypeBackground(_type: PropertyTypeOption) {
    if (this.propertyTypeImageFailed()) return null;
    return `url("${this.propertyTypeImage}")`;
  }
  propertyTypePosition(type: PropertyTypeOption) {
    return this.propertyTypeVisual(type.value).position;
  }
  propertyTypeDescriptor(type: PropertyTypeOption) {
    return this.propertyTypeVisual(type.value).descriptor;
  }
  propertyTypeIcon(type: PropertyTypeOption) {
    return this.propertyTypeVisual(type.value).icon;
  }
  propertyTypeAlt(type: PropertyTypeOption) {
    return `${type.label}: ${this.propertyTypeVisual(type.value).alt}`;
  }
  propertyTypeLabel(type: PropertyTypeOption) {
    return type.count === 1 ? '1 listing' : `${type.count} listings`;
  }
  hasPropertyTypeCount(type: PropertyTypeOption) {
    return Number.isFinite(type.count);
  }
  propertyTypeQuery(type: PropertyTypeOption) {
    return { property_type: type.value };
  }
  markPropertyTypeImageFailed() {
    this.propertyTypeImageFailed.set(true);
  }
  destinationBackground(_destination: Destination) {
    if (this.destinationImageFailed()) return null;
    return `url("${this.destinationImage}")`;
  }
  destinationPosition(destination: Destination) {
    return destination.position;
  }
  markDestinationImageFailed() {
    this.destinationImageFailed.set(true);
  }
  supply(path: 'property' | 'stay') {
    void this.router.navigate([this.auth.isAuthenticated() ? '/account' : '/register'], {
      queryParams: { intent: path, returnUrl: '/account' },
    });
  }
  ngAfterViewInit() {
    this.viewReady = true;
    this.swiperChanges = this.homepageSwipers?.changes.subscribe(() => this.scheduleSwiperUpdate());
    this.scheduleSwiperUpdate();
  }
  ngOnDestroy() {
    this.swiperChanges?.unsubscribe();
    if (this.swiperFrame !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.swiperFrame);
    }
  }
  guestSummary() {
    const v = this.stayForm.getRawValue();
    return `${v.adults} adult${v.adults === 1 ? '' : 's'} · ${v.children} child${v.children === 1 ? '' : 'ren'} · ${v.rooms} room${v.rooms === 1 ? '' : 's'}`;
  }
  private scheduleSwiperUpdate() {
    if (
      !isPlatformBrowser(this.platformId) ||
      !this.viewReady ||
      this.swiperFrame !== null ||
      typeof requestAnimationFrame === 'undefined'
    ) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.swiperFrame = requestAnimationFrame(() => {
        this.swiperFrame = null;
        this.homepageSwipers?.forEach(({ nativeElement }) => {
          nativeElement.swiper?.update?.();
          nativeElement.update?.();
        });
      });
    });
  }
  private registerSwiper() {
    if (!isPlatformBrowser(this.platformId)) return;
    void import('swiper/element/bundle').then(({ register }) => register());
  }
}

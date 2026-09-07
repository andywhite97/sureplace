import { CUSTOM_ELEMENTS_SCHEMA, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { register } from 'swiper/element/bundle';
import { PropertiesApiService } from '../../core/api/properties-api.service';
import { StaysApiService } from '../../core/api/stays-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ConfigApiService } from '../../core/api/config-api.service';
import { SearchParamsService } from '../../core/services/search-params.service';
import { StayQueryService } from '../../core/services/stay-query.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { PropertyCard, StayCard } from '../../core/models/listing.models';
import { PropertyCardComponent } from '../../shared/listing/property-card.component';
import { StayCardComponent } from '../../shared/listing/stay-card.component';
import { IconComponent } from '../../shared/ui/icon.component';
register();
type Mode = 'RENT' | 'BUY' | 'STAY';
@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PropertyCardComponent,
    StayCardComponent,
    IconComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private propertiesApi = inject(PropertiesApiService);
  private staysApi = inject(StaysApiService);
  private params = inject(SearchParamsService);
  private stayQuery = inject(StayQueryService);
  private seo = inject(SeoService);
  references = inject(ReferenceApiService);
  config = inject(ConfigApiService);
  auth = inject(AuthService);
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
  locations = ['Mbabane', 'Manzini', 'Ezulwini', 'Matsapha', 'Lobamba', 'Siteki'];
  minStayDate = this.stayQuery.today();
  prices = [
    { value: '', label: 'Any price' },
    { value: '0-5000', label: 'Up to E5,000' },
    { value: '5000-10000', label: 'E5,000 – E10,000' },
    { value: '10000-20000', label: 'E10,000 – E20,000' },
    { value: '20000-', label: 'E20,000+' },
  ];
  ngOnInit() {
    this.seo.setExact(
      'SurePlace | Property & Stays in Eswatini',
      'Find properties for rent and sale, trusted stays, and verified property professionals across Eswatini.',
    );
    this.propertiesApi
      .featured()
      .pipe(
        catchError(() => {
          this.propertyFailed.set(true);
          return of({ count: 0, next: null, previous: null, results: [] });
        }),
        finalize(() => this.propertiesLoading.set(false)),
      )
      .subscribe((r) => this.properties.set(r.results));
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
        .subscribe((r) => this.stays.set(r.results));
    else this.staysLoading.set(false);
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
  browseType(value: string) {
    void this.router.navigate(['/properties'], { queryParams: { property_type: value } });
  }
  supply(path: 'property' | 'stay') {
    void this.router.navigate([this.auth.isAuthenticated() ? '/account' : '/register'], {
      queryParams: { intent: path, returnUrl: '/account' },
    });
  }
  guestSummary() {
    const v = this.stayForm.getRawValue();
    return `${v.adults} adult${v.adults === 1 ? '' : 's'} · ${v.children} child${v.children === 1 ? '' : 'ren'} · ${v.rooms} room${v.rooms === 1 ? '' : 's'}`;
  }
}

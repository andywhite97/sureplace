import { Component, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { PropertyCard } from '../../core/models/listing.models';
import { AuthService } from '../../core/auth/auth.service';
import { FavouritesApiService } from '../../core/api/favourites-api.service';
import { ToastService } from '../../core/services/toast.service';
import { SmartImageComponent } from '../ui/smart-image.component';
import { VerificationBadgeComponent } from '../ui/verification-badge.component';
import { AvailabilityStatusComponent } from '../ui/availability-status.component';
import { IconComponent } from '../ui/icon.component';
import { formatMoney } from './price-format';
@Component({
  selector: 'sp-property-card',
  standalone: true,
  imports: [
    RouterLink,
    SmartImageComponent,
    VerificationBadgeComponent,
    AvailabilityStatusComponent,
    IconComponent,
  ],
  template: `<article>
    <div class="visual">
      <a [routerLink]="['/properties', item().slug]" [attr.aria-label]="'View ' + item().title"
        ><sp-image [src]="item().cover_image" [alt]="item().title" /></a
      ><span class="type">{{ item().listing_type === 'RENT' ? 'For rent' : 'For sale' }}</span
      ><button
        type="button"
        class="fav"
        [class.active]="favourited()"
        [disabled]="saving()"
        (click)="toggleFavourite()"
        [attr.aria-label]="favourited() ? 'Remove from saved listings' : 'Save listing'"
      >
        <sp-icon name="heart" />
      </button>
    </div>
    <div class="body">
      <p class="price">
        {{ price() }}
        <small>
          @if (item().listing_type === 'RENT') {
            / month
          }
        </small>
      </p>
      <h3>
        <a [routerLink]="['/properties', item().slug]">{{ item().title }}</a>
      </h3>
      <p class="location"><sp-icon name="pin" />{{ location() }}</p>
      <div class="specs">
        @if (item().bedrooms !== null) {
          <span><sp-icon name="bed" />{{ item().bedrooms }} beds</span>
        }
        @if (item().bathrooms !== null) {
          <span><sp-icon name="bath" />{{ item().bathrooms }} baths</span>
        }
        @if (item().parking_spaces !== null) {
          <span><sp-icon name="car" />{{ item().parking_spaces }} parking</span>
        }
      </div>
      @if (item().verification_badges[0]; as badge) {
        <sp-verification-badge [label]="badge.label" />
      }
      <sp-availability-status [status]="item().availability_status" [label]="availabilityLabel()" />
    </div>
  </article>`,
  styleUrl: './listing-card.scss',
})
export class PropertyCardComponent implements OnInit {
  item = input.required<PropertyCard>();
  private auth = inject(AuthService);
  private fav = inject(FavouritesApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  favourited = signal(false);
  saving = signal(false);
  ngOnInit() {
    this.favourited.set(this.item().is_favourited);
  }
  price() {
    return formatMoney(this.item().price, this.item().currency);
  }
  location() {
    return [this.item().suburb, this.item().town].filter(Boolean).join(', ');
  }
  availabilityLabel() {
    if (this.item().availability_status !== 'AVAILABLE')
      return this.item().availability_status === 'UNDER_OFFER'
        ? 'Under offer'
        : 'Availability not confirmed';
    const stamp = this.item().availability_confirmed_at;
    if (!stamp) return 'Available';
    const days = Math.max(0, Math.floor((Date.now() - new Date(stamp).getTime()) / 86400000));
    return days === 0
      ? 'Availability confirmed today'
      : `Availability confirmed ${days} day${days === 1 ? '' : 's'} ago`;
  }
  toggleFavourite() {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/properties/${this.item().slug}` },
      });
      return;
    }
    const before = this.favourited();
    this.favourited.set(!before);
    this.saving.set(true);
    const action = before
      ? this.fav.remove('property', this.item().id)
      : this.fav.addProperty(this.item().id);
    action
      .pipe(
        catchError(() => {
          this.favourited.set(before);
          this.toast.show('Could not update saved listings.', 'error');
          return of(undefined);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe();
  }
}

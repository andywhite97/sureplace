import {
  Component,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import {
  BookingSummary,
  RoomAvailabilityResult,
  RoomTypeSummary,
  StayDetail,
} from '../../../core/models/listing.models';
import { StaysApiService } from '../../../core/api/stays-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { formatMoney } from '../../../shared/listing/price-format';

export interface BookingCriteria {
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  rooms: number;
}

@Component({
  selector: 'sp-stay-booking',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<aside class="booking">
    @if (success(); as booking) {
      <div class="success" role="status">
        <p>Booking request sent</p>
        <h2>{{ booking.reference }}</h2>
        <p>{{ booking.stay_name }} &middot; {{ booking.room_name }}</p>
        <p>{{ booking.check_in }} - {{ booking.check_out }}</p>
        <strong>{{ money(booking.total, booking.currency) }}</strong>
        <p>Status: {{ booking.status }}</p>
        <a routerLink="/account/bookings">View booking</a>
        @if (booking.conversation) {
          <a routerLink="/account/messages" [queryParams]="{ conversation: booking.conversation }"
            >Message host</a
          >
        }
        <button type="button" (click)="newAttempt()">Back to stay</button
        ><a routerLink="/stays">Browse more stays</a>
      </div>
    } @else {
      <p class="eyebrow">From</p>
      <h2>{{ room() ? money(room()!.base_price, room()!.currency) : startingPrice() }}</h2>
      <p class="per-night">per night</p>
      @if (room(); as room) {
        <div class="summary">
          <p>
            <span>Room</span><strong>{{ room.name }}</strong>
          </p>
          <p>
            <span>Dates</span
            ><strong>{{ criteria().check_in }} - {{ criteria().check_out }}</strong>
          </p>
          <p>
            <span>Guests</span
            ><strong
              >{{ criteria().adults + criteria().children }} &middot; {{ criteria().rooms }} room{{
                criteria().rooms === 1 ? '' : 's'
              }}</strong
            >
          </p>
          @if (availability(); as a) {
            <p>
              <span>{{ nights() }} night{{ nights() === 1 ? '' : 's' }}</span
              ><strong>{{ money(a.total, room.currency) }}</strong>
            </p>
            <details>
              <summary>Nightly pricing</summary>
              @for (day of a.nightly_prices; track day.date) {
                <p>
                  <span>{{ day.date }}</span
                  ><span>{{ money(day.price, room.currency) }}</span>
                </p>
              }
            </details>
            <p class="total">
              <span>Total</span><strong>{{ money(a.total, room.currency) }}</strong>
            </p>
          }
        </div>
      } @else {
        <p class="empty">Select an available room to continue.</p>
      }
      @if (browserReady() && auth.isAuthenticated() && room() && availability()?.available) {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Guest name<input formControlName="guest_name" autocomplete="name" /></label
          ><label
            >Email<input type="email" formControlName="guest_email" autocomplete="email" /></label
          ><label>Phone<input formControlName="guest_phone" autocomplete="tel" /></label
          ><label
            >Special requests<textarea rows="3" formControlName="special_requests"></textarea>
          </label>
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <button class="primary" type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Sending...' : 'Request Booking' }}
          </button>
        </form>
      } @else {
        <button
          class="primary"
          type="button"
          [disabled]="!room() || !availability()?.available"
          (click)="requestBooking()"
        >
          Request Booking
        </button>
      }
      <small>No payment is taken on SurePlace at this stage.</small>
    }
  </aside>`,
  styles: [
    `
      :host {
        display: block;
      }
      .booking {
        display: grid;
        gap: 0.85rem;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 1.2rem;
        padding: 1.25rem;
        box-shadow: 0 22px 54px rgba(21, 43, 42, 0.12);
      }
      .eyebrow {
        color: var(--teal);
        font-size: 0.72rem;
        text-transform: uppercase;
        font-weight: 900;
      }
      h2,
      p {
        margin: 0;
      }
      h2 {
        color: var(--midnight);
        font-size: 1.75rem;
      }
      .per-night,
      .empty {
        color: var(--slate);
      }
      .summary {
        display: grid;
        gap: 0.62rem;
        padding-block: 0.7rem;
        border-block: 1px solid var(--line);
      }
      .summary p {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }
      .summary span,
      .summary small,
      aside > small {
        color: var(--slate);
      }
      .total {
        font-size: 1.12rem;
      }
      details p {
        font-size: 0.85rem;
        padding: 0.2rem 0;
      }
      form,
      label,
      .success {
        display: grid;
        gap: 0.55rem;
      }
      input,
      textarea {
        padding: 0.68rem;
        border: 1px solid var(--line);
        border-radius: 0.7rem;
        font: inherit;
      }
      .primary,
      .success a,
      .success button {
        border: 0;
        border-radius: 999px;
        background: var(--teal);
        color: #fff;
        padding: 0.82rem;
        text-align: center;
        text-decoration: none;
        font-weight: 900;
      }
      .primary:disabled {
        opacity: 0.45;
      }
      .error {
        color: #a33;
      }
      .success a:nth-of-type(n + 2),
      .success button {
        background: #fff;
        color: var(--midnight);
        border: 1px solid var(--line);
      }
    `,
  ],
})
export class StayBookingComponent {
  stay = input.required<StayDetail>();
  room = input<RoomTypeSummary | null>(null);
  availability = input<RoomAvailabilityResult | null>(null);
  criteria = input.required<BookingCriteria>();
  auth = inject(AuthService);
  private api = inject(StaysApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  submitting = signal(false);
  error = signal('');
  success = signal<BookingSummary | null>(null);
  browserReady = signal(false);
  private idempotencyKey: string | null = null;
  inventoryConflict = output<void>();
  form = this.fb.nonNullable.group({
    guest_name: ['', Validators.required],
    guest_email: ['', [Validators.required, Validators.email]],
    guest_phone: [''],
    special_requests: [''],
  });

  constructor() {
    afterNextRender(() => this.browserReady.set(true));
    effect(() => {
      if (!this.browserReady()) return;
      const user = this.auth.user();
      if (!user) return;

      this.form.patchValue(
        {
          guest_name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          guest_email: user.email,
          guest_phone: user.phone_number,
        },
        { emitEvent: false },
      );
    });
  }

  nights = computed(() => {
    const criteria = this.criteria();
    return criteria.check_in && criteria.check_out
      ? Math.max(
          0,
          (Date.parse(criteria.check_out + 'T00:00:00Z') -
            Date.parse(criteria.check_in + 'T00:00:00Z')) /
            86400000,
        )
      : 0;
  });

  money(value: string, currency = 'SZL') {
    return formatMoney(value, currency);
  }

  startingPrice() {
    const room = [...this.stay().room_types]
      .filter((item) => Number(item.base_price) > 0)
      .sort((a, b) => Number(a.base_price) - Number(b.base_price))[0];
    return room ? formatMoney(room.base_price, room.currency) : 'Select a room';
  }

  requestBooking() {
    if (this.auth.isAuthenticated()) return;
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl() } });
  }

  submit() {
    const room = this.room();
    const availability = this.availability();
    if (!room || !availability?.available || this.form.invalid || this.submitting()) return;
    if (!this.idempotencyKey)
      this.idempotencyKey =
        globalThis.crypto?.randomUUID?.() || `booking-${Date.now()}-${Math.random()}`;
    this.submitting.set(true);
    this.error.set('');
    this.api
      .createBooking(
        this.stay().id,
        { room_type: room.id, ...this.criteria(), ...this.form.getRawValue() },
        this.idempotencyKey,
      )
      .pipe(
        catchError((error) => {
          const message =
            error?.error?.message || error?.error?.errors?.non_field_errors?.[0] || '';
          const conflict = /inventory|available|expired/i.test(message);
          if (conflict) this.inventoryConflict.emit();
          this.error.set(
            conflict
              ? 'That room is no longer available for all selected dates. Please adjust your dates or choose another room.'
              : message || 'Please check your booking details and try again.',
          );
          return of(null);
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe((result) => {
        if (result) this.success.set(result);
      });
  }

  newAttempt() {
    this.success.set(null);
    this.idempotencyKey = null;
  }

  private returnUrl() {
    const criteria = this.criteria();
    const query = new URLSearchParams(
      Object.entries(criteria).map(([key, value]) => [key, String(value)]),
    );
    return `/stays/${this.stay().slug}?${query}`;
  }
}

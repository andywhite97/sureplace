import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  RoomAvailabilityResult,
  RoomTypeSummary,
  StayDetail,
} from '../../../core/models/listing.models';
import { BookingCheckoutStateService } from '../../../core/services/booking-checkout-state.service';
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
  imports: [DatePipe, ReactiveFormsModule],
  template: `<aside class="booking">
    <p class="eyebrow">Your next stay</p>
    <h2>
      {{ room() ? money(room()!.base_price, room()!.currency) : startingPrice() }}
      <small>/ night</small>
    </h2>
    <form [formGroup]="dates" (ngSubmit)="availabilityRequested.emit(dates.getRawValue())">
      <div class="pair">
        <label>Check-in<input type="date" formControlName="check_in" /></label
        ><label>Check-out<input type="date" formControlName="check_out" /></label>
      </div>
      <div class="pair">
        <label>Adults<input type="number" min="1" formControlName="adults" /></label
        ><label>Children<input type="number" min="0" formControlName="children" /></label>
      </div>
      <label>Rooms<input type="number" min="1" formControlName="rooms" /></label
      ><button type="submit" class="availability-action">
        {{ availability() ? 'Choose a room / change dates' : 'Check availability' }}
      </button>
    </form>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (room(); as r) {
      @if (availability(); as a) {
        @if (a.available) {
          <section class="summary">
            <h3>Booking summary</h3>
            <strong>{{ r.name }} × {{ criteria().rooms }}</strong>
            <p>
              {{ criteria().check_in | date: 'd MMM' }} –
              {{ criteria().check_out | date: 'd MMM y' }}
            </p>
            <p>{{ nights() }} nights · {{ criteria().adults + criteria().children }} guests</p>
            <div>
              <span>Room total</span><strong>{{ money(a.total, r.currency) }}</strong>
            </div>
            <div class="total">
              <span>Total</span><strong>{{ money(a.total, r.currency) }}</strong>
            </div>
          </section>
          <button type="button" class="continue-action" (click)="continueBooking()">
            Continue
          </button>
        }
      }
    }
    <small>Pay at property · No online payment required</small>
  </aside>`,
  styles: [
    `
      .booking {
        display: grid;
        gap: 16px;
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 12px 30px #183e3510;
      }
      h2,
      h3,
      p {
        margin: 0;
      }
      h2 {
        font-size: 25px;
      }
      h2 small {
        font-size: 13px;
        font-weight: 400;
      }
      small {
        color: var(--slate);
        line-height: 1.6;
      }
      .eyebrow {
        color: var(--teal);
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 800;
      }
      form {
        display: grid;
        gap: 12px;
      }
      .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 12px;
        color: var(--slate);
      }
      input {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        padding: 10px;
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--midnight);
        min-height: 44px;
      }
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin: 0;
        box-sizing: border-box;
        padding: 12px;
        border-radius: 8px;
        min-height: 44px;
        font-weight: 750;
        cursor: pointer;
      }
      .continue-action {
        background: var(--teal);
        color: #fff;
        border: 0;
      }
      .availability-action {
        color: var(--teal);
        border: 1px solid var(--teal);
        background: #fff;
      }
      .summary {
        display: grid;
        gap: 12px;
      }
      .summary div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .total {
        border-top: 1px solid var(--line);
        padding-top: 14px;
        font-size: 20px;
      }
      @media (max-width: 767px) {
        .booking {
          padding: 18px;
        }
      }
    `,
  ],
})
export class StayBookingComponent {
  error = input('');
  stay = input.required<StayDetail>();
  room = input<RoomTypeSummary | null>(null);
  availability = input<RoomAvailabilityResult | null>(null);
  criteria = input.required<BookingCriteria>();
  availabilityRequested = output<BookingCriteria>();
  private router = inject(Router);
  private intent = inject(BookingCheckoutStateService);
  private fb = inject(FormBuilder);
  dates = this.fb.nonNullable.group({
    check_in: [''],
    check_out: [''],
    adults: [2],
    children: [0],
    rooms: [1],
  });
  constructor() {
    effect(() => this.dates.patchValue(this.criteria(), { emitEvent: false }));
  }
  nights = computed(() =>
    Math.max(
      0,
      (Date.parse(this.criteria().check_out) - Date.parse(this.criteria().check_in)) / 86400000,
    ),
  );
  readonly money = formatMoney;
  startingPrice() {
    const r = [...this.stay().room_types].sort(
      (a, b) => Number(a.base_price) - Number(b.base_price),
    )[0];
    return r ? `From ${formatMoney(r.base_price, r.currency)}` : 'Choose a room';
  }
  continueBooking() {
    const room = this.room();
    if (!room || !this.availability()?.available) return;
    this.intent.restore();
    this.intent.select(
      {
        stay_id: this.stay().id,
        stay_slug: this.stay().slug,
        room_type: room.id,
        ...this.criteria(),
      },
      !!this.intent.state()?.booking_id,
    );
    void this.router.navigateByUrl(this.intent.url());
  }
}

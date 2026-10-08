import { DatePipe } from '@angular/common';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { StaysApiService } from '../../core/api/stays-api.service';
import { BookingsApiService } from '../../core/api/account-api.services';
import { AuthService } from '../../core/auth/auth.service';
import {
  BookingSummary,
  RoomAvailabilityResult,
  StayDetail,
} from '../../core/models/listing.models';
import { BookingCheckoutStateService } from '../../core/services/booking-checkout-state.service';
import { StayQueryService } from '../../core/services/stay-query.service';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { EswatiniPhoneInputComponent } from '../../shared/ui/eswatini-phone-input.component';
import { BookingPoliciesComponent } from './booking-policies.component';

@Component({
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    SmartImageComponent,
    EswatiniPhoneInputComponent,
    BookingPoliciesComponent,
  ],
  templateUrl: './booking-checkout.component.html',
  styleUrl: './booking-ui.scss',
})
export class BookingCheckoutComponent {
  auth = inject(AuthService);
  intent = inject(BookingCheckoutStateService);
  private api = inject(StaysApiService);
  private bookings = inject(BookingsApiService);
  private route = inject(ActivatedRoute);
  private query = inject(StayQueryService);
  private fb = inject(FormBuilder);
  stay = signal<StayDetail | null>(null);
  quote = this.intent.pricing;
  success = signal<BookingSummary | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  reviewing = signal(false);
  changedPrice = signal<{
    old: string;
    new: string;
    nightly_prices: RoomAvailabilityResult['nightly_prices'];
  } | null>(null);
  form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(99)]],
    phone: [''],
    adults: [2, [Validators.min(1), Validators.max(32767)]],
    children: [0, [Validators.min(0), Validators.max(32767)]],
    special_requests: ['', Validators.maxLength(1000)],
    accepted: [false, Validators.requiredTrue],
  });
  room = computed(
    () => this.stay()?.room_types.find((r) => r.id === this.intent.state()?.room_type) || null,
  );
  instant = computed(() => this.stay()?.booking_mode === 'INSTANT_BOOK');
  nights = computed(() => {
    const s = this.intent.state();
    return s ? (Date.parse(s.check_out) - Date.parse(s.check_in)) / 86400000 : 0;
  });
  policy = computed(() => ({
    cancellation_policy: this.stay()?.cancellation_policy,
    house_rules: this.stay()?.house_rules,
    check_in_time: this.stay()?.check_in_time,
    check_out_time: this.stay()?.check_out_time,
    minimum_stay: this.quote()?.minimum_stay || this.room()?.minimum_stay,
  }));
  readonly money = formatMoney;
  holdActive(b: BookingSummary) {
    return b.status === 'PENDING' && (!b.expires_at || Date.parse(b.expires_at) > Date.now());
  }
  receiptTitle(b: BookingSummary) {
    if (b.status === 'CONFIRMED') return 'Booking confirmed!';
    if (b.status === 'PENDING')
      return this.holdActive(b) ? 'Booking request sent' : 'Booking hold expired';
    return (
      (
        {
          EXPIRED: 'Booking request expired',
          CANCELLED: 'Booking cancelled',
          DECLINED: 'Booking request declined',
        } as Record<string, string>
      )[b.status] || 'Your booking'
    );
  }
  constructor() {
    afterNextRender(() => this.load());
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.intent.restore();
    forkJoin({
      stay: this.api.detail(this.route.snapshot.paramMap.get('slug') || ''),
      user: this.auth.initialize(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ stay, user }) => {
          this.stay.set(stay);
          const q = this.route.snapshot.queryParamMap,
            saved = this.intent.state();
          const criteria = this.query.parse(q);
          const source = q.has('room')
            ? {
                stay_id: stay.id,
                stay_slug: stay.slug,
                room_type: q.get('room') || '',
                check_in: criteria.check_in || '',
                check_out: criteria.check_out || '',
                adults: criteria.adults || 2,
                children: criteria.children || 0,
                rooms: criteria.rooms || 1,
              }
            : saved?.stay_id === stay.id
              ? saved
              : null;
          if (
            !source ||
            !this.query.validateDates(source.check_in, source.check_out).complete ||
            !stay.room_types.some((r) => r.id === source.room_type)
          ) {
            this.error.set('Choose your dates and a room to begin booking.');
            return;
          }
          const state = this.intent.select(source);
          this.form.patchValue({
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            phone: user?.phone_number || '',
            adults: state.adults,
            children: state.children,
          });
          if (state.booking_id && user) {
            this.bookings.detail(state.booking_id).subscribe({
              next: (b) => this.success.set(b),
              error: () => {
                this.error.set(
                  'Your previous booking could not be loaded. Check My bookings before submitting again.',
                );
              },
            });
            return;
          }
          if (user) {
            this.bookings.byIntent(state.idempotency_key).subscribe({
              next: (page) => {
                const existing = page.results[0];
                if (existing) {
                  this.success.set(existing);
                  this.intent.completed(existing.id);
                } else this.refresh();
              },
              error: () =>
                this.error.set(
                  'We could not check your previous booking attempt. Check My bookings before submitting again.',
                ),
            });
          } else this.refresh();
        },
        error: (e: HttpErrorResponse) =>
          this.error.set(e.error?.message || 'We could not load this booking. Try again.'),
      });
  }
  countsChanged() {
    this.quote.set(null);
    this.reviewing.set(false);
    this.form.controls.accepted.setValue(false);
  }
  refresh() {
    const state = this.intent.state();
    if (!state || this.busy()) return;
    const v = this.form.getRawValue();
    if (
      !Number.isInteger(v.adults) ||
      v.adults < 1 ||
      !Number.isInteger(v.children) ||
      v.children < 0
    ) {
      this.error.set('Choose valid guest counts.');
      return;
    }
    this.intent.select({
      stay_id: state.stay_id,
      stay_slug: state.stay_slug,
      room_type: state.room_type,
      check_in: state.check_in,
      check_out: state.check_out,
      adults: v.adults,
      children: v.children,
      rooms: state.rooms,
    });
    this.busy.set(true);
    this.error.set('');
    this.form.controls.accepted.setValue(false);
    this.quote.set(null);
    this.api
      .availability(state.stay_id, { ...state, adults: v.adults, children: v.children })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (r) => {
          const quote = r.room_types.find((r) => r.room_type_id === state.room_type);
          this.quote.set(quote?.available ? quote : null);
          if (!quote?.available)
            this.error.set(
              quote?.reason === 'minimum_stay'
                ? `Minimum stay is ${quote.minimum_stay} nights.`
                : quote?.reason === 'occupancy'
                  ? 'This room does not fit the selected guests.'
                  : 'This room is no longer available for your selected dates.',
            );
        },
        error: (e: HttpErrorResponse) =>
          this.error.set(e.error?.message || 'Availability could not be checked.'),
      });
  }
  review() {
    this.form.controls.first_name.markAsTouched();
    this.form.controls.last_name.markAsTouched();
    if (
      this.form.controls.first_name.valid &&
      this.form.controls.last_name.valid &&
      this.quote()?.available
    )
      this.reviewing.set(true);
  }
  acceptPrice() {
    const p = this.changedPrice(),
      q = this.quote();
    if (p && q) this.quote.set({ ...q, total: p.new, nightly_prices: p.nightly_prices });
    this.changedPrice.set(null);
    this.form.controls.accepted.setValue(false);
    this.error.set('');
  }
  submit() {
    const s = this.intent.state(),
      q = this.quote(),
      user = this.auth.user();
    if (
      !s ||
      !q?.available ||
      !user ||
      this.form.invalid ||
      !this.reviewing() ||
      this.busy() ||
      this.changedPrice() ||
      this.success()
    )
      return;
    this.busy.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    this.api
      .createBooking(
        s.stay_id,
        {
          room_type: s.room_type,
          check_in: s.check_in,
          check_out: s.check_out,
          adults: s.adults,
          children: s.children,
          rooms: s.rooms,
          guest_name: `${v.first_name.trim()} ${v.last_name.trim()}`,
          guest_email: user.email,
          guest_phone: v.phone,
          special_requests: v.special_requests,
          policies_accepted: v.accepted,
          expected_total: q.total,
        },
        s.idempotency_key,
      )
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (b) => {
          this.success.set(b);
          this.intent.completed(b.id);
        },
        error: (e: HttpErrorResponse) => {
          const data = e.error as {
            code?: string;
            message?: string;
            new_total?: string;
            nightly_prices?: RoomAvailabilityResult['nightly_prices'];
          };
          if (data?.code === 'price_changed' && data.new_total) {
            this.changedPrice.set({
              old: q.total,
              new: data.new_total,
              nightly_prices: data.nightly_prices || q.nightly_prices,
            });
            this.form.controls.accepted.setValue(false);
          } else {
            const message = data?.message || 'Your booking could not be created. Please try again.';
            this.error.set(message);
            if (/inventory|unavailable|cannot satisfy/i.test(message)) this.quote.set(null);
          }
        },
      });
  }
}

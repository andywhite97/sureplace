import { DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { BookingsApiService } from '../../core/api/account-api.services';
import { ManagerBookingsApiService } from '../../core/api/manage-api.services';
import { Booking } from '../../core/models/account.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { formatMoney } from '../../shared/listing/price-format';
import { BookingPoliciesComponent } from './booking-policies.component';

@Component({
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    SmartImageComponent,
    BookingPoliciesComponent,
  ],
  templateUrl: './booking-detail.component.html',
  styleUrl: './booking-ui.scss',
})
export class BookingDetailComponent {
  private route = inject(ActivatedRoute);
  private guestApi = inject(BookingsApiService);
  private managerApi = inject(ManagerBookingsApiService);
  private fb = inject(FormBuilder);
  @ViewChild('actionDialog') dialog?: ElementRef<HTMLDialogElement>;
  manager = this.route.snapshot.data['manager'] === true;
  booking = signal<Booking | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  action = signal<'confirm' | 'decline' | 'cancel' | 'complete'>('cancel');
  form = this.fb.nonNullable.group({
    reason: ['', Validators.maxLength(1000)],
    note: ['', Validators.maxLength(1000)],
  });
  readonly money = formatMoney;
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    const id = this.route.snapshot.paramMap.get('id') || '';
    (this.manager ? this.managerApi.detail(id) : this.guestApi.detail(id))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (b) => this.booking.set(b),
        error: (e: HttpErrorResponse) =>
          this.error.set(
            e.status === 404
              ? 'This booking is unavailable or you do not have access.'
              : e.error?.message || 'Booking could not be loaded.',
          ),
      });
  }
  nights(b: Booking) {
    return (Date.parse(b.check_out) - Date.parse(b.check_in)) / 86400000;
  }
  active(b: Booking) {
    return (
      ['PENDING', 'CONFIRMED'].includes(b.status) &&
      !(b.status === 'PENDING' && b.expires_at && Date.parse(b.expires_at) <= Date.now())
    );
  }
  canCancel(b: Booking) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Mbabane',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const today = ['year', 'month', 'day']
      .map((k) => parts.find((p) => p.type === k)?.value)
      .join('-');
    return this.active(b) && (this.manager || b.check_out >= today);
  }
  canComplete(b: Booking) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Mbabane',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const today = ['year', 'month', 'day']
      .map((k) => parts.find((p) => p.type === k)?.value)
      .join('-');
    return b.status === 'CONFIRMED' && b.check_out <= today;
  }
  open(action: 'confirm' | 'decline' | 'cancel' | 'complete') {
    this.action.set(action);
    this.form.reset({ reason: '', note: '' });
    this.error.set('');
    this.dialog?.nativeElement.showModal();
  }
  perform() {
    const b = this.booking(),
      a = this.action(),
      v = this.form.getRawValue();
    if (!b || this.busy()) return;
    if (this.form.invalid) {
      this.error.set('Keep the reason and note within 1,000 characters.');
      return;
    }
    if ((a === 'decline' || (a === 'cancel' && this.manager)) && !v.reason.trim()) {
      this.error.set('Choose or enter a reason.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    (this.manager ? this.managerApi.action(b.id, a, v) : this.guestApi.cancel(b.id, v.reason))
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.booking.set(updated);
          this.dialog?.nativeElement.close();
        },
        error: (e: HttpErrorResponse) =>
          this.error.set(e.error?.message || 'The booking action could not be completed.'),
      });
  }
  directions(b: Booking) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${b.stay_latitude},${b.stay_longitude}`)}`;
  }
}

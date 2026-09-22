import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BookingsApiService } from '../../core/api/account-api.services';
import { Booking } from '../../core/models/account.models';
import { ToastService } from '../../core/services/toast.service';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { StatusBadgeComponent } from './account-ui';

type BookingFilter = 'upcoming' | 'past' | 'cancelled';
type BookingSort = 'newest' | 'check_in_asc' | 'check_in_desc';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, SmartImageComponent, StatusBadgeComponent],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss',
})
export class BookingsComponent {
  private api = inject(BookingsApiService);
  private toast = inject(ToastService);
  items = signal<Booking[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  filter = signal<BookingFilter>('upcoming');
  sort = signal<BookingSort>('newest');
  expanded = signal<string | null>(null);

  counts = computed(() => ({
    upcoming: this.group('upcoming').length,
    pending: this.items().filter((booking) => booking.status === 'PENDING').length,
    past: this.group('past').length,
    cancelled: this.group('cancelled').length,
    total: this.items().length,
  }));

  filtered = computed(() => {
    const rows = [...this.group(this.filter())];
    return rows.sort((a, b) => {
      if (this.sort() === 'check_in_asc') return a.check_in.localeCompare(b.check_in);
      if (this.sort() === 'check_in_desc') return b.check_in.localeCompare(a.check_in);
      return b.created_at.localeCompare(a.created_at);
    });
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.items.set(page.results),
        error: () => this.error.set("We couldn't load your bookings."),
      });
  }

  money(value: string, currency: string) {
    return formatMoney(value, currency);
  }

  location(booking: Booking) {
    return [booking.stay_suburb, booking.stay_town].filter(Boolean).join(', ');
  }

  guestLabel(booking: Booking) {
    const guests = booking.adults + booking.children;
    return `${guests} guest${guests === 1 ? '' : 's'}`;
  }

  nights(booking: Booking) {
    const checkIn = Date.parse(`${booking.check_in}T00:00:00Z`);
    const checkOut = Date.parse(`${booking.check_out}T00:00:00Z`);
    return Math.max(1, Math.round((checkOut - checkIn) / 86_400_000));
  }

  emptyTitle() {
    return this.filter() === 'upcoming'
      ? 'No upcoming bookings'
      : this.filter() === 'cancelled'
        ? 'No cancelled bookings'
        : 'No past stays yet';
  }

  emptyCopy() {
    return this.filter() === 'upcoming'
      ? 'Your future stays will appear here.'
      : this.filter() === 'cancelled'
        ? 'Cancelled bookings will appear here.'
        : 'Completed stays will appear here.';
  }

  canCancel(booking: Booking) {
    return ['PENDING', 'CONFIRMED'].includes(booking.status);
  }

  setSort(value: string) {
    this.sort.set(value as BookingSort);
  }

  toggleDetails(booking: Booking) {
    this.expanded.set(this.expanded() === booking.id ? null : booking.id);
  }

  copyReference(reference: string) {
    if (!navigator.clipboard) return;
    void navigator.clipboard
      .writeText(reference)
      .then(() => this.toast.show('Booking reference copied.', 'success'))
      .catch(() => this.toast.show('Booking reference could not be copied.', 'error'));
  }

  cancel(booking: Booking) {
    this.busy.set(true);
    this.api
      .cancel(booking.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.items.update((items) =>
            items.map((item) => (item.id === booking.id ? updated : item)),
          );
          this.toast.show('Booking cancelled.', 'success');
        },
        error: () => this.toast.show('Booking could not be cancelled.', 'error'),
      });
  }

  private group(filter: BookingFilter) {
    if (filter === 'upcoming')
      return this.items().filter((booking) => ['PENDING', 'CONFIRMED'].includes(booking.status));
    if (filter === 'cancelled')
      return this.items().filter((booking) => booking.status === 'CANCELLED');
    return this.items().filter((booking) =>
      ['DECLINED', 'COMPLETED', 'EXPIRED'].includes(booking.status),
    );
  }
}

import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  NgZone,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ManagerBookingsApiService } from '../../core/api/manage-api.services';
import { Booking } from '../../core/models/account.models';
import { formatMoney } from '../../shared/listing/price-format';
@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './manager-bookings.component.html',
  styleUrl: '../bookings/booking-ui.scss',
})
export class ManagerBookingsComponent {
  private destroyRef = inject(DestroyRef);
  private zone = inject(NgZone);
  private api = inject(ManagerBookingsApiService);
  rows = signal<Booking[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  filter = signal('all');
  overview = signal(true);
  search = signal('');
  stayFilter = signal('');
  roomFilter = signal('');
  start = signal('');
  end = signal('');
  readonly formatMoney = formatMoney;
  stays = computed(() => [
    ...new Map(this.rows().map((b) => [b.stay, { id: b.stay, name: b.stay_name }])).values(),
  ]);
  rooms = computed(() => [
    ...new Map(
      this.rows()
        .filter((b) => !this.stayFilter() || b.stay === this.stayFilter())
        .map((b) => [b.room_type, { id: b.room_type, name: b.room_name }]),
    ).values(),
  ]);
  metrics = computed(() => ({
    pending: this.rows().filter((b) => b.status === 'PENDING' && this.active(b)).length,
    arrivals: this.arrivals().length,
    departures: this.departures().length,
    upcoming: this.rows().filter((b) => b.status === 'CONFIRMED' && b.check_in >= this.today())
      .length,
  }));
  arrivals = computed(() =>
    this.rows().filter((b) => b.status === 'CONFIRMED' && b.check_in === this.today()),
  );
  departures = computed(() =>
    this.rows().filter((b) => b.status === 'CONFIRMED' && b.check_out === this.today()),
  );
  filters = [
    { value: 'all', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'history', label: 'History' },
  ];
  filtered = computed(() =>
    this.rows().filter((b) => {
      const f = this.filter(),
        term = this.search().trim().toLowerCase();
      return (
        (f === 'all' ||
          (f === 'upcoming' && b.status === 'CONFIRMED' && b.check_in >= this.today()) ||
          (f === 'history' && ['COMPLETED', 'DECLINED', 'EXPIRED'].includes(b.status)) ||
          b.status === f) &&
        (!term || `${b.reference} ${b.guest_name} ${b.guest_email}`.toLowerCase().includes(term)) &&
        (!this.stayFilter() || b.stay === this.stayFilter()) &&
        (!this.roomFilter() || b.room_type === this.roomFilter()) &&
        (!this.start() || b.check_out > this.start()) &&
        (!this.end() || b.check_in <= this.end())
      );
    }),
  );
  constructor() {
    this.load();
    afterNextRender(() => {
      // Background refresh must not hold SSR hydration open indefinitely.
      const timer = this.zone.runOutsideAngular(() =>
        setInterval(() => {
          if (document.visibilityState === 'visible') this.zone.run(() => this.load(true));
        }, 60000),
      );
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
  load(quiet = false) {
    if (!quiet) this.loading.set(true);
    this.error.set('');
    this.api
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.rows.set(p.results),
        error: () => {
          if (!quiet) this.error.set('Manager bookings could not be loaded.');
        },
      });
  }
  active(b: Booking) {
    return !(b.status === 'PENDING' && b.expires_at && Date.parse(b.expires_at) <= Date.now());
  }
  actions(b: Booking): Array<'confirm' | 'decline' | 'cancel' | 'complete'> {
    if (b.status === 'PENDING')
      return this.active(b) ? ['confirm', 'decline', 'cancel'] : ['cancel'];
    if (b.status === 'CONFIRMED')
      return b.check_out <= this.today() ? ['cancel', 'complete'] : ['cancel'];
    return [];
  }
  private today() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Mbabane',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    return ['year', 'month', 'day'].map((k) => parts.find((p) => p.type === k)?.value).join('-');
  }
}

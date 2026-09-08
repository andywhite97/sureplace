import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BookingsApiService } from '../../core/api/account-api.services';
import { Booking } from '../../core/models/account.models';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { StatusBadgeComponent } from './account-ui';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, SmartImageComponent, StatusBadgeComponent],
  template: `<section class="account-page">
    <header><h1>Bookings</h1><div role="group" aria-label="Booking filter"><button [class.active]="filter()==='all'" (click)="filter.set('all')">All</button><button [class.active]="filter()==='PENDING'" (click)="filter.set('PENDING')">Pending</button><button [class.active]="filter()==='CONFIRMED'" (click)="filter.set('CONFIRMED')">Confirmed</button><button [class.active]="filter()==='history'" (click)="filter.set('history')">History</button></div></header>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) { <div class="state"><p>{{ error() }}</p><button (click)="load()">Retry</button></div> }
    @else if (!filtered().length) { <div class="state"><h2>Your stay bookings will appear here.</h2><a routerLink="/stays">Browse Stays</a></div> }
    @else { <div class="list">@for (b of filtered(); track b.id) {
      <article>
        <sp-image [src]="b.stay_image" [alt]="b.stay_name" ratio="4 / 3" />
        <div><h2>{{ b.stay_name }}</h2><p>{{ b.room_name }} · {{ b.check_in | date }} to {{ b.check_out | date }}</p><p>{{ b.adults + b.children }} guests · {{ b.rooms }} room{{ b.rooms === 1 ? '' : 's' }}</p><strong>{{ money(b.total, b.currency) }}</strong>@if (b.status === 'EXPIRED') { <p>This booking request expired before confirmation.</p> }@if (expanded() === b.id) { <dl><dt>Reference</dt><dd>{{ b.reference }}</dd><dt>Guest</dt><dd>{{ b.guest_name }} · {{ b.guest_email }}</dd><dt>Payment</dt><dd>{{ b.payment_status }}</dd>@if (b.special_requests) { <dt>Requests</dt><dd>{{ b.special_requests }}</dd> }</dl> }</div>
        <aside><sp-status-badge [status]="b.status" /><small>{{ b.reference }}</small><a [routerLink]="['/stays', b.stay_slug]">View Stay</a>@if (b.conversation) { <a [routerLink]="['/account/messages', b.conversation]">Message Host</a> }<button type="button" (click)="expanded.set(expanded() === b.id ? null : b.id)">Details</button>@if (canCancel(b)) { <button type="button" (click)="cancel(b)" [disabled]="busy()">Cancel Booking</button> }</aside>
      </article>
    }</div> }
  </section>`,
  styles: [
    `.account-page{display:grid;gap:1rem}header{display:flex;justify-content:space-between;gap:1rem;align-items:center}.list{display:grid;gap:.8rem}article{display:grid;grid-template-columns:130px 1fr auto;gap:1rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}h1,h2,p{margin:0}p,small,dt{color:var(--slate)}aside{display:grid;gap:.5rem;align-content:start}button,a{padding:.48rem .65rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;text-decoration:none;color:var(--midnight);font-weight:800}.active{background:var(--midnight);color:#fff}dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem .7rem;margin:.7rem 0 0}.state{display:grid;place-items:center;text-align:center;gap:.6rem;padding:3rem 1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.skeleton{height:180px;background:var(--mist);border-radius:var(--radius-sm)}@media(max-width:760px){header{display:grid;align-items:start}article{grid-template-columns:1fr}aside{display:flex;flex-wrap:wrap}}`,
  ],
})
export class BookingsComponent {
  private api = inject(BookingsApiService);
  items = signal<Booking[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  filter = signal<'all' | 'PENDING' | 'CONFIRMED' | 'history'>('all');
  expanded = signal<string | null>(null);
  filtered = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.items();
    if (f === 'history') return this.items().filter((b) => ['DECLINED', 'CANCELLED', 'COMPLETED', 'EXPIRED'].includes(b.status));
    return this.items().filter((b) => b.status === f);
  });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (p) => this.items.set(p.results), error: () => this.error.set('Bookings could not be loaded.') });
  }
  money(value: string, currency: string) {
    return formatMoney(value, currency);
  }
  canCancel(b: Booking) {
    return ['PENDING', 'CONFIRMED'].includes(b.status);
  }
  cancel(b: Booking) {
    this.busy.set(true);
    this.api.cancel(b.id).pipe(finalize(() => this.busy.set(false))).subscribe((updated) => this.items.update((xs) => xs.map((x) => (x.id === b.id ? updated : x))));
  }
}

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ManagerBookingsApiService } from '../../core/api/manage-api.services';
import { Booking } from '../../core/models/account.models';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { ManageStatusComponent } from './manage-ui';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, SmartImageComponent, ManageStatusComponent],
  template: `<section class="page"><header><h1>Manager bookings</h1><div>@for (f of filters; track f.value) { <button [class.active]="filter()===f.value" (click)="filter.set(f.value)">{{ f.label }}</button> }</div></header>@if (loading()) { <div class="skeleton"></div> } @else if (error()) { <div class="state"><p>{{ error() }}</p><button (click)="load()">Retry</button></div> } @else if (!filtered().length) { <div class="state"><h2>No managed bookings.</h2></div> } @else { <div class="list">@for (b of filtered(); track b.id) { <article><sp-image [src]="b.stay_image" [alt]="b.stay_name" ratio="4 / 3" /><div><h2>{{ b.stay_name }}</h2><p>{{ b.reference }} &middot; {{ b.room_name }}</p><p>{{ b.check_in | date }} to {{ b.check_out | date }} &middot; {{ b.adults + b.children }} guests &middot; {{ b.rooms }} room{{ b.rooms === 1 ? '' : 's' }}</p><p>{{ b.guest_name }} &middot; {{ b.guest_email }} @if (b.guest_phone) { &middot; {{ b.guest_phone }} }</p><strong>{{ formatMoney(b.total, b.currency) }}</strong></div><aside><sp-manage-status [status]="b.status" />@if (b.conversation) { <a [routerLink]="['/account/messages', b.conversation]">Conversation</a> }@for (a of actions(b); track a) { <button (click)="go(b, a)" [disabled]="busy()">{{ label(a) }}</button> }</aside></article> }</div> }</section>`,
  styles: [
    `.page{display:grid;gap:1rem}header{display:flex;justify-content:space-between;gap:1rem;align-items:center}.list{display:grid;gap:.8rem}article{display:grid;grid-template-columns:120px 1fr auto;gap:1rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}h1,h2,p{margin:0}p{color:var(--slate)}aside{display:grid;gap:.5rem;align-content:start}button,a{padding:.55rem .75rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;color:var(--midnight);text-decoration:none;font-weight:800}.active{background:var(--midnight);color:#fff}.state{display:grid;place-items:center;text-align:center;padding:3rem 1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.skeleton{height:170px;background:var(--mist);border-radius:var(--radius-sm)}@media(max-width:760px){header{display:grid}article{grid-template-columns:1fr}aside{display:flex;flex-wrap:wrap}}`,
  ],
})
export class ManagerBookingsComponent {
  private api = inject(ManagerBookingsApiService);
  rows = signal<Booking[]>([]);
  filter = signal('PENDING');
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  filters = [{ value: 'PENDING', label: 'Pending' }, { value: 'CONFIRMED', label: 'Confirmed' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'history', label: 'History' }, { value: 'all', label: 'All' }];
  filtered = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.rows();
    if (f === 'upcoming') return this.rows().filter((b) => b.status === 'CONFIRMED' && b.check_in >= this.today());
    if (f === 'history') return this.rows().filter((b) => ['COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(b.status));
    return this.rows().filter((b) => b.status === f);
  });
  readonly formatMoney = formatMoney;
  constructor() { this.load(); }
  load() { this.loading.set(true); this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (p) => this.rows.set(p.results), error: () => this.error.set('Manager bookings could not be loaded.') }); }
  actions(b: Booking): Array<'confirm' | 'decline' | 'cancel' | 'complete'> { if (b.status === 'PENDING') return ['confirm', 'decline', 'cancel']; if (b.status === 'CONFIRMED') return ['cancel', 'complete']; return []; }
  label(a: string) { return a[0].toUpperCase() + a.slice(1); }
  go(b: Booking, action: 'confirm' | 'decline' | 'cancel' | 'complete') { this.busy.set(true); this.api.action(b.id, action).pipe(finalize(() => this.busy.set(false))).subscribe({ next: () => this.load(), error: (e) => this.error.set(e?.error?.message || 'Booking action could not be completed.') }); }
  private today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
}

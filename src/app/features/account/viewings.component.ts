import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ViewingsApiService } from '../../core/api/account-api.services';
import { ViewingRequest } from '../../core/models/account.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { StatusBadgeComponent } from './account-ui';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, SmartImageComponent, StatusBadgeComponent],
  template: `<section class="account-page">
    <h1>Viewing requests</h1>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) { <div class="state"><p>{{ error() }}</p><button (click)="load()">Retry</button></div> }
    @else if (!items().length) { <div class="state"><h2>You haven't requested any property viewings yet.</h2><a routerLink="/properties">Browse Properties</a></div> }
    @else { <div class="list">@for (v of items(); track v.id) {
      <article>
        <sp-image [src]="v.property_image" [alt]="v.property_title" ratio="4 / 3" />
        <div><h2>{{ v.property_title || 'Property viewing' }}</h2><p>{{ location(v) }}</p><p>Requested {{ v.requested_date | date }} at {{ v.requested_time }}</p>@if (v.alternative_date) { <p>Alternative {{ v.alternative_date | date }} at {{ v.alternative_time }}</p> }<small>Created {{ v.created_at | date: 'mediumDate' }}</small></div>
        <aside><sp-status-badge [status]="v.status" /><a [routerLink]="['/properties', v.property_slug]">View Property</a>@if (v.conversation) { <a [routerLink]="['/account/messages', v.conversation]">Open Conversation</a> }@if (canCancel(v)) { <button type="button" (click)="cancel(v)" [disabled]="busy()">Cancel Request</button> }</aside>
      </article>
    }</div> }
  </section>`,
  styles: [
    `.account-page{display:grid;gap:1rem}.list{display:grid;gap:.8rem}article{display:grid;grid-template-columns:120px 1fr auto;gap:1rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}h1,h2,p{margin:0}p,small{color:var(--slate)}aside{display:grid;gap:.5rem;align-content:start}a,button{padding:.48rem .65rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;text-decoration:none;color:var(--midnight);font-weight:800}.state{display:grid;place-items:center;text-align:center;gap:.6rem;padding:3rem 1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.skeleton{height:180px;background:var(--mist);border-radius:var(--radius-sm)}@media(max-width:760px){article{grid-template-columns:1fr}aside{display:flex;flex-wrap:wrap}}`,
  ],
})
export class ViewingsComponent {
  private api = inject(ViewingsApiService);
  items = signal<ViewingRequest[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (p) => this.items.set(p.results), error: () => this.error.set('Viewing requests could not be loaded.') });
  }
  location(v: ViewingRequest) {
    return [v.property_suburb, v.property_town].filter(Boolean).join(', ');
  }
  canCancel(v: ViewingRequest) {
    return ['PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(v.status);
  }
  cancel(v: ViewingRequest) {
    this.busy.set(true);
    this.api.cancel(v.id).pipe(finalize(() => this.busy.set(false))).subscribe((updated) => this.items.update((xs) => xs.map((x) => (x.id === v.id ? updated : x))));
  }
}

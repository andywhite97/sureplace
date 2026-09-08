import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ManagerViewingsApiService } from '../../core/api/manage-api.services';
import { ViewingRequest } from '../../core/models/account.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { ManageStatusComponent } from './manage-ui';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, SmartImageComponent, ManageStatusComponent],
  template: `<section class="page"><h1>Manager viewings</h1>@if (loading()) { <div class="skeleton"></div> } @else if (error()) { <div class="state"><p>{{ error() }}</p><button (click)="load()">Retry</button></div> } @else if (!rows().length) { <div class="state"><h2>No managed viewing requests.</h2></div> } @else { <div class="list">@for (v of rows(); track v.id) { <article><sp-image [src]="v.property_image" [alt]="v.property_title" ratio="4 / 3" /><div><h2>{{ v.property_title }}</h2><p>{{ v.requester_display_name || 'SurePlace member' }}</p><p>{{ v.requested_date | date }} at {{ v.requested_time }}</p>@if (v.alternative_date) { <p>Alternative {{ v.alternative_date | date }} at {{ v.alternative_time }}</p> }@if (v.notes) { <p>{{ v.notes }}</p> }</div><aside><sp-manage-status [status]="v.status" />@if (v.conversation) { <a [routerLink]="['/account/messages', v.conversation]">Conversation</a> }@if (v.status === 'PENDING') { <button (click)="go(v, 'confirm')" [disabled]="busy()">Confirm</button><button (click)="go(v, 'decline')" [disabled]="busy()">Decline</button> }</aside></article> }</div> }</section>`,
  styles: [
    `.page{display:grid;gap:1rem}.list{display:grid;gap:.8rem}article{display:grid;grid-template-columns:120px 1fr auto;gap:1rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}h1,h2,p{margin:0}p{color:var(--slate)}aside{display:grid;gap:.5rem;align-content:start}button,a{padding:.55rem .75rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;color:var(--midnight);text-decoration:none;font-weight:800}.state{display:grid;place-items:center;text-align:center;padding:3rem 1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.skeleton{height:170px;background:var(--mist);border-radius:var(--radius-sm)}@media(max-width:760px){article{grid-template-columns:1fr}aside{display:flex;flex-wrap:wrap}}`,
  ],
})
export class ManagerViewingsComponent {
  private api = inject(ManagerViewingsApiService);
  rows = signal<ViewingRequest[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  constructor() { this.load(); }
  load() { this.loading.set(true); this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (p) => this.rows.set(p.results), error: () => this.error.set('Manager viewings could not be loaded.') }); }
  go(v: ViewingRequest, action: 'confirm' | 'decline') { this.busy.set(true); this.api[action](v.id).pipe(finalize(() => this.busy.set(false))).subscribe(() => this.load()); }
}

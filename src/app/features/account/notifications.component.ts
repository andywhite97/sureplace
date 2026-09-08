import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { NotificationsApiService } from '../../core/api/account-api.services';
import { AccountNotification } from '../../core/models/account.models';
import { AccountActivityStore } from '../../core/services/account-activity.store';
import { NotificationItemComponent } from './account-ui';

@Component({
  standalone: true,
  imports: [NotificationItemComponent],
  template: `<section class="account-page">
    <header><h1>Notifications</h1><button type="button" (click)="markAll()" [disabled]="busy() || !unread()">Mark all read</button></header>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) { <div class="state"><p>{{ error() }}</p><button (click)="load()">Retry</button></div> }
    @else if (!items().length) { <div class="state"><h2>No notifications yet.</h2><p>Account updates will appear here.</p></div> }
    @else { <div class="list">@for (n of items(); track n.id) {
      <div><sp-notification-item [item]="n" />@if (!n.is_read) { <button type="button" (click)="read(n)" [disabled]="busy()">Mark read</button> }</div>
    }</div> }
  </section>`,
  styles: [
    `.account-page{display:grid;gap:1rem}header{display:flex;justify-content:space-between;align-items:center}.list{border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden}.list>div{position:relative}.list>div>button{position:absolute;right:1rem;bottom:.7rem}button{padding:.48rem .65rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;font-weight:800}.state{display:grid;place-items:center;text-align:center;gap:.6rem;padding:3rem 1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.skeleton{height:180px;background:var(--mist);border-radius:var(--radius-sm)}`,
  ],
})
export class NotificationsComponent {
  private api = inject(NotificationsApiService);
  private activity = inject(AccountActivityStore);
  items = signal<AccountNotification[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  constructor() {
    this.load();
  }
  unread() {
    return this.items().some((x) => !x.is_read);
  }
  load() {
    this.loading.set(true);
    this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (p) => this.items.set(p.results), error: () => this.error.set('Notifications could not be loaded.') });
  }
  read(n: AccountNotification) {
    this.busy.set(true);
    this.api.markRead(n.id).pipe(finalize(() => this.busy.set(false))).subscribe((updated) => {
      this.items.update((xs) => xs.map((x) => (x.id === n.id ? updated : x)));
      this.activity.refresh(true);
    });
  }
  markAll() {
    this.busy.set(true);
    this.api.markAllRead().pipe(finalize(() => this.busy.set(false))).subscribe(() => {
      this.items.update((xs) => xs.map((x) => ({ ...x, is_read: true })));
      this.activity.refresh(true);
    });
  }
}

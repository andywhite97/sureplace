import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { NotificationsApiService } from '../../core/api/account-api.services';
import { AccountNotification } from '../../core/models/account.models';
import { AccountActivityStore } from '../../core/services/account-activity.store';
import { ToastService } from '../../core/services/toast.service';
import { NotificationItemComponent } from './account-ui';

@Component({
  standalone: true,
  imports: [NotificationItemComponent],
  template: `<section class="account-page">
    <header>
      <h1>Notifications</h1>
      <button type="button" (click)="markAll()" [disabled]="busy() || !unread()">
        Mark all read
      </button>
    </header>
    <nav class="filters" aria-label="Notification filters">
      @for (option of filterOptions; track option.value) {
        <button
          type="button"
          [class.active]="filter() === option.value"
          (click)="filter.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </nav>
    @if (loading()) {
      <div class="skeleton"></div>
    } @else if (error()) {
      <div class="state">
        <p>{{ error() }}</p>
        <button (click)="load()">Retry</button>
      </div>
    } @else if (!items().length) {
      <div class="state">
        <h2>No notifications yet.</h2>
        <p>Account updates will appear here.</p>
      </div>
    } @else if (!filtered().length) {
      <div class="state">
        <h2>No notifications in this category.</h2>
        <p>New account updates will appear here.</p>
      </div>
    } @else {
      <div class="list">
        @for (n of filtered(); track n.id) {
          <div>
            <sp-notification-item [item]="n" (opened)="replace($event)" />
            @if (!n.is_read) {
              <button type="button" (click)="read(n)" [disabled]="busy()">Mark read</button>
            }
          </div>
        }
      </div>
    }
  </section>`,
  styles: [
    `
      .account-page {
        display: grid;
        gap: 1rem;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .list {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
      .list > div {
        position: relative;
      }
      .list > div > button {
        position: absolute;
        right: 1rem;
        bottom: 0.7rem;
      }
      button {
        padding: 0.48rem 0.65rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        font-weight: 800;
      }
      .filters {
        display: flex;
        gap: 0.4rem;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .filters::-webkit-scrollbar {
        display: none;
      }
      .filters button {
        white-space: nowrap;
        border: 0;
        background: var(--mist);
        color: var(--slate);
      }
      .filters button.active {
        background: var(--teal);
        color: #fff;
      }
      .state {
        display: grid;
        place-items: center;
        text-align: center;
        gap: 0.6rem;
        padding: 3rem 1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
      }
      .skeleton {
        height: 180px;
        background: var(--mist);
        border-radius: var(--radius-sm);
      }
      @media (max-width: 767px) {
        .account-page {
          gap: 1.15rem;
        }
        header {
          align-items: start;
        }
        header h1 {
          margin: 0;
          font-size: 1.55rem;
        }
        header > button {
          min-height: 42px;
          white-space: nowrap;
        }
        .filters {
          margin-inline: -0.15rem;
          padding-inline: 0.15rem;
        }
        .filters button {
          min-height: 40px;
          border-radius: 999px;
        }
        .list {
          border-radius: 1rem;
        }
        .list > div > button {
          position: static;
          display: block;
          margin: -0.35rem 0.85rem 0.65rem auto;
          min-height: 38px;
          font-size: 0.78rem;
        }
        .state {
          min-height: 240px;
          padding: 2rem 1rem;
        }
        .skeleton {
          height: 300px;
          border-radius: 1rem;
        }
      }
    `,
  ],
})
export class NotificationsComponent {
  private api = inject(NotificationsApiService);
  private activity = inject(AccountActivityStore);
  private toast = inject(ToastService);
  items = signal<AccountNotification[]>([]);
  loading = signal(true);
  busy = signal(false);
  private autoMarking = signal(false);
  error = signal('');
  filter = signal<'all' | 'messages' | 'viewings' | 'bookings' | 'searches'>('all');
  filterOptions = [
    { value: 'all' as const, label: 'All' },
    { value: 'messages' as const, label: 'Messages' },
    { value: 'viewings' as const, label: 'Viewings' },
    { value: 'bookings' as const, label: 'Bookings' },
    { value: 'searches' as const, label: 'Search alerts' },
  ];
  filtered = computed(() => {
    const filter = this.filter();
    if (filter === 'all') return this.items();
    const match =
      filter === 'messages'
        ? /MESSAGE|ENQUIRY/
        : filter === 'viewings'
          ? /VIEWING/
          : filter === 'bookings'
            ? /BOOKING/
            : /SEARCH|ALERT/;
    return this.items().filter((item) => match.test(item.notification_type));
  });
  constructor() {
    this.load();
  }
  unread() {
    return this.items().some((x) => !x.is_read);
  }
  load() {
    this.loading.set(true);
    this.api
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => {
          this.items.set(p.results);
          this.markUnreadOnEntry(p.results);
        },
        error: () => this.error.set('Notifications could not be loaded.'),
      });
  }
  read(n: AccountNotification) {
    this.busy.set(true);
    this.api
      .markRead(n.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.items.update((xs) => xs.map((x) => (x.id === n.id ? updated : x)));
          this.activity.refresh(true);
        },
        error: () => this.toast.show('Notification could not be marked as read.', 'error'),
      });
  }
  replace(updated: AccountNotification) {
    this.items.update((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
  }
  private markUnreadOnEntry(items: AccountNotification[]) {
    const unreadIds = new Set(items.filter((item) => !item.is_read).map((item) => item.id));
    if (!unreadIds.size || this.autoMarking()) return;

    const readAt = new Date().toISOString();
    this.autoMarking.set(true);
    this.items.update((current) =>
      current.map((item) =>
        unreadIds.has(item.id) ? { ...item, is_read: true, read_at: item.read_at || readAt } : item,
      ),
    );
    this.activity.markAllNotificationsRead();
    this.api
      .markAllRead()
      .pipe(finalize(() => this.autoMarking.set(false)))
      .subscribe({
        next: () => this.activity.refresh(true),
        error: () => {
          this.items.update((current) =>
            current.map((item) =>
              unreadIds.has(item.id) ? { ...item, is_read: false, read_at: null } : item,
            ),
          );
          this.activity.refresh(true);
          this.toast.show('Notifications could not be marked as read.', 'error');
        },
      });
  }
  markAll() {
    this.busy.set(true);
    this.api
      .markAllRead()
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.items.update((xs) => xs.map((x) => ({ ...x, is_read: true })));
          this.activity.markAllNotificationsRead();
          this.activity.refresh(true);
          this.toast.show('All notifications marked as read.', 'success');
        },
        error: () => this.toast.show('Notifications could not be updated.', 'error'),
      });
  }
}

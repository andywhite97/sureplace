import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  NgZone,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { catchError, finalize, forkJoin, fromEvent, interval, merge, of, Subscription } from 'rxjs';
import { AccountSummaryApiService, NotificationsApiService } from '../api/account-api.services';
import { AuthService } from '../auth/auth.service';
import { AccountNotification, SeekerSummary } from '../models/account.models';

@Injectable({ providedIn: 'root' })
export class AccountActivityStore {
  private summaryApi = inject(AccountSummaryApiService);
  private notificationsApi = inject(NotificationsApiService);
  private auth = inject(AuthService);
  private document = inject(DOCUMENT);
  private zone = inject(NgZone);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private globalUpdates = signal(false);
  private generation = 0;
  private readRevision = 0;
  private inFlight = false;
  private refreshQueued = false;
  private request?: Subscription;
  readonly notificationPage = signal<AccountNotification[] | null>(null);
  summary = signal<SeekerSummary | null>(null);
  notifications = signal<AccountNotification[]>([]);
  loading = signal(false);
  summaryError = signal(false);
  notificationsError = signal(false);
  unreadNotifications = computed(() => this.summary()?.unread_notifications ?? 0);
  unreadMessages = computed(() => this.summary()?.unread_messages ?? 0);
  savedTotal = computed(
    () => (this.summary()?.total_saved_properties ?? 0) + (this.summary()?.total_saved_stays ?? 0),
  );
  private poll = new Subscription();

  constructor() {
    effect(() => {
      if (!this.globalUpdates()) return;
      const authenticated = this.auth.isAuthenticated();
      untracked(() => {
        if (authenticated) {
          this.refresh(true);
          this.startPolling();
        } else {
          this.generation++;
          this.request?.unsubscribe();
          this.inFlight = false;
          this.refreshQueued = false;
          this.loading.set(false);
          this.stopPolling(true);
          this.summary.set(null);
          this.notifications.set([]);
          this.notificationPage.set(null);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.generation++;
      this.stopPolling(true);
      this.request?.unsubscribe();
    });
  }

  startGlobalUpdates() {
    if (this.browser) this.globalUpdates.set(true);
  }

  refresh(silent = false) {
    if (!this.auth.isAuthenticated()) return;
    if (this.inFlight) {
      this.refreshQueued = true;
      return;
    }
    this.inFlight = true;
    const generation = this.generation;
    const readRevision = this.readRevision;
    if (!silent) this.loading.set(true);
    this.summaryError.set(false);
    this.notificationsError.set(false);
    this.request = forkJoin({
      summary: this.summaryApi.summary().pipe(catchError(() => of(null))),
      notifications: this.notificationsApi.list().pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => {
          if (generation !== this.generation) return;
          this.inFlight = false;
          this.loading.set(false);
          if (this.refreshQueued) {
            this.refreshQueued = false;
            this.refresh(true);
          }
        }),
      )
      .subscribe(({ summary, notifications }) => {
        if (generation !== this.generation || !this.auth.isAuthenticated()) return;
        if (readRevision !== this.readRevision) {
          this.refreshQueued = true;
          return;
        }
        if (summary) this.summary.set(summary);
        else this.summaryError.set(true);
        if (notifications) {
          this.notificationPage.set(notifications.results);
          this.notifications.set(notifications.results.slice(0, 5));
        } else this.notificationsError.set(true);
        this.loading.set(false);
      });
  }

  startPolling() {
    if (!this.browser || this.polling) return;
    this.polling = true;
    this.zone.runOutsideAngular(() => {
      const events = this.document.defaultView
        ? merge(
            interval(5000),
            fromEvent(this.document, 'visibilitychange'),
            fromEvent(this.document.defaultView, 'focus'),
            fromEvent(this.document.defaultView, 'online'),
          )
        : interval(5000);
      this.poll.add(
        events.subscribe(() => {
          if (this.auth.isAuthenticated() && !this.document.hidden)
            this.zone.run(() => this.refresh(true));
        }),
      );
    });
  }
  private polling = false;

  markMessagesRead(count: number) {
    if (count <= 0) return;
    this.readRevision++;
    this.summary.update((summary) =>
      summary
        ? { ...summary, unread_messages: Math.max((summary.unread_messages || 0) - count, 0) }
        : summary,
    );
  }

  markNotificationRead(id: string) {
    this.readRevision++;
    this.notifications.update((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, is_read: true, read_at: item.read_at || new Date().toISOString() }
          : item,
      ),
    );
    this.summary.update((summary) =>
      summary
        ? {
            ...summary,
            unread_notifications: Math.max((summary.unread_notifications || 0) - 1, 0),
          }
        : summary,
    );
  }

  markAllNotificationsRead() {
    this.readRevision++;
    const readAt = new Date().toISOString();
    this.notifications.update((items) =>
      items.map((item) => ({ ...item, is_read: true, read_at: item.read_at || readAt })),
    );
    this.notificationPage.update(
      (items) =>
        items?.map((item) => ({ ...item, is_read: true, read_at: item.read_at || readAt })) ?? null,
    );
    this.summary.update((summary) => (summary ? { ...summary, unread_notifications: 0 } : summary));
  }

  stopPolling(force = false) {
    // Route-local consumers must not stop app-wide updates when they unmount.
    if (!force && this.globalUpdates() && this.auth.isAuthenticated()) return;
    this.poll.unsubscribe();
    this.poll = new Subscription();
    this.polling = false;
  }
}

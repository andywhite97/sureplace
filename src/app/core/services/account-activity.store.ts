import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, interval, of, Subscription } from 'rxjs';
import { AccountSummaryApiService, NotificationsApiService } from '../api/account-api.services';
import { MessagingApiService } from '../api/messaging-api.service';
import { AuthService } from '../auth/auth.service';
import { AccountNotification, SeekerSummary } from '../models/account.models';

@Injectable({ providedIn: 'root' })
export class AccountActivityStore {
  private summaryApi = inject(AccountSummaryApiService);
  private notificationsApi = inject(NotificationsApiService);
  private messagingApi = inject(MessagingApiService);
  private auth = inject(AuthService);
  private document = inject(DOCUMENT);
  summary = signal<SeekerSummary | null>(null);
  notifications = signal<AccountNotification[]>([]);
  loading = signal(false);
  unreadNotifications = computed(() => this.summary()?.unread_notifications ?? 0);
  unreadMessages = computed(() => this.summary()?.unread_messages ?? 0);
  savedTotal = computed(
    () => (this.summary()?.total_saved_properties ?? 0) + (this.summary()?.total_saved_stays ?? 0),
  );
  private poll = new Subscription();

  refresh(silent = false) {
    if (!this.auth.isAuthenticated()) return;
    if (!silent) this.loading.set(true);
    forkJoin({
      summary: this.summaryApi.summary().pipe(catchError(() => of(null))),
      notifications: this.notificationsApi.list().pipe(catchError(() => of(null))),
      conversations: this.messagingApi.list().pipe(catchError(() => of(null))),
    }).subscribe(({ summary, notifications, conversations }) => {
      const unreadMessages =
        conversations?.results.reduce((total, item) => total + item.unread_count, 0) ?? 0;
      if (summary) this.summary.set({ ...summary, unread_messages: unreadMessages });
      if (notifications) this.notifications.set(notifications.results.slice(0, 5));
      this.loading.set(false);
    });
  }

  startPolling() {
    this.stopPolling();
    this.poll.add(
      interval(45000).subscribe(() => {
        if (this.auth.isAuthenticated() && !this.document.hidden) this.refresh(true);
      }),
    );
  }

  stopPolling() {
    this.poll.unsubscribe();
    this.poll = new Subscription();
  }
}

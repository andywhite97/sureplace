import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of, tap } from 'rxjs';
import { NotificationsApiService } from '../api/account-api.services';
import { AccountNotification } from '../models/account.models';
import { AccountActivityStore } from './account-activity.store';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class NotificationNavigationService {
  private api = inject(NotificationsApiService);
  private router = inject(Router);
  private activity = inject(AccountActivityStore);
  private toast = inject(ToastService);

  label(notification: AccountNotification) {
    return notification.action?.label || 'Open';
  }

  route(notification: AccountNotification) {
    return (
      this.safeInternalUrl(notification.action?.url) ||
      this.legacyRoute(notification) ||
      '/account/notifications'
    );
  }

  open(notification: AccountNotification, afterRead?: (updated: AccountNotification) => void) {
    const url = this.route(notification);
    if (!notification.is_read) this.activity.markNotificationRead(notification.id);
    this.api
      .markRead(notification.id)
      .pipe(
        tap((updated) => afterRead?.(updated)),
        catchError(() => of(null)),
        finalize(() => {
          this.activity.refresh(true);
          void this.router.navigateByUrl(url).catch(() => {
            this.toast.show('This listing is no longer available.', 'warning');
            void this.router.navigateByUrl('/account/manage/properties');
          });
        }),
      )
      .subscribe();
  }

  private legacyRoute(notification: AccountNotification) {
    const data = notification.data || {};
    if (data.conversation_id)
      return `/account/messages/${encodeURIComponent(String(data.conversation_id))}`;
    if (data.booking_id) return '/account/bookings';
    if (data.viewing_id) return '/account/viewings';
    if (data.saved_search_id) return '/account/alerts';
    if (data['property_slug'] && this.isPublicListingStatus(data)) {
      return `/properties/${encodeURIComponent(String(data['property_slug']))}`;
    }
    if (data['property_id']) {
      return `/account/manage/properties/${encodeURIComponent(String(data['property_id']))}/edit`;
    }
    return this.safeInternalUrl(data.route);
  }

  private isPublicListingStatus(data: Record<string, string | number | boolean | undefined>) {
    const action = String(data['action'] || '').toUpperCase();
    const status = String(data['status'] || '').toUpperCase();
    return ['PROPERTY_APPROVED', 'PROPERTY_RESTORED'].includes(action) || status === 'PUBLISHED';
  }

  private safeInternalUrl(value: unknown) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '';
    try {
      const parsed = new URL(value, 'https://sureplace.local');
      if (parsed.origin !== 'https://sureplace.local') return '';
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return '';
    }
  }
}

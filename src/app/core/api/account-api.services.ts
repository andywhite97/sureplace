import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import { bookingPages } from './booking-pages';
import { PaginatedResponse, User } from '../models/api.models';
import {
  AccountNotification,
  Booking,
  BookingPage,
  FavouriteItem,
  FavouritePage,
  NotificationPage,
  NotificationPreference,
  SavedSearch,
  SavedSearchCheckResponse,
  SavedSearchCreateRequest,
  SavedSearchPage,
  SeekerSummary,
  UserProfileUpdate,
  ViewingPage,
  ViewingRequest,
} from '../models/account.models';

@Injectable({ providedIn: 'root' })
export class AccountSummaryApiService {
  private api = inject(ApiClient);
  summary() {
    return this.api.get<SeekerSummary>('/dashboard/seeker-summary/');
  }
}

@Injectable({ providedIn: 'root' })
export class SavedSearchesApiService {
  private api = inject(ApiClient);
  list() {
    return this.api.get<SavedSearchPage>('/saved-searches/');
  }
  create(body: SavedSearchCreateRequest) {
    return this.api.post<SavedSearch>('/saved-searches/', body);
  }
  patch(
    id: string,
    body: Partial<Pick<SavedSearch, 'name' | 'notifications_enabled' | 'frequency'>>,
  ) {
    return this.api.patch<SavedSearch>(`/saved-searches/${encodeURIComponent(id)}/`, body);
  }
  check(id: string) {
    return this.api.post<SavedSearchCheckResponse>(
      `/saved-searches/${encodeURIComponent(id)}/check/`,
      {},
    );
  }
  delete(id: string) {
    return this.api.delete<void>(`/saved-searches/${encodeURIComponent(id)}/`);
  }
}

@Injectable({ providedIn: 'root' })
export class ViewingsApiService {
  private api = inject(ApiClient);
  list() {
    return this.api.get<ViewingPage>('/viewing-requests/');
  }
  cancel(id: string) {
    return this.api.post<ViewingRequest>(`/viewing-requests/${encodeURIComponent(id)}/cancel/`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class BookingsApiService {
  private api = inject(ApiClient);
  list(status?: string) {
    return bookingPages((page) =>
      this.api.get<BookingPage>('/bookings/', { status, page, scope: 'guest' }),
    );
  }
  detail(id: string) {
    return this.api.get<Booking>(`/bookings/${encodeURIComponent(id)}/`, { scope: 'guest' });
  }
  byIntent(idempotency_key: string) {
    return this.api.get<BookingPage>('/bookings/', { scope:'guest', idempotency_key, page_size:'1' });
  }
  cancel(id: string, reason = '') {
    return this.api.post<Booking>(`/bookings/${encodeURIComponent(id)}/cancel/`, { reason });
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private api = inject(ApiClient);
  list() {
    return this.api.get<NotificationPage>('/notifications/');
  }
  unreadCount() {
    return this.api.get<{ unread_count: number }>('/notifications/unread-count/');
  }
  markRead(id: string) {
    return this.api.post<AccountNotification>(
      `/notifications/${encodeURIComponent(id)}/mark-read/`,
      {},
    );
  }
  markAllRead() {
    return this.api.post<{ updated: number }>('/notifications/mark-all-read/', {});
  }
  preferences() {
    return this.api.get<NotificationPreference>('/notification-preferences/me/');
  }
  updatePreferences(body: Partial<NotificationPreference>) {
    return this.api.patch<NotificationPreference>('/notification-preferences/me/', body);
  }
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private api = inject(ApiClient);
  me() {
    return this.api.get<User>('/auth/me/');
  }
  update(body: UserProfileUpdate) {
    return this.api.patch<User>('/auth/me/', body);
  }
  uploadAvatar(file: File) {
    const body = new FormData();
    body.set('avatar', file);
    return this.api.patch<User>('/auth/me/', body);
  }
}

export type { FavouriteItem, FavouritePage, PaginatedResponse };

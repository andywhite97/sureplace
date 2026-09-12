import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationsApiService } from '../api/account-api.services';
import { AccountNotification } from '../models/account.models';
import { AccountActivityStore } from './account-activity.store';
import { NotificationNavigationService } from './notification-navigation.service';
import { ToastService } from './toast.service';

describe('NotificationNavigationService', () => {
  const updated = (item: AccountNotification): AccountNotification => ({
    ...item,
    is_read: true,
    read_at: new Date().toISOString(),
  });
  let markRead: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let markNotificationRead: ReturnType<typeof vi.fn>;
  let refresh: ReturnType<typeof vi.fn>;

  const notification = (overrides: Partial<AccountNotification>): AccountNotification => ({
    id: 'n1',
    notification_type: 'LISTING_STATUS_UPDATE',
    title: 'Listing approved',
    message: 'Approved',
    data: {},
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    expires_at: null,
    ...overrides,
  });

  beforeEach(() => {
    markRead = vi.fn((id: string) => of(updated(notification({ id }))));
    navigateByUrl = vi.fn(() => Promise.resolve(true));
    markNotificationRead = vi.fn();
    refresh = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        NotificationNavigationService,
        { provide: NotificationsApiService, useValue: { markRead } },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: AccountActivityStore, useValue: { markNotificationRead, refresh } },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    });
  });

  it('opens approved listing notifications on the public slug route and marks read', () => {
    const service = TestBed.inject(NotificationNavigationService);
    const item = notification({
      action: { label: 'View listing', url: '/properties/another-bedroom' },
    });
    service.open(item);
    expect(markNotificationRead).toHaveBeenCalledWith('n1');
    expect(markRead).toHaveBeenCalledWith('n1');
    expect(navigateByUrl).toHaveBeenCalledWith('/properties/another-bedroom');
  });

  it('falls back to contextual legacy routes and blocks external URLs', () => {
    const service = TestBed.inject(NotificationNavigationService);
    expect(
      service.route(
        notification({
          notification_type: 'NEW_MESSAGE',
          data: { conversation_id: 'c1', route: 'https://bad.example' },
          action: { label: 'Open', url: 'https://bad.example' },
        }),
      ),
    ).toBe('/account/messages/c1');
    expect(service.route(notification({ data: { route: 'https://bad.example' } }))).toBe(
      '/account/notifications',
    );
  });

  it('continues navigation if mark-read fails', () => {
    markRead.mockReturnValueOnce(throwError(() => new Error('offline')));
    const service = TestBed.inject(NotificationNavigationService);
    service.open(
      notification({
        action: { label: 'Review changes', url: '/account/manage/properties/p1/edit' },
      }),
    );
    expect(navigateByUrl).toHaveBeenCalledWith('/account/manage/properties/p1/edit');
    expect(refresh).toHaveBeenCalledWith(true);
  });
});

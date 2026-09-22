import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NotificationsApiService } from '../../core/api/account-api.services';
import { AccountNotification } from '../../core/models/account.models';
import { AccountActivityStore } from '../../core/services/account-activity.store';
import { ToastService } from '../../core/services/toast.service';
import { NotificationsComponent } from './notifications.component';

describe('NotificationsComponent', () => {
  const notification = (): AccountNotification => ({
    id: 'n1',
    notification_type: 'NEW_MESSAGE',
    title: 'New message',
    message: 'You have a new message.',
    data: {},
    is_read: false,
    read_at: null,
    created_at: '2026-09-21T10:00:00Z',
    expires_at: null,
  });

  function setup(markAllRead = vi.fn(() => of({ updated: 1 }))) {
    const activity = {
      markAllNotificationsRead: vi.fn(),
      refresh: vi.fn(),
    };
    const toast = { show: vi.fn() };
    const fixture = TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        {
          provide: NotificationsApiService,
          useValue: {
            list: vi.fn(() =>
              of({ count: 1, next: null, previous: null, results: [notification()] }),
            ),
            markAllRead,
          },
        },
        { provide: AccountActivityStore, useValue: activity },
        { provide: ToastService, useValue: toast },
      ],
    }).createComponent(NotificationsComponent);
    return { fixture, activity, toast, markAllRead };
  }

  it('marks unread notifications read when the page loads', () => {
    const { fixture, activity, markAllRead } = setup();

    expect(markAllRead).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.items()[0].is_read).toBe(true);
    expect(activity.markAllNotificationsRead).toHaveBeenCalledOnce();
    expect(activity.refresh).toHaveBeenCalledWith(true);
  });

  it('restores unread state if the automatic update fails', () => {
    const { fixture, activity, toast } = setup(vi.fn(() => throwError(() => new Error('offline'))));

    expect(fixture.componentInstance.items()[0].is_read).toBe(false);
    expect(activity.refresh).toHaveBeenCalledWith(true);
    expect(toast.show).toHaveBeenCalledWith('Notifications could not be marked as read.', 'error');
  });
});

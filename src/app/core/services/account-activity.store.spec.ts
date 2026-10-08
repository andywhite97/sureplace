import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AccountSummaryApiService, NotificationsApiService } from '../api/account-api.services';
import { AuthService } from '../auth/auth.service';
import { AccountNotification, SeekerSummary } from '../models/account.models';
import { AccountActivityStore } from './account-activity.store';

describe('AccountActivityStore background updates', () => {
  const authenticated = signal(true);
  const summaryApi = { summary: vi.fn() };
  const notificationsApi = { list: vi.fn() };
  let service: AccountActivityStore;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    authenticated.set(true);
    summaryApi.summary
      .mockReset()
      .mockReturnValue(of({ unread_messages: 2, unread_notifications: 1 }));
    notificationsApi.list.mockReset().mockReturnValue(of({ results: [] }));
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
        { provide: AccountSummaryApiService, useValue: summaryApi },
        { provide: NotificationsApiService, useValue: notificationsApi },
      ],
    });
    service = TestBed.inject(AccountActivityStore);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('updates without navigation and survives a route-local polling teardown', () => {
    service.startGlobalUpdates();
    TestBed.tick();
    expect(service.unreadMessages()).toBe(2);
    service.stopPolling();
    summaryApi.summary.mockReturnValue(of({ unread_messages: 3, unread_notifications: 2 }));
    notificationsApi.list.mockReturnValue(of({ results: [{ id: 'new' } as AccountNotification] }));
    vi.advanceTimersByTime(5000);
    expect(service.unreadMessages()).toBe(3);
    expect(service.unreadNotifications()).toBe(2);
    expect(service.notificationPage()?.[0].id).toBe('new');
    authenticated.set(false);
    TestBed.tick();
    const calls = summaryApi.summary.mock.calls.length;
    vi.advanceTimersByTime(10000);
    expect(summaryApi.summary).toHaveBeenCalledTimes(calls);
    expect(service.summary()).toBeNull();
  });

  it('pauses hidden-tab polling and refreshes immediately when returning', () => {
    service.startGlobalUpdates();
    TestBed.tick();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    vi.advanceTimersByTime(10000);
    expect(summaryApi.summary).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(summaryApi.summary).toHaveBeenCalledTimes(2);
  });

  it('coalesces overlapping refreshes and ignores a signed-out response', () => {
    const pending = new Subject<SeekerSummary>();
    summaryApi.summary.mockReturnValue(pending);
    service.startGlobalUpdates();
    TestBed.tick();
    vi.advanceTimersByTime(10000);
    expect(summaryApi.summary).toHaveBeenCalledTimes(1);
    summaryApi.summary.mockReturnValue(of({ unread_messages: 4 }));
    pending.next({ unread_messages: 3 } as SeekerSummary);
    pending.complete();
    expect(summaryApi.summary).toHaveBeenCalledTimes(2);
    expect(service.unreadMessages()).toBe(4);
    const late = new Subject<SeekerSummary>();
    summaryApi.summary.mockReturnValue(late);
    service.refresh(true);
    authenticated.set(false);
    TestBed.tick();
    late.next({ unread_messages: 99 } as SeekerSummary);
    late.complete();
    expect(service.summary()).toBeNull();
  });

  it('clears read message counts immediately and does not restore them from an older response', () => {
    service.summary.set({ unread_messages: 5 } as SeekerSummary);
    const stale = new Subject<SeekerSummary>();
    summaryApi.summary.mockReturnValue(stale);
    service.refresh(true);
    service.markMessagesRead(3);
    expect(service.unreadMessages()).toBe(2);
    summaryApi.summary.mockReturnValue(of({ unread_messages: 2 }));
    stale.next({ unread_messages: 5 } as SeekerSummary);
    stale.complete();
    expect(service.unreadMessages()).toBe(2);
    expect(summaryApi.summary).toHaveBeenCalledTimes(2);
  });
});

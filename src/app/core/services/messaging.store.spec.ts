import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { MessagingApiService } from '../api/messaging-api.service';
import { ConversationDetail, Message, MessagePage } from '../models/messaging.models';
import { AccountActivityStore } from './account-activity.store';
import { MessagingStore } from './messaging.store';

describe('MessagingStore live updates', () => {
  const api = {
    list: vi.fn(),
    detail: vi.fn(),
    messages: vi.fn(),
    markRead: vi.fn(),
    send: vi.fn(),
  };
  const activity = { refresh: vi.fn(), markMessagesRead: vi.fn() };
  let store: MessagingStore;
  const message = (id: string) =>
    ({ id, created_at: '2026-10-08T10:00:00Z', is_mine: false, body: id }) as Message;
  const page = (messages: Message[]) => ({ results: messages, next: null }) as MessagePage;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    api.list.mockReset().mockReturnValue(of({ results: [] }));
    api.messages.mockReset().mockReturnValue(of(page([])));
    api.detail.mockReset().mockImplementation((id: string) => of({ id }));
    api.markRead.mockReset().mockReturnValue(of({ unread_count: 0 }));
    activity.refresh.mockClear();
    activity.markMessagesRead.mockClear();
    TestBed.configureTestingModule({
      providers: [
        MessagingStore,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MessagingApiService, useValue: api },
        { provide: AccountActivityStore, useValue: activity },
      ],
    });
    store = TestBed.inject(MessagingStore);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('appends incoming messages in the open thread and refreshes unread counts', () => {
    store.selected.set({ id: 'thread' } as ConversationDetail);
    store.messages.set([{ ...message('pending'), pending: true, is_mine: true }]);
    api.messages.mockReturnValue(of(page([message('incoming')])));
    store.startPolling();
    vi.advanceTimersByTime(3000);
    expect(store.messages().map((m) => m.id)).toEqual(['pending', 'incoming']);
    expect(store.newMessages()).toBe(true);
    expect(api.markRead).toHaveBeenCalledWith('thread');
    expect(activity.refresh).toHaveBeenCalledWith(true);
    vi.advanceTimersByTime(3000);
    expect(store.messages()).toHaveLength(2);
    expect(api.markRead).toHaveBeenCalledTimes(1);
  });

  it('ignores responses for a thread that is no longer selected', () => {
    const pending = new Subject<MessagePage>();
    store.selected.set({ id: 'old' } as ConversationDetail);
    api.messages.mockReturnValue(pending);
    store.pollThread();
    store.selected.set({ id: 'new' } as ConversationDetail);
    pending.next(page([message('old-message')]));
    pending.complete();
    expect(store.messages()).toEqual([]);
    expect(api.markRead).not.toHaveBeenCalled();
  });

  it('does not reopen a conversation after navigating back to the inbox', () => {
    const pending = new Subject<MessagePage>();
    api.messages.mockReturnValue(pending);
    store.open('old');
    store.close();
    pending.next(page([message('old-message')]));
    pending.complete();
    expect(store.selected()).toBeNull();
    expect(store.messages()).toEqual([]);
  });

  it('marks the opened conversation immediately while message loading is still pending', () => {
    const loading = new Subject<MessagePage>();
    const reading = new Subject<{ unread_count: number }>();
    api.messages.mockReturnValue(loading);
    api.markRead.mockReturnValue(reading);
    store.conversations.set([
      { id: 'opened', unread_count: 3 },
      { id: 'other', unread_count: 2 },
    ] as ConversationDetail[]);
    store.open('opened');
    expect(api.markRead).toHaveBeenCalledWith('opened');
    expect(store.threadLoading()).toBe(true);
    expect(store.conversations().map((c) => c.unread_count)).toEqual([0, 2]);
    expect(activity.markMessagesRead).toHaveBeenCalledWith(3);
    reading.next({ unread_count: 0 });
    reading.complete();
    expect(activity.refresh).toHaveBeenCalledWith(true);
  });

  it('restores the unread indicator when marking read fails', () => {
    const reading = new Subject<{ unread_count: number }>();
    api.markRead.mockReturnValue(reading);
    store.conversations.set([{ id: 'opened', unread_count: 3 }] as ConversationDetail[]);
    store.open('opened');
    reading.error(new Error('offline'));
    expect(store.conversations()[0].unread_count).toBe(3);
    expect(activity.refresh).toHaveBeenCalledWith(true);
  });
});

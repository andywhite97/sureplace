import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  NgZone,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountActivityStore } from './account-activity.store';
import {
  catchError,
  filter,
  finalize,
  forkJoin,
  interval,
  of,
  Subscription,
  switchMap,
} from 'rxjs';
import { MessagingApiService } from '../api/messaging-api.service';
import { ConversationDetail, ConversationSummary, Message } from '../models/messaging.models';
@Injectable()
export class MessagingStore {
  private api = inject(MessagingApiService);
  private document = inject(DOCUMENT);
  private destroy = inject(DestroyRef);
  private zone = inject(NgZone);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private activity = inject(AccountActivityStore);
  private openSequence = 0;
  private pollingThread: string | null = null;
  private fetchingList = false;
  private readRetry = new Set<string>();
  private reading = new Set<string>();
  conversations = signal<ConversationSummary[]>([]);
  selected = signal<ConversationDetail | null>(null);
  messages = signal<Message[]>([]);
  listLoading = signal(false);
  threadLoading = signal(false);
  sending = signal(false);
  listError = signal('');
  threadError = signal('');
  nextMessages = signal<string | null>(null);
  newMessages = signal(false);
  unreadTotal = computed(() => this.conversations().reduce((n, c) => n + c.unread_count, 0));
  private polls = new Subscription();
  constructor() {
    this.destroy.onDestroy(() => this.stopPolling());
  }
  loadList(silent = false) {
    if (this.fetchingList) return;
    this.fetchingList = true;
    if (!silent) this.listLoading.set(true);
    return this.api
      .list()
      .pipe(
        catchError(() => {
          if (!silent) this.listError.set("We couldn't load your messages.");
          return of({ count: 0, next: null, previous: null, results: this.conversations() });
        }),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.listLoading.set(false);
          this.fetchingList = false;
        }),
      )
      .subscribe((p) => {
        this.conversations.set(p.results);
        this.listError.set('');
      });
  }
  open(id: string) {
    const sequence = ++this.openSequence;
    this.selected.set(null);
    this.messages.set([]);
    this.newMessages.set(false);
    this.threadLoading.set(true);
    this.threadError.set('');
    this.markRead(id, true);
    forkJoin({ conversation: this.api.detail(id), messages: this.api.messages(id) })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (sequence === this.openSequence) this.threadLoading.set(false);
        }),
      )
      .subscribe({
        next: (r) => {
          if (sequence !== this.openSequence) return;
          this.selected.set({
            ...r.conversation,
            unread_count: this.readRetry.has(id) ? r.conversation.unread_count : 0,
          });
          this.messages.set(this.dedupe(r.messages.results));
          this.nextMessages.set(r.messages.next);
        },
        error: (e) => {
          if (sequence !== this.openSequence) return;
          this.threadError.set(
            e.status === 403
              ? "You don't have access to this conversation."
              : e.status === 404
                ? 'This conversation is no longer available.'
                : 'Messages could not be loaded.',
          );
        },
      });
  }
  close() {
    this.openSequence++;
    this.selected.set(null);
    this.threadLoading.set(false);
  }
  send(body: string) {
    const c = this.selected();
    if (!c || this.sending()) return;
    const text = body.trim();
    if (!text) return;
    this.sending.set(true);
    const temp: Message = {
      id: `pending-${Date.now()}`,
      sender: null,
      message_type: 'TEXT',
      body: text,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      is_mine: true,
      pending: true,
    };
    this.messages.update((x) => [...x, temp]);
    this.api.send(c.id, { body: text, message_type: 'TEXT' }).subscribe({
      next: (m) => {
        this.messages.update((x) => this.dedupe(x.map((v) => (v.id === temp.id ? m : v))));
        this.sending.set(false);
        this.loadList(true);
      },
      error: () => {
        this.messages.update((x) =>
          x.map((v) => (v.id === temp.id ? { ...v, pending: false, failed: true } : v)),
        );
        this.sending.set(false);
      },
    });
  }
  retry(message: Message) {
    if (!message.failed) return;
    this.messages.update((x) => x.filter((v) => v.id !== message.id));
    this.send(message.body);
  }
  loadEarlier() {
    const conversation = this.selected(),
      next = this.nextMessages();
    if (!conversation || !next) return;
    const page = Number(new URL(next, this.document.location.href).searchParams.get('page')) || 2;
    this.api.messages(conversation.id, page).subscribe((result) => {
      if (this.selected()?.id !== conversation.id) return;
      this.messages.set(this.dedupe([...result.results, ...this.messages()]));
      this.nextMessages.set(result.next);
    });
  }
  pollThread() {
    const c = this.selected();
    if (!c || this.document.hidden || this.pollingThread === c.id) return;
    this.pollingThread = c.id;
    this.api
      .messages(c.id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (this.pollingThread === c.id) this.pollingThread = null;
        }),
      )
      .subscribe({
        next: (p) => {
          if (this.selected()?.id !== c.id) return;
          const known = new Set(this.messages().map((m) => m.id));
          const incoming = p.results.filter((m) => !m.is_mine && !known.has(m.id));
          const merged = this.dedupe([...this.messages(), ...p.results]);
          this.messages.set(merged);
          if (incoming.length) {
            this.newMessages.set(true);
            this.loadList(true);
          }
          if (
            incoming.length ||
            this.readRetry.has(c.id) ||
            this.conversations().some((row) => row.id === c.id && row.unread_count > 0)
          )
            this.markRead(c.id, false, incoming.length);
        },
        error: () => {
          /* A transient polling failure will retry on the next tick. */
        },
      });
  }
  startPolling() {
    if (!this.browser) return;
    this.stopPolling();
    this.zone.runOutsideAngular(() => {
      this.polls.add(
        interval(5000)
          .pipe(filter(() => !this.document.hidden))
          .subscribe(() => this.zone.run(() => this.loadList(true))),
      );
      this.polls.add(
        interval(3000)
          .pipe(filter(() => !this.document.hidden))
          .subscribe(() => this.zone.run(() => this.pollThread())),
      );
    });
  }
  stopPolling() {
    this.polls.unsubscribe();
    this.polls = new Subscription();
  }
  markRead(id: string, force = false, receivedCount = 0) {
    const row = this.conversations().find((c) => c.id === id);
    const selected = this.selected();
    if (this.reading.has(id) || (!force && !row?.unread_count && selected?.id !== id)) return;
    const unread = Math.max(
      row?.unread_count || 0,
      selected?.id === id ? selected.unread_count || 0 : 0,
      receivedCount,
    );
    this.reading.add(id);
    this.conversations.update((xs) => xs.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
    this.selected.update((c) => (c?.id === id ? { ...c, unread_count: 0 } : c));
    this.activity.markMessagesRead(unread);
    this.api
      .markRead(id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.reading.delete(id)),
      )
      .subscribe({
        next: () => {
          this.readRetry.delete(id);
          this.conversations.update((xs) =>
            xs.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)),
          );
          this.selected.update((c) => (c?.id === id ? { ...c, unread_count: 0 } : c));
          this.activity.refresh(true);
        },
        error: () => {
          this.readRetry.add(id);
          this.conversations.update((xs) =>
            xs.map((c) =>
              c.id === id ? { ...c, unread_count: Math.max(c.unread_count, unread) } : c,
            ),
          );
          this.selected.update((c) =>
            c?.id === id ? { ...c, unread_count: Math.max(c.unread_count, unread) } : c,
          );
          this.activity.refresh(true);
        },
      });
  }
  private dedupe(items: Message[]) {
    return [...new Map(items.map((m) => [m.id, m])).values()].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }
}

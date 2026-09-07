import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
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
  conversations = signal<ConversationSummary[]>([]);
  selected = signal<ConversationDetail | null>(null);
  messages = signal<Message[]>([]);
  listLoading = signal(false);
  threadLoading = signal(false);
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
    if (!silent) this.listLoading.set(true);
    return this.api
      .list()
      .pipe(
        catchError(() => {
          if (!silent) this.listError.set('Conversations could not be loaded.');
          return of({ count: 0, next: null, previous: null, results: this.conversations() });
        }),
        finalize(() => this.listLoading.set(false)),
      )
      .subscribe((p) => {
        this.conversations.set(p.results);
        this.listError.set('');
      });
  }
  open(id: string) {
    this.threadLoading.set(true);
    this.threadError.set('');
    forkJoin({ conversation: this.api.detail(id), messages: this.api.messages(id) })
      .pipe(finalize(() => this.threadLoading.set(false)))
      .subscribe({
        next: (r) => {
          this.selected.set(r.conversation);
          this.messages.set(this.dedupe(r.messages.results));
          this.nextMessages.set(r.messages.next);
          this.markRead(id);
        },
        error: (e) =>
          this.threadError.set(
            e.status === 403
              ? "You don't have access to this conversation."
              : e.status === 404
                ? 'This conversation is no longer available.'
                : 'Messages could not be loaded.',
          ),
      });
  }
  send(body: string) {
    const c = this.selected();
    if (!c) return;
    const text = body.trim();
    if (!text) return;
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
      next: (m) => this.messages.update((x) => x.map((v) => (v.id === temp.id ? m : v))),
      error: () =>
        this.messages.update((x) =>
          x.map((v) => (v.id === temp.id ? { ...v, pending: false, failed: true } : v)),
        ),
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
    const page = Number(new URL(next).searchParams.get('page')) || 2;
    this.api.messages(conversation.id, page).subscribe((result) => {
      this.messages.set(this.dedupe([...result.results, ...this.messages()]));
      this.nextMessages.set(result.next);
    });
  }
  pollThread() {
    const c = this.selected();
    if (!c || this.document.hidden) return;
    this.api.messages(c.id).subscribe({
      next: (p) => {
        const before = this.messages().length,
          merged = this.dedupe([...this.messages().filter((m) => !m.pending), ...p.results]);
        this.messages.set(merged);
        if (merged.length > before) this.newMessages.set(true);
      },
    });
  }
  startPolling() {
    this.stopPolling();
    this.polls.add(
      interval(45000)
        .pipe(filter(() => !this.document.hidden))
        .subscribe(() => this.loadList(true)),
    );
    this.polls.add(
      interval(15000)
        .pipe(filter(() => !this.document.hidden))
        .subscribe(() => this.pollThread()),
    );
  }
  stopPolling() {
    this.polls.unsubscribe();
    this.polls = new Subscription();
  }
  markRead(id: string) {
    const row = this.conversations().find((c) => c.id === id);
    if (!row?.unread_count) return;
    this.api
      .markRead(id)
      .subscribe(() =>
        this.conversations.update((xs) =>
          xs.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)),
        ),
      );
  }
  private dedupe(items: Message[]) {
    return [...new Map(items.map((m) => [m.id, m])).values()].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }
}

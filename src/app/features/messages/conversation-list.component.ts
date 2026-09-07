import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConversationSummary } from '../../core/models/messaging.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
@Component({
  selector: 'sp-conversation-list',
  standalone: true,
  imports: [RouterLink, SmartImageComponent],
  template: `<section class="inbox">
    <header>
      <h1>Messages</h1>
      <input
        type="search"
        placeholder="Search conversations"
        aria-label="Search conversations"
        (input)="search.set($any($event.target).value)"
      />
      <div role="group" aria-label="Inbox filter">
        <button type="button" [class.active]="filter() === 'all'" (click)="filter.set('all')">
          All</button
        ><button
          type="button"
          [class.active]="filter() === 'unread'"
          (click)="filter.set('unread')"
        >
          Unread
        </button>
      </div>
    </header>
    <nav aria-label="Conversations">
      @for (c of filtered(); track c.id) {
        <a
          [routerLink]="['/account/messages', c.id]"
          [class.selected]="c.id === selectedId()"
          [class.unread]="c.unread_count"
          [attr.aria-current]="c.id === selectedId() ? 'page' : null"
          ><sp-image
            [src]="c.context?.image || null"
            [alt]="c.context?.title || 'Conversation'"
            ratio="1"
          />
          <div>
            <strong>{{ otherName(c) }}</strong
            ><span>{{ c.context?.title || c.subject || 'SurePlace conversation' }}</span
            ><small>{{ preview(c) }}</small>
          </div>
          <aside>
            <time>{{ relative(c.last_message_at || c.created_at) }}</time>
            @if (c.unread_count) {
              <b>{{ c.unread_count > 99 ? '99+' : c.unread_count }}</b>
            }
          </aside></a
        >
      } @empty {
        <div class="none">
          <h2>Your conversations will appear here.</h2>
          <p>Message an agent, owner or stay to start a conversation.</p>
          <a routerLink="/properties">Browse Properties</a><a routerLink="/stays">Browse Stays</a>
        </div>
      }
    </nav>
  </section>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .inbox {
        height: 100%;
        display: grid;
        grid-template-rows: auto 1fr;
        border-right: 1px solid var(--line);
      }
      header {
        padding: 1rem;
        border-bottom: 1px solid var(--line);
      }
      h1 {
        margin: 0 0 0.7rem;
      }
      input {
        width: 100%;
        padding: 0.65rem;
        border: 1px solid var(--line);
        border-radius: 0.5rem;
      }
      header div {
        display: flex;
        gap: 0.4rem;
        margin-top: 0.6rem;
      }
      button {
        border: 0;
        border-radius: 2rem;
        padding: 0.4rem 0.7rem;
      }
      .active {
        background: var(--midnight);
        color: #fff;
      }
      nav {
        overflow: auto;
      }
      nav > a {
        display: grid;
        grid-template-columns: 48px 1fr auto;
        gap: 0.7rem;
        padding: 0.85rem;
        border-bottom: 1px solid var(--line);
        text-decoration: none;
        color: var(--midnight);
      }
      nav > a.selected {
        background: var(--mist);
      }
      nav > a.unread strong,
      nav > a.unread small {
        font-weight: 800;
      }
      nav > a div {
        display: grid;
        min-width: 0;
      }
      nav > a span,
      nav > a small {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--slate);
      }
      nav > a aside {
        display: grid;
        justify-items: end;
        align-content: start;
        gap: 0.4rem;
      }
      time {
        font-size: 0.7rem;
        color: var(--slate);
      }
      b {
        background: var(--teal);
        color: #fff;
        border-radius: 2rem;
        padding: 0.15rem 0.42rem;
        font-size: 0.7rem;
      }
      .none {
        text-align: center;
        padding: 3rem 1rem;
      }
      .none a {
        display: inline-block;
        margin: 0.3rem;
        color: var(--teal);
      }
    `,
  ],
})
export class ConversationListComponent {
  conversations = input<ConversationSummary[]>([]);
  selectedId = input<string | null>(null);
  search = signal('');
  filter = signal<'all' | 'unread'>('all');
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.conversations().filter(
      (c) =>
        (this.filter() === 'all' || c.unread_count > 0) &&
        (!q || `${c.context?.title || ''} ${this.otherName(c)}`.toLowerCase().includes(q)),
    );
  });
  otherName(c: ConversationSummary) {
    return c.participants.find((p) => !p.is_me)?.display_name || 'SurePlace member';
  }
  preview(c: ConversationSummary) {
    const m = c.last_message;
    if (!m) return 'No messages yet';
    return !m.sender || m.message_type.includes('VIEWING')
      ? 'Workflow update'
      : m.deleted_at
        ? 'This message was removed.'
        : m.body;
  }
  relative(value: string) {
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    if (minutes < 2880) return 'Yesterday';
    return new Intl.DateTimeFormat('en-SZ', { day: 'numeric', month: 'short' }).format(
      new Date(value),
    );
  }
}

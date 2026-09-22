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
      <label class="search-box desktop-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="search"
          placeholder="Search conversations..."
          aria-label="Search conversations"
          (input)="search.set($any($event.target).value)"
        />
      </label>
      <label class="search-box mobile-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="search"
          placeholder="Search messages..."
          aria-label="Search conversations"
          (input)="search.set($any($event.target).value)"
        />
      </label>
      <div class="desktop-filters" role="group" aria-label="Inbox filter">
        <button type="button" [class.active]="filter() === 'all'" (click)="filter.set('all')">
          All <span>({{ conversations().length }})</span></button
        ><button
          type="button"
          [class.active]="filter() === 'unread'"
          (click)="filter.set('unread')"
        >
          Unread <span>({{ unreadConversationCount() }})</span></button
        ><button
          type="button"
          [class.active]="filter() === 'property'"
          (click)="filter.set('property')"
        >
          Property <span>({{ propertyCount() }})</span></button
        ><button type="button" [class.active]="filter() === 'stay'" (click)="filter.set('stay')">
          Stay <span>({{ stayCount() }})</span>
        </button>
      </div>
      <div class="mobile-filters" role="group" aria-label="Inbox filter">
        <button type="button" [class.active]="filter() === 'all'" (click)="filter.set('all')">
          All
        </button>
        <button type="button" [class.active]="filter() === 'unread'" (click)="filter.set('unread')">
          Unread
          @if (unreadTotal()) {
            <b>{{ unreadTotal() > 99 ? '99+' : unreadTotal() }}</b>
          }
        </button>
        <button
          type="button"
          [class.active]="filter() === 'property'"
          (click)="filter.set('property')"
        >
          Property
        </button>
        <button type="button" [class.active]="filter() === 'stay'" (click)="filter.set('stay')">
          Stay
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
            class="desktop-avatar"
            [src]="desktopImage(c)"
            [alt]="c.context?.title || 'Conversation'"
            ratio="1"
          />
          <sp-image class="mobile-avatar" [src]="avatar(c)" [alt]="otherName(c)" ratio="1" />
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
          @if (conversations().length) {
            <h2>No matching conversations</h2>
            <p>Try another search or filter.</p>
          } @else {
            <h2>No conversations yet</h2>
            <p>Contact a property owner or stay host and your messages will appear here.</p>
            <a routerLink="/properties">Explore properties</a
            ><a routerLink="/stays">Explore stays</a>
          }
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
        padding: 1rem 1.1rem 0.9rem;
        border-bottom: 1px solid var(--line);
      }
      h1 {
        display: none;
        margin: 0 0 0.7rem;
      }
      input {
        width: 100%;
        min-height: 48px;
        padding: 0.7rem 0.9rem 0.7rem 2.7rem;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
        color: var(--midnight);
        font: inherit;
      }
      .search-box {
        position: relative;
        display: block;
      }
      .search-box > i {
        position: absolute;
        z-index: 1;
        top: 50%;
        left: 1rem;
        color: var(--slate);
        font-size: 0.86rem;
        transform: translateY(-50%);
        pointer-events: none;
      }
      .mobile-search {
        display: none;
      }
      .mobile-avatar {
        display: none;
      }
      .desktop-filters,
      .mobile-filters {
        display: none;
      }
      button {
        border: 0;
        border-radius: 2rem;
        min-height: 38px;
        padding: 0.45rem 0.85rem;
        background: #eef4f3;
        color: var(--midnight);
        font-weight: 650;
        white-space: nowrap;
      }
      .active {
        background: var(--teal);
        color: #fff;
        box-shadow: 0 3px 10px rgba(0, 150, 136, 0.16);
      }
      nav {
        overflow: auto;
      }
      nav > a {
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr) auto;
        gap: 0.85rem;
        min-height: 104px;
        padding: 0.9rem 1.1rem;
        border-bottom: 1px solid var(--line);
        text-decoration: none;
        color: var(--midnight);
      }
      nav > a.selected {
        background: #eff9f7;
        box-shadow: inset 3px 0 var(--teal);
      }
      nav > a.unread:not(.selected) {
        background: #fbfefd;
      }
      nav > a.unread strong,
      nav > a.unread small {
        font-weight: 800;
      }
      .desktop-avatar {
        width: 72px;
      }
      :host ::ng-deep .desktop-avatar > div {
        border-radius: 11px;
      }
      nav > a div {
        display: grid;
        align-content: center;
        gap: 0.14rem;
        min-width: 0;
      }
      nav > a strong {
        font-size: 0.98rem;
        line-height: 1.25;
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
        padding: 4rem 1.25rem;
      }
      .none a {
        display: inline-block;
        margin: 0.3rem;
        color: var(--teal);
      }
      @media (min-width: 768px) {
        header .desktop-filters {
          display: flex;
          gap: 0.45rem;
          margin-top: 0.85rem;
        }
      }
      @media (max-width: 767px) {
        .inbox {
          border-right: 0;
        }
        header {
          padding: 0.75rem 0.75rem 0.55rem;
          border-bottom: 0;
        }
        h1 {
          display: block;
          margin-bottom: 0.8rem;
          font-size: 1.35rem;
          line-height: 1.2;
        }
        .desktop-search {
          display: none;
        }
        .mobile-search {
          display: block;
        }
        .desktop-avatar {
          display: none;
        }
        .mobile-avatar {
          display: block;
        }
        .search-box > i {
          position: absolute;
          z-index: 1;
          top: 50%;
          left: 0.8rem;
          display: block;
          color: var(--slate);
          font-size: 0.84rem;
          transform: translateY(-50%);
          pointer-events: none;
        }
        input {
          min-height: 44px;
          padding: 0.65rem 0.8rem 0.65rem 2.25rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.92);
          font-size: 16px;
          box-shadow: 0 2px 10px rgba(21, 43, 42, 0.035);
        }
        header .desktop-filters {
          display: none;
        }
        header .mobile-filters {
          display: flex;
          gap: 0.42rem;
          margin-top: 0.7rem;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .mobile-filters::-webkit-scrollbar {
          display: none;
        }
        button {
          flex: 0 0 auto;
          min-height: 38px;
          padding: 0.42rem 0.78rem;
          background: #eaf4f2;
          color: var(--midnight);
          font-size: 0.78rem;
          white-space: nowrap;
        }
        button.active {
          background: var(--teal);
          color: #fff;
          box-shadow: 0 3px 10px rgba(0, 150, 136, 0.18);
        }
        .mobile-filters button b {
          display: inline-grid;
          min-width: 1.3rem;
          height: 1.3rem;
          margin-left: 0.2rem;
          padding: 0 0.3rem;
          place-items: center;
          background: var(--teal);
          color: #fff;
          font-size: 0.65rem;
          vertical-align: middle;
        }
        .mobile-filters button.active b {
          background: #fff;
          color: var(--teal);
        }
        nav {
          margin: 0 0.5rem 0.75rem;
          overflow: auto;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 5px 20px rgba(21, 43, 42, 0.055);
        }
        nav > a {
          grid-template-columns: 42px minmax(0, 1fr) auto;
          gap: 0.65rem;
          min-height: 61px;
          padding: 0.55rem 0.65rem;
          border-color: rgba(112, 137, 132, 0.14);
        }
        nav > a:last-of-type {
          border-bottom: 0;
        }
        nav > a.selected {
          background: #eff8f6;
          box-shadow: none;
        }
        nav > a:active {
          background: var(--mist);
        }
        nav > a div {
          align-content: center;
          gap: 0.12rem;
        }
        nav > a strong {
          overflow: hidden;
          font-size: 0.79rem;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        nav > a span {
          display: none;
        }
        nav > a small {
          font-size: 0.7rem;
          line-height: 1.25;
        }
        nav > a aside {
          padding-top: 0.05rem;
          gap: 0.3rem;
        }
        time {
          font-size: 0.65rem;
        }
        nav > a aside b {
          display: grid;
          min-width: 1.2rem;
          height: 1.2rem;
          padding: 0 0.3rem;
          place-items: center;
        }
        :host ::ng-deep nav > a sp-image > div {
          border-radius: 50%;
        }
        .none {
          padding: 2.5rem 1rem;
        }
      }
    `,
  ],
})
export class ConversationListComponent {
  conversations = input<ConversationSummary[]>([]);
  selectedId = input<string | null>(null);
  search = signal('');
  filter = signal<'all' | 'unread' | 'property' | 'stay'>('all');
  unreadTotal = computed(() =>
    this.conversations().reduce((total, conversation) => total + conversation.unread_count, 0),
  );
  unreadConversationCount = computed(
    () => this.conversations().filter((conversation) => conversation.unread_count > 0).length,
  );
  propertyCount = computed(
    () =>
      this.conversations().filter((conversation) => conversation.context?.type === 'PROPERTY')
        .length,
  );
  stayCount = computed(
    () =>
      this.conversations().filter((conversation) => conversation.context?.type === 'STAY').length,
  );
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.conversations().filter((c) => {
      const filter = this.filter();
      const matchesFilter =
        filter === 'all' ||
        (filter === 'unread' && c.unread_count > 0) ||
        (filter === 'property' && c.context?.type === 'PROPERTY') ||
        (filter === 'stay' && c.context?.type === 'STAY');
      const haystack = `${c.context?.title || ''} ${this.otherName(c)} ${this.preview(c)}`;
      return matchesFilter && (!q || haystack.toLowerCase().includes(q));
    });
  });
  avatar(c: ConversationSummary) {
    return (
      c.participants.find((participant) => !participant.is_me)?.avatar || c.context?.image || null
    );
  }
  desktopImage(c: ConversationSummary) {
    return c.context?.image || this.avatar(c);
  }
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

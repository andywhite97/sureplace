import {
  AfterViewChecked,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConversationDetail, Message } from '../../core/models/messaging.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { MessageBubbleComponent } from './message-bubble.component';
import { MessageComposerComponent } from './message-composer.component';
@Component({
  selector: 'sp-conversation-thread',
  standalone: true,
  imports: [RouterLink, SmartImageComponent, MessageBubbleComponent, MessageComposerComponent],
  template: `<section class="thread">
    <header class="desktop-thread-header">
      <sp-image [src]="otherAvatar()" [alt]="otherName()" ratio="1" />
      <div>
        <strong>{{ otherName() }}</strong>
        <span>{{
          conversation().context?.title || conversation().subject || 'SurePlace conversation'
        }}</span>
      </div>
      @if (conversation().context; as c) {
        <a class="view" [routerLink]="[c.type === 'PROPERTY' ? '/properties' : '/stays', c.slug]"
          >View {{ c.type === 'PROPERTY' ? 'property' : 'stay' }}</a
        >
      }
    </header>
    <header class="mobile-thread-header">
      <a class="back" routerLink="/account/messages" aria-label="Back to messages"
        ><i class="fa-solid fa-arrow-left" aria-hidden="true"></i
      ></a>
      <sp-image [src]="otherAvatar()" [alt]="otherName()" ratio="1" />
      <div>
        <strong>{{ otherName() }}</strong
        ><span>{{
          conversation().context?.type === 'STAY'
            ? 'Stay enquiry'
            : conversation().context?.type === 'PROPERTY'
              ? 'Property enquiry'
              : 'SurePlace conversation'
        }}</span>
      </div>
    </header>
    @if (conversation().context; as c) {
      <a
        class="mobile-listing-summary"
        [routerLink]="[c.type === 'PROPERTY' ? '/properties' : '/stays', c.slug]"
      >
        <sp-image [src]="c.image" [alt]="c.title" ratio="4 / 3" />
        <span
          ><strong>{{ c.title }}</strong>
          @if (c.price) {
            <b>{{ priceLabel(c.price, c.currency) }}</b>
          }
          <small>{{ c.suburb ? c.suburb + ', ' : '' }}{{ c.town }}</small></span
        >
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </a>
    }
    <div class="workflow-grid">
      @if (conversation().context?.booking; as b) {
        <aside class="workflow booking-workflow">
          <span class="workflow-icon" aria-hidden="true"
            ><i class="fa-solid fa-calendar-check"></i
          ></span>
          <span class="workflow-copy">
            <span class="workflow-heading">
              <small>Booking request</small>
              <b class="status"><i class="fa-solid fa-clock"></i>{{ b.status }}</b>
            </span>
            <strong>{{ b.room_name }}</strong>
            <span class="workflow-detail">{{ b.check_in }} – {{ b.check_out }}</span>
            <small class="reference">{{ b.reference }}</small>
          </span>
          <a class="workflow-action" routerLink="/account/bookings"
            >View booking <i class="fa-solid fa-arrow-right" aria-hidden="true"></i
          ></a>
        </aside>
      }
      @if (conversation().context?.viewing; as v) {
        <aside class="workflow viewing-workflow">
          <span class="workflow-icon" aria-hidden="true"
            ><i class="fa-solid fa-house-circle-check"></i
          ></span>
          <span class="workflow-copy">
            <span class="workflow-heading">
              <small>Viewing request</small>
              <b class="status"><i class="fa-solid fa-clock"></i>{{ v.status }}</b>
            </span>
            <strong>Property viewing</strong>
            <span class="workflow-detail">{{ v.requested_date }} at {{ v.requested_time }}</span>
          </span>
          <a class="workflow-action" routerLink="/account/viewings"
            >View request <i class="fa-solid fa-arrow-right" aria-hidden="true"></i
          ></a>
        </aside>
      }
    </div>
    <div #scroller class="messages" role="log" aria-live="polite" (scroll)="scrolled()">
      @if (hasEarlier()) {
        <button class="earlier" type="button" (click)="loadEarlier.emit()">
          Load earlier messages
        </button>
      }
      <ol>
        @for (message of messages(); track message.id; let i = $index) {
          @if (showDate(i)) {
            <li class="date">{{ dateLabel(message.created_at) }}</li>
          }
          <sp-message-bubble [message]="message" (retry)="retry.emit(message)" />
        }
      </ol>
      @if (newMessages() && !nearBottom()) {
        <button class="new" type="button" (click)="toBottom()">New messages</button>
      }
    </div>
    <footer><sp-message-composer [disabled]="sending()" (sent)="send.emit($event)" /></footer>
  </section>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .thread {
        height: 100%;
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr) auto;
        min-height: 0;
      }
      header {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        min-height: 72px;
        padding: 0.7rem 1.25rem;
        border-bottom: 1px solid var(--line);
      }
      header sp-image {
        width: 48px;
      }
      header div {
        display: grid;
        min-width: 0;
      }
      header span {
        font-size: 0.82rem;
        color: var(--slate);
      }
      header a {
        text-decoration: none;
      }
      .mobile-thread-header,
      .mobile-listing-summary {
        display: none;
      }
      .back {
        display: none;
        font-size: 1.4rem;
      }
      .view {
        margin-left: auto;
        padding: 0.55rem 0.85rem;
        border: 1px solid #bad4cf;
        border-radius: 9px;
        color: var(--teal);
        font-weight: 800;
      }
      .workflow-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.7rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--line);
        background: #f9fbfb;
      }
      .workflow-grid:empty {
        display: none;
      }
      .workflow {
        display: grid;
        min-width: 0;
        grid-template-columns: 42px minmax(0, 1fr);
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border: 1px solid #dce8e6;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 4px 14px rgba(15, 45, 52, 0.04);
      }
      .workflow-icon {
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border-radius: 11px;
        background: #e7f7f4;
        color: var(--teal);
        font-size: 1rem;
      }
      .viewing-workflow .workflow-icon {
        background: #edf4ff;
        color: #3e6f9e;
      }
      .workflow-copy {
        display: grid;
        min-width: 0;
        gap: 0.12rem;
      }
      .workflow-heading {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.45rem;
      }
      .workflow-heading small {
        color: var(--slate);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .workflow-copy > strong {
        overflow: hidden;
        color: var(--midnight);
        font-size: 0.84rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workflow-detail,
      .reference {
        overflow: hidden;
        color: var(--slate);
        font-size: 0.72rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .reference {
        color: #718985;
        font-size: 0.65rem;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0.4rem;
        border-radius: 999px;
        background: #fff4d5;
        color: #8a6508;
        font-size: 0.62rem;
        line-height: 1;
      }
      .status i {
        font-size: 0.55rem;
      }
      .workflow-action {
        display: inline-flex;
        min-height: 36px;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 0.45rem 0.65rem;
        border: 1px solid #acd3cc;
        border-radius: 9px;
        color: var(--teal);
        font-size: 0.75rem;
        font-weight: 800;
        text-decoration: none;
        white-space: nowrap;
        grid-column: 2;
        justify-self: start;
      }
      .workflow-action:hover {
        border-color: var(--teal);
        background: #f0faf8;
      }
      .workflow-action:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--teal) 22%, transparent);
        outline-offset: 2px;
      }
      .messages {
        position: relative;
        overflow: auto;
        padding: 1.25rem 1.5rem;
        background: #f9fbfb;
      }
      .messages ol {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .date {
        text-align: center;
        color: var(--slate);
        font-size: 0.75rem;
        margin: 1rem;
      }
      .earlier {
        display: block;
        margin: 0 auto 1rem;
      }
      .new {
        position: sticky;
        bottom: 0.5rem;
        left: 50%;
        background: var(--midnight);
        color: #fff;
        border: 0;
        border-radius: 2rem;
        padding: 0.5rem 0.8rem;
      }
      footer {
        padding: 0.9rem 1.25rem;
        border-top: 1px solid var(--line);
        background: #fff;
      }
      @media (max-width: 767px) {
        .desktop-thread-header {
          display: none;
        }
        .mobile-thread-header {
          display: flex;
          min-height: 58px;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.92);
        }
        .mobile-thread-header sp-image {
          flex: 0 0 40px;
          width: 40px;
        }
        .mobile-thread-header div {
          gap: 0.08rem;
        }
        .mobile-thread-header strong {
          overflow: hidden;
          font-size: 0.9rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mobile-thread-header span {
          font-size: 0.7rem;
        }
        :host ::ng-deep .mobile-thread-header sp-image > div {
          border-radius: 50%;
        }
        .back {
          display: grid;
          flex: 0 0 36px;
          width: 36px;
          height: 36px;
          place-items: center;
          color: var(--midnight);
          font-size: 1rem;
          border-radius: 50%;
        }
        .back:active {
          background: var(--mist);
        }
        .mobile-listing-summary {
          display: grid;
          grid-template-columns: 76px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.65rem;
          margin: 0.55rem 0.75rem 0.25rem;
          padding: 0.45rem;
          border: 1px solid rgba(112, 137, 132, 0.13);
          border-radius: 0.85rem;
          background: rgba(255, 255, 255, 0.92);
          color: var(--midnight);
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(21, 43, 42, 0.05);
        }
        .mobile-listing-summary sp-image {
          width: 76px;
        }
        :host ::ng-deep .mobile-listing-summary sp-image > div {
          border-radius: 0.6rem;
        }
        .mobile-listing-summary > span {
          display: grid;
          min-width: 0;
          gap: 0.1rem;
        }
        .mobile-listing-summary strong,
        .mobile-listing-summary b,
        .mobile-listing-summary small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mobile-listing-summary strong {
          font-size: 0.78rem;
        }
        .mobile-listing-summary b {
          color: var(--teal);
          font-size: 0.82rem;
        }
        .mobile-listing-summary small {
          color: var(--slate);
          font-size: 0.68rem;
        }
        .mobile-listing-summary > i {
          color: var(--teal);
          font-size: 0.72rem;
        }
        .workflow-grid {
          grid-template-columns: 1fr;
          gap: 0.5rem;
          padding: 0.35rem 0.75rem 0.55rem;
          border: 0;
          background: transparent;
        }
        .workflow {
          grid-template-columns: 38px minmax(0, 1fr) auto;
          gap: 0.6rem;
          padding: 0.65rem;
          border-radius: 0.8rem;
        }
        .workflow-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          font-size: 0.9rem;
        }
        .workflow-copy > strong {
          font-size: 0.8rem;
        }
        .workflow-action {
          grid-column: 3;
          grid-row: 1;
          width: 36px;
          min-height: 36px;
          padding: 0;
          font-size: 0;
        }
        .workflow-action i {
          font-size: 0.72rem;
        }
        .thread {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - 170px - env(safe-area-inset-bottom));
          min-height: 420px;
          background: linear-gradient(180deg, #f7fbfa 0%, #eef8f6 100%);
        }
        .messages {
          flex: 1 1 auto;
          min-height: 0;
          padding: 0.7rem 0.75rem 1rem;
          scroll-padding-bottom: 1rem;
        }
        .date {
          margin: 0.75rem;
          font-size: 0.68rem;
        }
        footer {
          padding: 0.55rem 0.7rem calc(0.55rem + env(safe-area-inset-bottom));
          border-top: 0;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 -4px 18px rgba(21, 43, 42, 0.05);
        }
      }
    `,
  ],
})
export class ConversationThreadComponent implements AfterViewChecked {
  conversation = input.required<ConversationDetail>();
  messages = input<Message[]>([]);
  hasEarlier = input(false);
  newMessages = input(false);
  sending = input(false);
  send = output<string>();
  retry = output<Message>();
  loadEarlier = output<void>();
  scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  nearBottom = signal(true);
  private initial = true;
  otherParticipant() {
    return this.conversation().participants.find((participant) => !participant.is_me);
  }
  otherName() {
    return this.otherParticipant()?.display_name || 'SurePlace member';
  }
  otherAvatar() {
    return this.otherParticipant()?.avatar || this.conversation().context?.image || null;
  }
  priceLabel(value: string, currency = 'SZL') {
    const amount = Number(value);
    const formatted = Number.isFinite(amount)
      ? new Intl.NumberFormat('en-SZ', { maximumFractionDigits: 0 }).format(amount)
      : value;
    return `${currency === 'SZL' ? 'E' : `${currency} `}${formatted}`;
  }
  ngAfterViewChecked() {
    if (this.initial && this.messages().length) {
      this.toBottom();
      this.initial = false;
    }
  }
  scrolled() {
    const e = this.scroller()?.nativeElement;
    if (e) this.nearBottom.set(e.scrollHeight - e.scrollTop - e.clientHeight < 100);
  }
  toBottom() {
    const e = this.scroller()?.nativeElement;
    if (e) e.scrollTop = e.scrollHeight;
    this.nearBottom.set(true);
  }
  showDate(i: number) {
    return (
      i === 0 ||
      this.messages()[i - 1].created_at.slice(0, 10) !== this.messages()[i].created_at.slice(0, 10)
    );
  }
  dateLabel(v: string) {
    const d = new Date(v),
      today = new Date(),
      y = new Date();
    y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return new Intl.DateTimeFormat('en-SZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  }
}

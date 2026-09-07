import {
  AfterViewChecked,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConversationDetail, Message } from '../../core/models/messaging.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { MessageBubbleComponent } from './message-bubble.component';
import { MessageComposerComponent } from './message-composer.component';
@Component({
  selector: 'sp-conversation-thread',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    SmartImageComponent,
    MessageBubbleComponent,
    MessageComposerComponent,
  ],
  template: `<section class="thread">
    <header>
      <a class="back" routerLink="/account/messages" aria-label="Back to messages">←</a>
      @if (conversation().context; as c) {
        <sp-image [src]="c.image" [alt]="c.title" ratio="1" />
        <div>
          <strong>{{ c.title }}</strong
          ><span
            >{{ c.type === 'PROPERTY' ? 'Property' : 'Stay' }} · {{ c.suburb ? c.suburb + ', ' : ''
            }}{{ c.town }}</span
          >
        </div>
        <a class="view" [routerLink]="[c.type === 'PROPERTY' ? '/properties' : '/stays', c.slug]"
          >View listing</a
        >
      } @else {
        <strong>{{ conversation().subject || 'Conversation' }}</strong>
      }
    </header>
    @if (conversation().context?.booking; as b) {
      <aside class="workflow">
        <strong>{{ b.reference }} · {{ b.status }}</strong
        ><span>{{ b.room_name }} · {{ b.check_in }} – {{ b.check_out }}</span
        ><a routerLink="/account/bookings">View booking</a>
      </aside>
    }
    @if (conversation().context?.viewing; as v) {
      <aside class="workflow">
        <strong>Viewing · {{ v.status }}</strong
        ><span>{{ v.requested_date }} at {{ v.requested_time }}</span
        ><a routerLink="/account/viewings">View request</a>
      </aside>
    }
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
    <footer><sp-message-composer (sent)="send.emit($event)" /></footer>
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
        grid-template-rows: auto auto 1fr auto;
        min-height: 0;
      }
      header {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.7rem 1rem;
        border-bottom: 1px solid var(--line);
      }
      header sp-image {
        width: 44px;
      }
      header div {
        display: grid;
        min-width: 0;
      }
      header span {
        font-size: 0.78rem;
        color: var(--slate);
      }
      header a {
        text-decoration: none;
      }
      .back {
        display: none;
        font-size: 1.4rem;
      }
      .view {
        margin-left: auto;
        color: var(--teal);
        font-weight: 800;
      }
      .workflow {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.55rem 1rem;
        background: #fff8e8;
        border-bottom: 1px solid #ecddb8;
      }
      .workflow span {
        color: var(--slate);
      }
      .workflow a {
        margin-left: auto;
      }
      .messages {
        position: relative;
        overflow: auto;
        padding: 1rem;
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
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--line);
        background: #fff;
      }
      @media (max-width: 760px) {
        .back {
          display: block;
        }
        .workflow {
          display: grid;
        }
        .workflow a {
          margin: 0;
        }
        .thread {
          height: calc(100vh - 145px);
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
  send = output<string>();
  retry = output<Message>();
  loadEarlier = output<void>();
  scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  nearBottom = signal(true);
  private initial = true;
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

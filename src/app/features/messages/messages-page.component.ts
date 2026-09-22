import { Component, HostListener, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { MessagingStore } from '../../core/services/messaging.store';
import { ConversationListComponent } from './conversation-list.component';
import { ConversationThreadComponent } from './conversation-thread.component';
@Component({
  standalone: true,
  imports: [RouterLink, ConversationListComponent, ConversationThreadComponent],
  providers: [MessagingStore],
  template: `<header class="page-header">
      <div>
        <h1>Messages</h1>
        <p>Chat with property owners, stay hosts and agents.</p>
      </div>
    </header>
    <main class="messages-shell" [class.thread-open]="!!store.selected()">
      <section class="list-pane">
        @if (store.listLoading() && !store.conversations().length) {
          <div class="list-skeleton" aria-label="Loading conversations">
            @for (i of [1, 2, 3, 4]; track i) {
              <div></div>
            }
          </div>
        } @else if (store.listError()) {
          <div class="error">
            <p>{{ store.listError() }}</p>
            <button type="button" (click)="store.loadList()">Retry</button>
          </div>
        } @else {
          <sp-conversation-list
            [conversations]="store.conversations()"
            [selectedId]="store.selected()?.id || null"
          />
        }
      </section>
      <section class="thread-pane">
        @if (store.threadLoading()) {
          <div class="thread-skeleton" aria-label="Loading messages">
            <div></div>
            <div></div>
            <div></div>
          </div>
        } @else if (store.threadError()) {
          <div class="error">
            <h2>{{ store.threadError() }}</h2>
            <a routerLink="/account/messages">Back to Messages</a> ·
            <a routerLink="/">Browse SurePlace</a>
          </div>
        } @else if (store.selected(); as selected) {
          <sp-conversation-thread
            [conversation]="selected"
            [messages]="store.messages()"
            [hasEarlier]="!!store.nextMessages()"
            [newMessages]="store.newMessages()"
            [sending]="store.sending()"
            (send)="store.send($event)"
            (retry)="store.retry($event)"
            (loadEarlier)="store.loadEarlier()"
          />
        } @else {
          <div class="welcome">
            <div class="welcome-icon" aria-hidden="true">
              <i class="fa-regular fa-comment"></i>
              <i class="fa-solid fa-comment-dots"></i>
            </div>
            <h2>Select a conversation</h2>
            <p>Choose a conversation from the list to view messages.</p>
            <div class="welcome-help">
              <strong>Need help?</strong>
              <p>
                You can message property owners, stay hosts or agents directly about listings,
                bookings or viewings.
              </p>
              <a routerLink="/properties"
                ><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Explore
                properties</a
              >
            </div>
            <div class="welcome-values">
              <article>
                <i class="fa-regular fa-message" aria-hidden="true"></i
                ><strong>Ask questions</strong
                ><span>Get more information about a property or stay.</span>
              </article>
              <article>
                <i class="fa-regular fa-calendar" aria-hidden="true"></i
                ><strong>Arrange viewings</strong><span>Find a time that works for you.</span>
              </article>
              <article>
                <i class="fa-regular fa-comments" aria-hidden="true"></i
                ><strong>Stay updated</strong
                ><span>Receive booking updates and important messages.</span>
              </article>
            </div>
          </div>
        }
      </section>
    </main>`,
  styles: [
    `
      :host {
        display: block;
      }
      .page-header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        margin: 0 0 1.15rem;
      }
      .page-header h1 {
        margin: 0;
        color: var(--midnight);
        font-size: clamp(2rem, 3vw, 2.5rem);
        line-height: 1.05;
        letter-spacing: -0.035em;
      }
      .page-header p {
        margin: 0.35rem 0 0;
        color: var(--slate);
        font-size: 1rem;
      }
      .messages-shell {
        height: clamp(600px, calc(100dvh - 205px), 820px);
        min-height: 600px;
        display: grid;
        grid-template-columns: minmax(390px, 430px) minmax(0, 1fr);
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 8px 30px rgba(15, 45, 52, 0.045);
      }
      .list-pane,
      .thread-pane {
        min-width: 0;
        min-height: 0;
      }
      .welcome,
      .error {
        display: grid;
        place-content: center;
        text-align: center;
        height: 100%;
        padding: 2rem;
      }
      .error button {
        justify-self: center;
        padding: 0.6rem 1rem;
      }
      .welcome {
        grid-template-columns: minmax(0, 680px);
        justify-items: center;
        align-content: center;
        color: var(--midnight);
      }
      .welcome-icon {
        position: relative;
        width: 110px;
        height: 92px;
        margin-bottom: 1.15rem;
      }
      .welcome-icon i {
        position: absolute;
        display: grid;
        place-items: center;
        width: 70px;
        height: 64px;
        border-radius: 14px;
        font-size: 2rem;
      }
      .welcome-icon i:first-child {
        top: 0;
        left: 0;
        background: #e7f1ef;
        color: #bad8d3;
      }
      .welcome-icon i:last-child {
        right: 0;
        bottom: 0;
        background: var(--teal);
        color: #fff;
        box-shadow: 0 8px 20px rgba(0, 150, 136, 0.18);
      }
      .welcome > h2 {
        margin: 0;
        font-size: clamp(1.6rem, 2vw, 2rem);
        letter-spacing: -0.02em;
      }
      .welcome > p {
        max-width: 600px;
        margin: 0.65rem 0 1.75rem;
        color: var(--slate);
        font-size: 1rem;
        line-height: 1.55;
      }
      .welcome-help {
        width: 100%;
        padding: 1.45rem 0 1.75rem;
        border-top: 1px solid var(--line);
      }
      .welcome-help strong {
        font-size: 1rem;
      }
      .welcome-help p {
        max-width: 520px;
        margin: 0.45rem auto 1rem;
        color: var(--slate);
        line-height: 1.45;
      }
      .welcome-help a {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        min-height: 46px;
        padding: 0.65rem 1.25rem;
        border: 1px solid #bdd3cf;
        border-radius: 10px;
        color: var(--teal);
        font-weight: 750;
        text-decoration: none;
      }
      .welcome-values {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-top: 1px solid var(--line);
      }
      .welcome-values article {
        display: grid;
        justify-items: center;
        gap: 0.45rem;
        padding: 1.35rem 1rem 0;
      }
      .welcome-values article + article {
        border-left: 1px solid var(--line);
      }
      .welcome-values i {
        display: grid;
        width: 46px;
        height: 46px;
        place-items: center;
        margin-bottom: 0.35rem;
        border-radius: 50%;
        background: #e8f6f3;
        color: var(--teal);
        font-size: 1.25rem;
      }
      .welcome-values span {
        color: var(--slate);
        font-size: 0.85rem;
        line-height: 1.4;
      }
      .list-skeleton,
      .thread-skeleton {
        padding: 1rem;
      }
      .list-skeleton div {
        height: 70px;
        margin: 0.5rem;
        background: var(--mist);
      }
      .thread-skeleton div {
        height: 55px;
        width: 60%;
        margin: 1rem;
        background: var(--mist);
        border-radius: 1rem;
      }
      .thread-skeleton div:nth-child(even) {
        margin-left: auto;
      }
      @media (max-width: 767px) {
        .page-header {
          display: none;
        }
        .messages-shell {
          display: block;
          height: calc(100dvh - 170px - env(safe-area-inset-bottom));
          min-height: 420px;
          border-radius: 0;
        }
        .thread-open .list-pane {
          display: none;
        }
        .messages-shell:not(.thread-open) .thread-pane {
          display: none;
        }
      }
      @media (min-width: 768px) and (max-width: 1100px) {
        .messages-shell {
          grid-template-columns: minmax(330px, 40%) minmax(0, 1fr);
        }
        .welcome-values {
          display: none;
        }
      }
    `,
  ],
})
export class MessagesPageComponent {
  store = inject(MessagingStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  constructor() {
    this.store.loadList();
    this.store.startPolling();
    this.route.paramMap.pipe(map((p) => p.get('conversationId'))).subscribe((id) => {
      if (id) this.store.open(id);
      else this.store.selected.set(null);
    });
    const legacy = this.route.snapshot.queryParamMap.get('conversation');
    if (legacy) void this.router.navigate(['/account/messages', legacy], { replaceUrl: true });
  }
  @HostListener('document:visibilitychange') visibility() {
    if (!document.hidden) {
      this.store.loadList(true);
      this.store.pollThread();
    }
  }
}

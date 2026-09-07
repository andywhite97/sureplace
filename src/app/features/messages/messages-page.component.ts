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
  template: `<main class="messages-shell" [class.thread-open]="!!store.selected()">
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
          (send)="store.send($event)"
          (retry)="store.retry($event)"
          (loadEarlier)="store.loadEarlier()"
        />
      } @else {
        <div class="welcome">
          <h2>Select a conversation</h2>
          <p>Your SurePlace messages and booking updates will appear here.</p>
        </div>
      }
    </section>
  </main>`,
  styles: [
    `
      :host {
        display: block;
      }
      .messages-shell {
        height: calc(100vh - 150px);
        min-height: 560px;
        display: grid;
        grid-template-columns: 36% 64%;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        overflow: hidden;
        background: #fff;
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
      @media (max-width: 760px) {
        .messages-shell {
          display: block;
          height: calc(100vh - 170px);
          border-radius: 0;
        }
        .thread-open .list-pane {
          display: none;
        }
        .messages-shell:not(.thread-open) .thread-pane {
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

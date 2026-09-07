import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Message } from '../../core/models/messaging.models';
@Component({
  selector: 'sp-message-bubble',
  standalone: true,
  imports: [DatePipe],
  template: `<li
    [class.mine]="message().is_mine"
    [class.system]="system()"
    [class.failed]="message().failed"
  >
    @if (system()) {
      <div class="system-card">
        <strong>{{ workflowLabel() }}</strong>
        <p>{{ body() }}</p>
        <time>{{ message().created_at | date: 'shortTime' }}</time>
      </div>
    } @else {
      <div class="bubble">
        <p>{{ body() }}</p>
        <footer>
          <time>{{ message().created_at | date: 'shortTime' }}</time>
          @if (message().pending) {
            <span>Sending…</span>
          }
          @if (message().failed) {
            <button type="button" (click)="retry.emit()">Failed · Retry</button>
          }
        </footer>
      </div>
    }
  </li>`,
  styles: [
    `
      li {
        display: flex;
        margin: 0.45rem 0;
      }
      .bubble {
        max-width: min(72%, 560px);
        padding: 0.65rem 0.8rem;
        background: #eef3f2;
        border-radius: 0.8rem 0.8rem 0.8rem 0.2rem;
      }
      .mine {
        justify-content: flex-end;
      }
      .mine .bubble {
        background: var(--teal);
        color: #fff;
        border-radius: 0.8rem 0.8rem 0.2rem 0.8rem;
      }
      .bubble p,
      .system-card p {
        white-space: pre-wrap;
        margin: 0;
      }
      .bubble footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 0.25rem;
        font-size: 0.68rem;
        opacity: 0.72;
      }
      .bubble button {
        border: 0;
        background: none;
        color: inherit;
        text-decoration: underline;
      }
      .system {
        justify-content: center;
      }
      .system-card {
        max-width: 75%;
        text-align: center;
        background: #fff8e8;
        border: 1px solid #ecddb8;
        border-radius: 0.6rem;
        padding: 0.55rem 1rem;
        color: #59615f;
      }
      .system-card time {
        font-size: 0.68rem;
      }
      .failed .bubble {
        outline: 2px solid #b94a48;
      }
    `,
  ],
})
export class MessageBubbleComponent {
  message = input.required<Message>();
  retry = output<void>();
  system() {
    return (
      !this.message().sender ||
      ['SYSTEM', 'VIEWING_REQUEST', 'VIEWING_UPDATE'].includes(this.message().message_type)
    );
  }
  body() {
    return this.message().deleted_at ? 'This message was removed.' : this.message().body;
  }
  workflowLabel() {
    return this.message().message_type.startsWith('VIEWING')
      ? 'Viewing update'
      : 'SurePlace update';
  }
}

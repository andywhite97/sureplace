import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'sp-message-composer',
  standalone: true,
  imports: [FormsModule],
  template: `<form (ngSubmit)="submit()">
      <label class="sr-only" for="message-body">Write a message</label
      ><textarea
        id="message-body"
        [(ngModel)]="body"
        name="body"
        rows="1"
        maxlength="5000"
        placeholder="Write a message…"
        (keydown)="keydown($event)"
      ></textarea
      ><button type="submit" [disabled]="disabled() || !body().trim()" aria-label="Send message">
        Send
      </button>
    </form>
    <small>Enter to send · Shift+Enter for a new line</small>`,
  styles: [
    `
      form {
        display: flex;
        gap: 0.6rem;
        align-items: end;
      }
      textarea {
        flex: 1;
        resize: none;
        max-height: 130px;
        padding: 0.75rem;
        border: 1px solid var(--line);
        border-radius: 0.7rem;
        font: inherit;
      }
      button {
        min-height: 44px;
        border: 0;
        border-radius: 0.6rem;
        background: var(--teal);
        color: #fff;
        padding: 0.7rem 1rem;
        font-weight: 800;
      }
      button:disabled {
        opacity: 0.45;
      }
      small {
        display: block;
        color: var(--slate);
        margin-top: 0.3rem;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
    `,
  ],
})
export class MessageComposerComponent {
  disabled = input(false);
  sent = output<string>();
  body = signal('');
  submit() {
    const text = this.body().trim();
    if (!text || this.disabled()) return;
    this.sent.emit(text);
    this.body.set('');
  }
  keydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    }
  }
}

import { Component, HostListener, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { StayDetail } from '../../../core/models/listing.models';
import { StaysApiService } from '../../../core/api/stays-api.service';
import { MessagingApiService } from '../../../core/api/messaging-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'sp-stay-contact',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<aside>
      <p class="label">Stay contact</p>
      <h2>{{ stay().name }}</h2>
      @if (stay().agency || stay().agent) {
        <p class="managed-by">{{ stay().agency || stay().agent }}</p>
      }
      <button class="primary" type="button" (click)="message()">
        <i class="fa-regular fa-message" aria-hidden="true"></i> Message on SurePlace
      </button>
      @if (whatsapp()) {
        <a [href]="whatsapp()" target="_blank" rel="noopener">
          <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp
        </a>
      }
      @if (stay().phone) {
        <a [href]="'tel:' + stay().phone">
          <i class="fa-solid fa-phone" aria-hidden="true"></i> Call {{ stay().phone }}
        </a>
      }
      <div class="safety">
        <strong>Book with confidence</strong>
        <p>
          Confirm booking details with the host and keep important communication on SurePlace where
          possible.
        </p>
      </div>
      <button class="report" type="button" (click)="openReport()">Report stay</button>
    </aside>
    @if (reportOpen()) {
      <div class="backdrop" (click)="reportOpen.set(false)">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-stay-title"
          (click)="$event.stopPropagation()"
        >
          <button class="close" type="button" aria-label="Close" (click)="reportOpen.set(false)">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
          <h2 id="report-stay-title">Report this stay</h2>
          @if (success()) {
            <p role="status">Thanks. Your report has been submitted for review.</p>
          } @else {
            <form [formGroup]="form" (ngSubmit)="report()">
              <label
                >Reason<select formControlName="reason">
                  <option value="SCAM">Scam or fake listing</option>
                  <option value="INCORRECT">Incorrect information</option>
                  <option value="DUPLICATE">Duplicate</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                  <option value="INAPPROPRIATE">Inappropriate content</option>
                  <option value="OTHER">Other</option>
                </select></label
              ><label
                >Details<textarea rows="4" maxlength="1000" formControlName="details"></textarea>
              </label>
              @if (error()) {
                <p role="alert">{{ error() }}</p>
              }
              <button class="primary" type="submit" [disabled]="busy()">Submit report</button>
            </form>
          }
        </section>
      </div>
    }`,
  styles: [
    `
      aside {
        display: grid;
        gap: 0.75rem;
        padding: 1.2rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
        box-shadow: 0 14px 32px rgba(21, 43, 42, 0.05);
      }
      h2,
      p {
        margin: 0;
      }
      .label {
        color: var(--slate);
        font-size: 0.75rem;
        text-transform: uppercase;
        font-weight: 900;
      }
      .managed-by {
        color: var(--slate);
      }
      button,
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        padding: 0.72rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        text-align: center;
        font-weight: 900;
        text-decoration: none;
        background: #fff;
        color: var(--midnight);
      }
      .primary {
        background: var(--teal);
        color: #fff;
        border: 0;
      }
      .safety {
        padding: 0.85rem;
        background: var(--mist);
        border-radius: 0.85rem;
      }
      .safety p {
        color: var(--slate);
        margin-top: 0.25rem;
      }
      .report {
        border: 0;
        color: #a33;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 90;
        background: #102d2d99;
        display: grid;
        place-items: center;
        padding: 1rem;
      }
      .backdrop section {
        position: relative;
        width: min(430px, 100%);
        background: #fff;
        border-radius: 1rem;
        padding: 1.4rem;
      }
      .close {
        position: absolute;
        right: 0.6rem;
        top: 0.6rem;
        width: 2.25rem;
        height: 2.25rem;
        padding: 0;
      }
      .backdrop form,
      .backdrop label {
        display: grid;
        gap: 0.7rem;
      }
      .backdrop input,
      .backdrop select,
      .backdrop textarea {
        padding: 0.6rem;
        border: 1px solid var(--line);
        border-radius: 0.5rem;
      }
    `,
  ],
})
export class StayContactComponent {
  stay = input.required<StayDetail>();
  dates = input<{ check_in?: string; check_out?: string }>({});
  private api = inject(StaysApiService);
  private messaging = inject(MessagingApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  reportOpen = signal(false);
  busy = signal(false);
  success = signal(false);
  error = signal('');
  form = this.fb.nonNullable.group({
    reason: ['SCAM', Validators.required],
    details: ['', [Validators.maxLength(1000)]],
  });

  returnUrl() {
    const dates = this.dates();
    const query = new URLSearchParams();
    if (dates.check_in) query.set('check_in', dates.check_in);
    if (dates.check_out) query.set('check_out', dates.check_out);
    return `/stays/${this.stay().slug}${query.size ? '?' + query : ''}`;
  }

  requireAuth() {
    if (this.auth.isAuthenticated()) return true;
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl() } });
    return false;
  }

  message() {
    if (!this.requireAuth()) return;
    this.busy.set(true);
    this.messaging
      .createForStay(this.stay().id, `Hi, I'm interested in ${this.stay().name}.`)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (conversation) => void this.router.navigate(['/account/messages', conversation.id]),
        error: () => this.toast.show('Could not start the conversation.', 'error'),
      });
  }

  whatsapp() {
    const number = this.stay().whatsapp_number?.replace(/\D/g, '');
    if (!number) return null;
    const dates = this.dates();
    let text = `Hi, I'm interested in ${this.stay().name} on SurePlace.`;
    if (dates.check_in && dates.check_out)
      text += ` Dates: ${dates.check_in} to ${dates.check_out}.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  openReport() {
    if (this.requireAuth()) {
      this.success.set(false);
      this.error.set('');
      this.reportOpen.set(true);
    }
  }

  report() {
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.api
      .report(this.stay().id, value.reason, value.details)
      .pipe(
        catchError((error) => {
          this.error.set(error?.error?.message || 'Could not submit the report.');
          return of(null);
        }),
        finalize(() => this.busy.set(false)),
      )
      .subscribe((result) => {
        if (result) this.success.set(true);
      });
  }

  @HostListener('document:keydown.escape')
  close() {
    this.reportOpen.set(false);
  }
}

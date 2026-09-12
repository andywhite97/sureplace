import {
  AfterViewChecked,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
  inject,
  input,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { PropertyDetail } from '../../../core/models/listing.models';
import { AuthService } from '../../../core/auth/auth.service';
import { PropertyActionsApiService } from '../../../core/api/property-actions-api.service';
import { MessagingApiService } from '../../../core/api/messaging-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { VerificationBadgeComponent } from '../../../shared/ui/verification-badge.component';
@Component({
  selector: 'sp-property-contact',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, VerificationBadgeComponent],
  template: `<aside class="contact">
      <p class="label">Advertised by</p>
      <div class="advertiser">
        <div class="avatar" aria-hidden="true">
          @if (property().agency?.logo) {
            <img [src]="property().agency!.logo!" [alt]="property().agency!.name" />
          } @else {
            <i
              class="fa-solid"
              [class.fa-building]="property().agency"
              [class.fa-user]="!property().agency"
            ></i>
          }
        </div>
        <div>
          <h2>{{ property().agent?.name || property().agency?.name || 'Property owner' }}</h2>
          <p>{{ advertiserRole() }}</p>
          @if (property().agency && property().agent) {
            <small>Listed by {{ property().agent!.name }} &middot; Agent</small>
          }
        </div>
      </div>
      <div class="badges">
        @for (badge of property().verification_badges; track badge.type) {
          @if (badge.type !== 'PROPERTY') {
            <sp-verification-badge [label]="badge.label" />
          }
        }
      </div>
      <button class="primary" type="button" (click)="message()">Message on SurePlace</button>
      @if (whatsapp()) {
        <a class="secondary" [href]="whatsapp()" target="_blank" rel="noopener">WhatsApp</a>
      }
      <button class="secondary" type="button" (click)="openViewing()">Request Viewing</button>
      <div class="safety">
        <strong>Stay safe</strong>
        <p>Never send money before confirming the property and the advertiser.</p>
      </div>
      <button class="report" type="button" (click)="openReport()">Report listing</button>
    </aside>
    @if (modal()) {
      <div
        #overlay
        class="backdrop property-contact-overlay"
        data-sureplace-overlay="property-contact"
        (click)="close()"
      >
        <section
          #dialog
          class="dialog"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="modal() + '-title'"
          (click)="$event.stopPropagation()"
        >
          <button class="close" type="button" aria-label="Close" (click)="close()">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
          @if (modal() === 'viewing') {
            <h2 id="viewing-title">Request a viewing</h2>
            @if (success()) {
              <div role="status">
                <h3>Viewing request sent</h3>
                <p>The advertiser still needs to confirm it.</p>
                <a routerLink="/account/viewings">View request</a> ·
                <a routerLink="/account/messages">Open messages</a>
              </div>
            } @else {
              <form [formGroup]="viewingForm" (ngSubmit)="submitViewing()">
                <label>Preferred date<input type="date" formControlName="requested_date" /></label
                ><label>Preferred time<input type="time" formControlName="requested_time" /></label
                ><label
                  >Alternative date<input type="date" formControlName="alternative_date" /></label
                ><label
                  >Alternative time<input type="time" formControlName="alternative_time" /></label
                ><label
                  >Notes<textarea rows="3" maxlength="1000" formControlName="notes"></textarea>
                </label>
                @if (error()) {
                  <p class="error" role="alert">{{ error() }}</p>
                }
                <button class="primary" type="submit" [disabled]="viewingForm.invalid || busy()">
                  Send request
                </button>
              </form>
            }
          } @else {
            <h2 id="report-title">Report this listing</h2>
            @if (success()) {
              <p role="status">Thanks. Your report has been submitted for review.</p>
            } @else {
              <form [formGroup]="reportForm" (ngSubmit)="submitReport()">
                <label
                  >Reason<select formControlName="reason">
                    <option value="SCAM">Scam or fake listing</option>
                    <option value="INCORRECT">Incorrect information or wrong price</option>
                    <option value="DUPLICATE">Duplicate</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                    <option value="INAPPROPRIATE">
                      Misleading photos or inappropriate content
                    </option>
                    <option value="OTHER">Other</option>
                  </select></label
                ><label
                  >Details<textarea rows="4" maxlength="1000" formControlName="details"></textarea>
                </label>
                @if (error()) {
                  <p class="error" role="alert">{{ error() }}</p>
                }
                <button class="primary" type="submit" [disabled]="reportForm.invalid || busy()">
                  Submit report
                </button>
              </form>
            }
          }
        </section>
      </div>
    }`,
  styleUrl: './property-contact.component.scss',
})
export class PropertyContactComponent implements AfterViewChecked {
  property = input.required<PropertyDetail>();
  @ViewChild('overlay') private overlay?: ElementRef<HTMLElement>;
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  private auth = inject(AuthService);
  private api = inject(PropertyActionsApiService);
  private messaging = inject(MessagingApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private renderer = inject(Renderer2);
  private destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private overlayRoot?: HTMLElement;
  private previousBodyOverflow = '';
  private previousFocus: HTMLElement | null = null;
  private overlayAttached = false;
  modal = signal<'viewing' | 'report' | null>(null);
  busy = signal(false);
  success = signal(false);
  error = signal('');
  viewingForm = this.fb.nonNullable.group({
    requested_date: ['', Validators.required],
    requested_time: ['', Validators.required],
    alternative_date: [''],
    alternative_time: [''],
    notes: ['', [Validators.maxLength(1000)]],
  });
  reportForm = this.fb.nonNullable.group({
    reason: ['SCAM', Validators.required],
    details: ['', [Validators.maxLength(1000)]],
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.teardownOverlay());
  }

  ngAfterViewChecked() {
    this.attachOverlay();
  }
  whatsapp() {
    const number = this.property().agent?.whatsapp_number?.replace(/\D/g, '');
    if (!number) return null;
    const text = `Hi, I'm interested in ${this.property().public_id} - ${this.property().title} on SurePlace.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }
  advertiserRole() {
    if (this.property().agency && !this.property().agent) return 'Real estate agency';
    if (this.property().agent) return 'Property agent';
    return 'Property owner';
  }
  private requireAuth() {
    if (this.auth.isAuthenticated()) return true;
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/properties/${this.property().slug}` },
    });
    return false;
  }
  message() {
    if (!this.requireAuth()) return;
    this.busy.set(true);
    this.messaging
      .createForProperty(this.property().id, `Hi, I'm interested in ${this.property().public_id}.`)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (c) => void this.router.navigate(['/account/messages', c.id]),
        error: () => this.toast.show('Could not start the conversation.', 'error'),
      });
  }
  openViewing() {
    if (this.requireAuth()) {
      this.reset();
      this.openModal('viewing');
    }
  }
  openReport() {
    if (this.requireAuth()) {
      this.reset();
      this.openModal('report');
    }
  }
  submitViewing() {
    if (this.viewingForm.invalid) return;
    const v = this.viewingForm.getRawValue();
    if (Boolean(v.alternative_date) !== Boolean(v.alternative_time)) {
      this.error.set('Provide both an alternative date and time.');
      return;
    }
    if (new Date(`${v.requested_date}T${v.requested_time}`) <= new Date()) {
      this.error.set('Choose a future date and time.');
      return;
    }
    this.submit(this.api.viewing(this.property().id, v), 'Viewing request sent');
  }
  submitReport() {
    if (this.reportForm.invalid) return;
    const v = this.reportForm.getRawValue();
    this.submit(this.api.report(this.property().id, v.reason, v.details), 'Report submitted');
  }
  private submit(request: ReturnType<PropertyActionsApiService['report']>, toast: string) {
    this.busy.set(true);
    this.error.set('');
    request
      .pipe(
        catchError((e) => {
          this.error.set(e?.error?.message || 'Please check the details and try again.');
          return of(null);
        }),
        finalize(() => this.busy.set(false)),
      )
      .subscribe((value) => {
        if (value) {
          this.success.set(true);
          this.toast.show(toast, 'success');
        }
      });
  }
  close() {
    this.teardownOverlay();
    this.modal.set(null);
  }
  private reset() {
    this.success.set(false);
    this.error.set('');
  }
  @HostListener('document:keydown.escape') escape() {
    if (this.modal()) this.close();
  }
  @HostListener('document:keydown.tab', ['$event']) trapFocus(event: Event) {
    if (!this.modal() || !this.isBrowser || !this.overlay?.nativeElement) return;
    const keyboardEvent = event as KeyboardEvent;
    const focusable = this.focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      this.dialog?.nativeElement.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (keyboardEvent.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private openModal(kind: 'viewing' | 'report') {
    if (this.isBrowser) this.previousFocus = this.document.activeElement as HTMLElement | null;
    this.modal.set(kind);
  }

  private attachOverlay() {
    if (!this.isBrowser || !this.modal() || this.overlayAttached || !this.overlay?.nativeElement)
      return;
    const root = this.ensureOverlayRoot();
    root.appendChild(this.overlay.nativeElement);
    this.overlayAttached = true;
    this.lockScroll();
    queueMicrotask(() => this.focusDialog());
  }

  private ensureOverlayRoot() {
    const existing = this.document.getElementById('sureplace-overlay-root');
    if (existing) {
      this.overlayRoot = existing;
      return existing;
    }
    const root = this.renderer.createElement('div') as HTMLElement;
    this.renderer.setAttribute(root, 'id', 'sureplace-overlay-root');
    this.renderer.appendChild(this.document.body, root);
    this.overlayRoot = root;
    return root;
  }

  private lockScroll() {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  private teardownOverlay() {
    if (!this.isBrowser) return;
    if (this.overlayAttached) {
      this.document.body.style.overflow = this.previousBodyOverflow;
      this.overlayAttached = false;
    }
    if (this.previousFocus?.isConnected) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }

  private focusDialog() {
    if (!this.modal()) return;
    const first = this.focusableElements()[0];
    (first || this.dialog?.nativeElement)?.focus();
  }

  private focusableElements() {
    const overlay = this.overlay?.nativeElement;
    if (!overlay) return [];
    return Array.from(
      overlay.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null || element === this.document.activeElement);
  }
}

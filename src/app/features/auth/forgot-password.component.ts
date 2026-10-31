import { SuriGuideComponent } from '../../shared/ui/suri-guide.component';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { SeoService } from '../../core/services/seo.service';
import { normalizeApiError } from '../../core/api/error-normalizer';

@Component({
  standalone: true,
  imports: [SuriGuideComponent, ReactiveFormsModule, RouterLink],
  template: `<main class="auth-page">
    <section class="auth-card" aria-labelledby="recovery-title">
      <sp-suri-guide
        size="small"
        pose="support"
        variant="support"
        message="Need help getting back in? I've got you."
      />
      <h1 id="recovery-title">{{ sent() ? 'Check your inbox' : 'Reset your password' }}</h1>
      @if (sent()) {
        <div class="auth-confirmation" role="status">
          <p>If an account exists for that email, we'll send password reset instructions.</p>
          <p>
            Check your spam folder too. For more guidance, visit the
            <a routerLink="/help">Help Centre</a>.
          </p>
        </div>
      } @else {
        <p>Enter your email and we'll send instructions to help you access your account.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-busy]="busy()">
          <label for="recovery-email">Email address</label
          ><input
            id="recovery-email"
            type="email"
            formControlName="email"
            placeholder="you@example.com"
            autocomplete="email"
            [attr.aria-invalid]="form.controls.email.touched && form.controls.email.invalid"
            aria-describedby="recovery-email-error"
          />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <small id="recovery-email-error" class="field-error"
              >Enter a valid email address.</small
            >
          }
          @if (error()) {
            <p class="api-error auth-error" role="alert">{{ error() }}</p>
          }
          <button class="auth-submit" type="submit" [disabled]="busy()">
            @if (busy()) {
              <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
            }
            {{ busy() ? 'Sending…' : 'Send reset link' }}
          </button>
        </form>
      }
      <a class="auth-back" routerLink="/login">Back to login</a>
    </section>
  </main>`,
  styleUrl: './auth-pages.scss',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);
  private seo = inject(SeoService);
  sent = signal(false);
  busy = signal(false);
  error = signal('');
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  constructor() {
    this.seo.privatePage(
      'Reset your SurePlace password',
      'Request a secure SurePlace password reset link.',
    );
  }
  submit() {
    this.form.markAllAsTouched();
    if (!this.form.valid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.requestReset(this.form.getRawValue().email).subscribe({
      next: () => {
        this.busy.set(false);
        this.sent.set(true);
      },
      error: (error) => {
        this.busy.set(false);
        this.error.set(normalizeApiError(error).message);
      },
    });
  }
}

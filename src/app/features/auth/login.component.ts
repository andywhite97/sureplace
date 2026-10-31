import { SuriGuideComponent } from '../../shared/ui/suri-guide.component';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingCheckoutStateService } from '../../core/services/booking-checkout-state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { ToastService } from '../../core/services/toast.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  standalone: true,
  imports: [SuriGuideComponent, ReactiveFormsModule, RouterLink],
  template: `<main class="login-page">
    <section class="login-shell" aria-label="Log in to SurePlace">
      <aside class="welcome-panel" aria-labelledby="welcome-brand-title">
        <div class="welcome-copy">
          <p class="eyebrow">A brighter way to property</p>
          <h2 id="welcome-brand-title">Suri is here to help you find your SurePlace.</h2>
          <p>A simpler, safer and more trusted way to buy, rent or stay in Eswatini.</p>
        </div>
        <sp-suri-guide class="desktop-suri" variant="illustration" pose="welcome" />
        <p class="brand-promise">
          <i class="fa-solid fa-heart" aria-hidden="true"></i> Simple <span>·</span> Trusted
          <span>·</span> Always on your side
        </p>
      </aside>

      <section class="form-panel" aria-labelledby="login-title">
        <sp-suri-guide
          class="mobile-suri"
          size="small"
          message="Welcome back! Let's find your next place."
        />
        <header>
          <p class="eyebrow">Your SurePlace account</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to continue your SurePlace journey.</p>
        </header>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-busy]="busy()">
          <div class="field" [class.invalid]="fieldError('email')">
            <label for="email">Email address</label>
            <span class="input-wrap"
              ><i class="fa-solid fa-envelope" aria-hidden="true"></i>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                formControlName="email"
                [attr.aria-invalid]="fieldError('email') ? 'true' : null"
                aria-describedby="email-error"
              />
            </span>
            <small id="email-error" class="field-error" aria-live="polite">{{
              fieldError('email')
            }}</small>
          </div>

          <div class="field" [class.invalid]="fieldError('password')">
            <label for="password">Password</label>
            <span class="input-wrap"
              ><i class="fa-solid fa-lock" aria-hidden="true"></i>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                formControlName="password"
                [attr.aria-invalid]="fieldError('password') ? 'true' : null"
                aria-describedby="password-error"
              />
              <button
                class="password-toggle"
                type="button"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                (click)="showPassword.set(!showPassword())"
              >
                <i
                  [class]="showPassword() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                  aria-hidden="true"
                ></i>
              </button>
            </span>
            <small id="password-error" class="field-error" aria-live="polite">{{
              fieldError('password')
            }}</small>
          </div>

          <div class="options-row">
            <label class="remember"
              ><input type="checkbox" formControlName="remember" /> <span>Remember me</span></label
            >
            <a routerLink="/forgot-password">Forgot password?</a>
          </div>

          @if (error()) {
            <p class="api-error" role="alert">{{ error() }}</p>
          }
          @if (verificationRequired()) {
            <div class="verification-help">
              <a
                routerLink="/verify-email/pending"
                [queryParams]="{ email: form.controls.email.value }"
                >Go to email verification</a
              >
              <button
                type="button"
                [disabled]="resending() || !form.controls.email.value"
                (click)="resendVerification()"
              >
                {{ resending() ? 'Sending…' : 'Resend verification email' }}
              </button>
              @if (resendFeedback()) {
                <small role="status">{{ resendFeedback() }}</small>
              }
            </div>
          }

          <button class="submit-button" type="submit" [disabled]="busy()">
            @if (busy()) {
              <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Logging in...
            } @else {
              Log in <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            }
          </button>
          <p class="create">
            Don't have an account?
            <a routerLink="/register" [queryParams]="{ returnUrl: routeReturnUrl() }">Create one</a>
          </p>
          <p class="form-note">
            <i class="fa-solid fa-shield-halved" aria-hidden="true"></i> A simpler, safer place to
            find home.
          </p>
        </form>
      </section>
    </section>
  </main>`,
  styleUrls: ['./auth-pages.scss', './login.component.scss'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private seo = inject(SeoService);
  showPassword = signal(false);
  busy = signal(false);
  error = signal('');
  verificationRequired = signal(false);
  resending = signal(false);
  resendFeedback = signal('');
  fieldErrors = signal<Record<string, string>>({});
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  constructor() {
    this.seo.privatePage('Log in to SurePlace', 'Access your SurePlace account.');
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.controls.email.setValue(email);
  }

  submit() {
    if (this.busy() || !this.validate()) return;
    this.busy.set(true);
    this.error.set('');
    this.verificationRequired.set(false);
    this.resendFeedback.set('');
    const { email, password, remember } = this.form.getRawValue();
    this.auth
      .login({ email, password }, remember)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.toast.show('Welcome back.', 'success');
          void this.router.navigateByUrl(this.loginRedirectUrl());
        },
        error: (e) => this.handleError(e),
      });
  }

  resendVerification() {
    const email = this.form.controls.email.value.trim();
    if (!email || this.resending()) return;
    this.resending.set(true);
    this.resendFeedback.set('');
    this.auth
      .resendVerification(email)
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: (response) =>
          this.resendFeedback.set(
            response.detail || 'If the account needs verification, a new email is on its way.',
          ),
        error: () =>
          this.resendFeedback.set(
            'We couldn’t resend the email right now. Please try again shortly.',
          ),
      });
  }

  fieldError(field: 'email' | 'password') {
    return this.fieldErrors()[field] || '';
  }

  private validate() {
    this.form.controls.email.markAsTouched();
    this.form.controls.password.markAsTouched();
    const errors: Record<string, string> = {};
    if (this.form.controls.email.hasError('required'))
      errors['email'] = 'Email address is required.';
    else if (this.form.controls.email.hasError('email'))
      errors['email'] = 'Enter a valid email address.';
    if (this.form.controls.password.hasError('required'))
      errors['password'] = 'Password is required.';
    this.fieldErrors.set(errors);
    return !Object.keys(errors).length;
  }

  private handleError(error: unknown) {
    const normalized = normalizeApiError(error);
    const http = error instanceof HttpErrorResponse ? error : null;
    if (
      normalized.code === 'email_not_verified' ||
      normalized.code === 'email_verification_required'
    ) {
      this.error.set('Verify your email before logging in.');
      this.verificationRequired.set(true);
    } else if (
      normalized.code === 'invalid_credentials' ||
      normalized.code === 'token_not_found' ||
      http?.status === 401
    ) {
      this.error.set('The email or password you entered is incorrect.');
    } else if (normalized.code === 'network_error' || http?.status === 0) {
      this.error.set('Unable to log in right now. Please check your connection and try again.');
    } else {
      this.error.set('We couldn’t sign you in right now. Please try again.');
    }
  }

  private loginRedirectUrl() {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');
    const safeReturnUrl =
      value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
        ? value
        : '';
    if (this.auth.user()?.is_staff && (!safeReturnUrl || safeReturnUrl === '/account'))
      return '/staff';
    this.bookingIntent.restore();
    return (
      safeReturnUrl ||
      (!value && this.bookingIntent.state() ? this.bookingIntent.url() : '/account')
    );
  }
  routeReturnUrl() {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }
  private bookingIntent = inject(BookingCheckoutStateService);
}

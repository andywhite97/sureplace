import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { ToastService } from '../../core/services/toast.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main class="login-page">
    <section class="login-shell" aria-label="Log in to SurePlace">
      <aside class="welcome-panel" aria-labelledby="welcome-brand-title">
        <div class="welcome-copy">
          <p class="eyebrow">A brighter way to property</p>
          <h1 id="welcome-brand-title">Suri is here to help you find your SurePlace.</h1>
          <p>A simpler, safer and more trusted way to buy, rent or stay in Eswatini.</p>
        </div>
        <div class="mascot-stage" aria-hidden="true">
          <span class="speech-bubble">Welcome back!</span>
          <div class="suri-crop">
            <img
              src="/suri-brand-reference.png"
              alt=""
              width="1122"
              height="1400"
              fetchpriority="high"
            />
          </div>
        </div>
        <p class="brand-promise">
          <i class="fa-solid fa-heart" aria-hidden="true"></i> Simple <span>·</span> Trusted
          <span>·</span> Always on your side
        </p>
      </aside>

      <section class="form-panel" aria-labelledby="login-title">
        <header>
          <p class="eyebrow">Your SurePlace account</p>
          <h2 id="login-title">Welcome back</h2>
          <p>Log in to your SurePlace account.</p>
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
          <p class="create">Don't have an account? <a routerLink="/register">Create one</a></p>
          <p class="form-note">
            <i class="fa-solid fa-shield-halved" aria-hidden="true"></i> A simpler, safer place to
            find home.
          </p>
        </form>
      </section>
    </section>
  </main>`,
  styleUrl: './auth-pages.scss',
  styles: [
    `
      :host {
        display: block;
      }
      .login-page {
        min-height: calc(100dvh - var(--app-header-height));
        display: grid;
        place-items: center;
        padding: clamp(1rem, 3vw, 2.5rem);
        background:
          radial-gradient(
            ellipse at 18% 35%,
            color-mix(in srgb, var(--teal) 8%, white),
            transparent 52%
          ),
          var(--mist);
      }
      .login-shell {
        width: min(1080px, 100%);
        min-height: 610px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(390px, 0.88fr);
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: white;
        box-shadow: var(--shadow);
        transform: translateY(-clamp(8px, 2vh, 18px));
      }
      .welcome-panel {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-width: 0;
        overflow: hidden;
        padding: clamp(1.5rem, 4vw, 3rem);
        background: linear-gradient(145deg, #e9faf6 0%, #f4fbf9 58%, #e2f6f1 100%);
      }
      .welcome-copy {
        position: relative;
        z-index: 1;
        max-width: 370px;
        margin-top: 2rem;
      }
      .eyebrow {
        margin: 0 0 0.55rem;
        color: var(--teal);
        font-size: 0.75rem;
        font-weight: 850;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }
      .welcome-copy h1 {
        margin: 0;
        color: var(--midnight);
        font: 800 clamp(1.85rem, 3vw, 2.55rem)/1.16 var(--font-heading);
      }
      .welcome-copy > p:last-child,
      .form-panel header > p:last-child {
        margin: 0.8rem 0 0;
        color: var(--slate);
        line-height: 1.65;
      }
      .mascot-stage {
        position: relative;
        align-self: center;
        width: min(100%, 390px);
        margin: -1.5rem 0 -1rem;
      }
      .suri-crop {
        position: relative;
        width: min(100%, 360px);
        aspect-ratio: 4/5;
        margin: auto;
        overflow: hidden;
      }
      .suri-crop img {
        position: absolute;
        display: block;
        width: 263%;
        max-width: none;
        height: auto;
        left: -9%;
        top: -52.5%;
        object-fit: contain;
      }
      .speech-bubble {
        position: absolute;
        z-index: 2;
        right: 3%;
        top: 12%;
        padding: 0.65rem 0.9rem;
        border: 1px solid color-mix(in srgb, var(--teal) 22%, white);
        border-radius: 1rem 1rem 1rem 0.2rem;
        background: white;
        color: var(--midnight);
        font-weight: 750;
        box-shadow: 0 6px 20px #153a3112;
      }
      .brand-promise {
        margin: 1rem 0 0;
        color: #41645e;
        font-size: 0.76rem;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .brand-promise i {
        color: var(--teal);
        margin-right: 0.35rem;
      }
      .brand-promise span {
        padding: 0 0.3rem;
        color: #96b9b0;
      }
      .form-panel {
        align-self: center;
        width: min(100%, 500px);
        margin: auto;
        padding: clamp(2rem, 5vw, 4rem);
      }
      .form-panel header .eyebrow {
        margin-bottom: 0.65rem;
      }
      .form-panel h2 {
        margin: 0;
        color: var(--midnight);
        font: 800 clamp(1.85rem, 3vw, 2.25rem)/1.2 var(--font-heading);
      }
      .form-panel header > p:last-child {
        margin-top: 0.4rem;
      }
      .form-panel form {
        display: grid;
        gap: 1rem;
        margin-top: 2rem;
      }
      .field {
        display: grid;
        gap: 0.45rem;
      }
      .field > label {
        color: var(--midnight);
        font-size: 0.88rem;
        font-weight: 780;
      }
      .input-wrap {
        display: flex;
        align-items: center;
        min-height: 52px;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        transition:
          border-color var(--transition),
          box-shadow var(--transition);
      }
      .input-wrap > i {
        width: 46px;
        flex: 0 0 46px;
        text-align: center;
        color: var(--teal);
      }
      .input-wrap input {
        width: 100%;
        min-width: 0;
        min-height: 50px;
        border: 0 !important;
        border-radius: 0;
        padding: 0.72rem 0.55rem 0.72rem 0 !important;
        font: inherit;
        font-size: 16px;
      }
      .input-wrap:focus-within {
        border-color: var(--teal);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--teal) 17%, transparent);
      }
      .field.invalid .input-wrap {
        border-color: var(--danger);
      }
      .field-error {
        min-height: 1rem;
        color: var(--danger);
        font-size: 0.78rem;
        font-weight: 500;
      }
      .password-toggle {
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        border: 0;
        background: transparent;
        color: var(--slate);
        cursor: pointer;
      }
      .password-toggle:hover {
        color: var(--teal);
      }
      .options-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
        margin: 0.1rem 0;
      }
      .remember {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        color: var(--slate);
        font-size: 0.86rem;
      }
      .remember input {
        width: 18px;
        height: 18px;
        accent-color: var(--teal);
      }
      .options-row a,
      .create a,
      .verification-help a {
        color: var(--teal);
        font-size: 0.86rem;
        font-weight: 800;
        text-decoration: none;
      }
      .options-row a:hover,
      .create a:hover,
      .verification-help a:hover {
        text-decoration: underline;
      }
      .api-error {
        margin: 0;
        padding: 0.8rem 0.9rem;
        border: 1px solid color-mix(in srgb, var(--danger) 28%, white);
        border-radius: 0.65rem;
        background: #fff7f7;
        color: var(--danger);
        font-size: 0.88rem;
        line-height: 1.5;
      }
      .verification-help {
        display: grid;
        justify-items: start;
        gap: 0.5rem;
        padding: 0.85rem;
        border: 1px solid var(--line);
        border-radius: 0.7rem;
        background: var(--mist);
      }
      .verification-help button {
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--teal);
        font: inherit;
        font-size: 0.83rem;
        font-weight: 750;
        text-decoration: underline;
        cursor: pointer;
      }
      .verification-help button:disabled {
        opacity: 0.6;
        cursor: wait;
      }
      .verification-help small {
        color: var(--slate);
      }
      .submit-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        width: 100%;
        min-height: 52px;
        margin-top: 0.2rem;
        padding: 0.75rem 1rem;
        border: 0;
        border-radius: var(--radius-sm);
        background: var(--teal);
        color: white;
        font: inherit;
        font-weight: 850;
        cursor: pointer;
        transition:
          transform var(--transition),
          box-shadow var(--transition),
          background var(--transition);
      }
      .submit-button:hover:not(:disabled) {
        transform: translateY(-1px);
        background: color-mix(in srgb, var(--teal) 88%, var(--midnight));
        box-shadow: 0 8px 18px color-mix(in srgb, var(--teal) 25%, transparent);
      }
      .submit-button:disabled {
        opacity: 0.7;
        cursor: wait;
      }
      .create {
        margin: 0.2rem 0 0;
        text-align: center;
        color: var(--slate);
        font-size: 0.88rem;
      }
      .form-note {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.45rem;
        margin: 1rem 0 0;
        color: var(--slate);
        font-size: 0.77rem;
      }
      .form-note i {
        color: var(--teal);
      }
      @media (max-width: 991px) and (min-width: 768px) {
        .login-shell {
          min-height: 570px;
          grid-template-columns: minmax(0, 0.82fr) minmax(360px, 1fr);
        }
        .welcome-panel {
          padding: 1.6rem;
        }
        .welcome-copy {
          margin-top: 1.5rem;
        }
        .welcome-copy h1 {
          font-size: 1.85rem;
        }
        .mascot-stage {
          width: 100%;
        }
        .form-panel {
          padding: 2rem;
        }
      }
      @media (max-width: 767px) {
        .login-page {
          display: block;
          min-height: 0;
          padding: 0.75rem 0.85rem 1.5rem;
        }
        .login-shell {
          display: flex;
          flex-direction: column;
          min-height: 0;
          border-radius: 18px;
          transform: none;
        }
        .welcome-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 1.1rem 1rem 0.7rem;
          text-align: center;
        }
        .mascot-stage {
          order: 1;
          width: 210px;
          max-width: 80%;
          margin: -0.65rem 0 -0.35rem;
        }
        .suri-crop {
          width: 100%;
          aspect-ratio: 4/5;
        }
        .suri-crop img {
          width: 263%;
          left: -9%;
          top: -52.5%;
        }
        .speech-bubble {
          top: 4%;
          right: -2%;
          padding: 0.4rem 0.55rem;
          font-size: 0.68rem;
        }
        .welcome-copy {
          order: 2;
          max-width: 420px;
          margin: 0;
        }
        .welcome-copy .eyebrow {
          font-size: 0.62rem;
        }
        .welcome-copy h1 {
          font-size: clamp(1.45rem, 6vw, 1.8rem);
        }
        .welcome-copy > p:last-child {
          font-size: 0.82rem;
          line-height: 1.45;
          margin-top: 0.45rem;
        }
        .brand-promise {
          order: 3;
          margin: 0.35rem 0 0.25rem;
          font-size: 0.58rem;
          letter-spacing: 0.06em;
        }
        .form-panel {
          width: 100%;
          padding: 1.4rem 1.2rem 1.5rem;
        }
        .form-panel h2 {
          font-size: 1.8rem;
        }
        .form-panel form {
          gap: 0.9rem;
          margin-top: 1.35rem;
        }
        .options-row {
          gap: 0.4rem 0.7rem;
        }
        .remember,
        .options-row a {
          font-size: 0.8rem;
        }
        .submit-button {
          min-height: 50px;
        }
        .form-note {
          margin-top: 0.7rem;
        }
      }
      @media (max-width: 390px) {
        .login-page {
          padding: 0.75rem 0.65rem 1rem;
        }
        .welcome-panel {
          padding: 0.9rem 0.85rem 0.55rem;
        }
        .mascot-stage {
          width: 180px;
          max-width: 70%;
          margin: -0.55rem 0 -0.3rem;
        }
        .welcome-copy h1 {
          font-size: 1.38rem;
        }
        .welcome-copy > p:last-child {
          font-size: 0.76rem;
        }
        .speech-bubble {
          right: -5%;
          font-size: 0.62rem;
        }
        .form-panel {
          padding: 1.2rem 1rem 1.3rem;
        }
        .form-panel form {
          gap: 0.8rem;
        }
        .options-row {
          align-items: flex-start;
        }
        .remember,
        .options-row a {
          font-size: 0.76rem;
        }
      }
    `,
  ],
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
    return safeReturnUrl || '/account';
  }
}

import { SuriGuideComponent } from '../../shared/ui/suri-guide.component';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { SeoService } from '../../core/services/seo.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SuriGuideComponent],
  template: `<main class="auth-page">
    <section class="auth-card">
      <sp-suri-guide size="small" pose="support" message="A fresh start for your account." />
      <h1>{{ done() ? 'You’re back on track' : 'Choose a new password' }}</h1>
      @if (done()) {
        <p role="status">Your password has been reset. Sign in with your new password.</p>
        <a class="auth-back" routerLink="/login">Log in</a>
      } @else {
        <p>Use at least eight characters and choose a password you do not use elsewhere.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-busy]="busy()">
          <label for="new-password">New password</label>
          <div class="password">
            <input
              id="new-password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="new_password"
              autocomplete="new-password"
              aria-describedby="new-password-error"
            /><button
              type="button"
              [attr.aria-label]="showPassword() ? 'Hide new password' : 'Show new password'"
              (click)="showPassword.set(!showPassword())"
            >
              <i
                [class]="showPassword() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                aria-hidden="true"
              ></i>
            </button>
          </div>
          @if (form.controls.new_password.touched && form.controls.new_password.invalid) {
            <small id="new-password-error" class="field-error">Use at least 8 characters.</small>
          }
          <label for="confirm-password">Confirm password</label>
          <div class="password">
            <input
              id="confirm-password"
              [type]="showConfirm() ? 'text' : 'password'"
              formControlName="confirm_password"
              autocomplete="new-password"
            /><button
              type="button"
              [attr.aria-label]="
                showConfirm() ? 'Hide password confirmation' : 'Show password confirmation'
              "
              (click)="showConfirm.set(!showConfirm())"
            >
              <i
                [class]="showConfirm() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                aria-hidden="true"
              ></i>
            </button>
          </div>
          @if (error()) {
            <p class="api-error auth-error" role="alert">{{ error() }}</p>
          }
          <button class="auth-submit" type="submit" [disabled]="busy()">
            {{ busy() ? 'Resetting…' : 'Reset password' }}
          </button>
        </form>
        <p class="auth-support">
          Need a new link? <a routerLink="/forgot-password">Request reset instructions</a>
        </p>
      }
    </section>
  </main>`,
  styleUrl: './auth-pages.scss',
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  done = signal(false);
  busy = signal(false);
  showPassword = signal(false);
  showConfirm = signal(false);
  error = signal('');
  form = this.fb.nonNullable.group({
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', Validators.required],
  });
  constructor() {
    this.seo.privatePage(
      'Choose a new SurePlace password',
      'Complete a secure SurePlace password reset.',
    );
  }
  submit() {
    const value = this.form.getRawValue();
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    if (value.new_password !== value.confirm_password) {
      this.error.set('Passwords do not match.');
      return;
    }
    this.error.set('');
    this.busy.set(true);
    this.api
      .confirmReset({
        ...value,
        uid: this.route.snapshot.queryParamMap.get('uid') ?? '',
        token: this.route.snapshot.queryParamMap.get('token') ?? '',
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.done.set(true);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(normalizeApiError(e).message);
        },
      });
  }
}

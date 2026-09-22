import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { SeoService } from '../../core/services/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';
import { normalizeApiError } from '../../core/api/error-normalizer';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent],
  template: `<main class="auth-page"><section class="auth-card"><h1>Reset your password</h1><p>Enter your email. If an account exists, we'll send secure reset instructions.</p>@if(sent()){<p role="status">Check your inbox for the next step.</p>}@else{<form [formGroup]="form" (ngSubmit)="submit()"><label>Email address<input type="email" formControlName="email" placeholder="you@example.com" autocomplete="email"></label>@if(error()){<p class="api-error" role="alert">{{error()}}</p>}<sp-button type="submit" [disabled]="form.invalid || busy()">{{busy() ? 'Sending...' : 'Send instructions'}}</sp-button></form>}<p><a routerLink="/login">Back to login</a></p></section></main>`,
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
    this.seo.privatePage('Reset your SurePlace password', 'Request a secure SurePlace password reset link.');
  }
  submit() {
    if (!this.form.valid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.requestReset(this.form.getRawValue().email).subscribe({
      next: () => { this.busy.set(false); this.sent.set(true); },
      error: (error) => { this.busy.set(false); this.error.set(normalizeApiError(error).message); },
    });
  }
}

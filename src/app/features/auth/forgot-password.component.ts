import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { SeoService } from '../../core/services/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent],
  template: `<main class="auth-page"><section class="auth-card"><h1>Reset your password</h1><p>Enter your email. If an account exists, we'll send secure reset instructions.</p>@if(sent()){<p role="status">Check your inbox for the next step.</p>}@else{<form [formGroup]="form" (ngSubmit)="submit()"><input aria-label="Email" type="email" formControlName="email" placeholder="Email address"><sp-button type="submit" [disabled]="form.invalid">Send instructions</sp-button></form>}<p><a routerLink="/login">Back to login</a></p></section></main>`,
  styleUrl: './auth-pages.scss',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);
  private seo = inject(SeoService);
  sent = signal(false);
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  constructor() {
    this.seo.privatePage('Reset your SurePlace password', 'Request a secure SurePlace password reset link.');
  }
  submit() {
    if (this.form.valid)
      this.api.requestReset(this.form.getRawValue().email).subscribe(() => this.sent.set(true));
  }
}

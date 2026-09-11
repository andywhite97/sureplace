import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { SeoService } from '../../core/services/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent],
  template: `<main class="auth-page"><section class="auth-card"><h1>Choose a new password</h1>@if(done()){<p>Password reset complete. <a routerLink="/login">Log in</a></p>}@else{<form [formGroup]="form" (ngSubmit)="submit()"><input aria-label="New password" type="password" formControlName="new_password" placeholder="New password"><input aria-label="Confirm password" type="password" formControlName="confirm_password" placeholder="Confirm password">@if(error()){<p class="api-error" role="alert">{{error()}}</p>}<sp-button type="submit" [disabled]="form.invalid">Reset password</sp-button></form>}</section></main>`,
  styleUrl: './auth-pages.scss',
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  done = signal(false);
  error = signal('');
  form = this.fb.nonNullable.group({
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', Validators.required],
  });
  constructor() {
    this.seo.privatePage('Choose a new SurePlace password', 'Complete a secure SurePlace password reset.');
  }
  submit() {
    const value = this.form.getRawValue();
    if (this.form.invalid || value.new_password !== value.confirm_password) return;
    this.api
      .confirmReset({
        ...value,
        uid: this.route.snapshot.queryParamMap.get('uid') ?? '',
        token: this.route.snapshot.queryParamMap.get('token') ?? '',
      })
      .subscribe({
        next: () => this.done.set(true),
        error: (e) => this.error.set(normalizeApiError(e).message),
      });
  }
}

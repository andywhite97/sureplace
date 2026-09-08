import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main class="auth-page"><section class="auth-card login-card"><header><h1>Welcome back</h1><p>Log in to your SurePlace account.</p></header>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label [class.invalid]="fieldError('email')">Email address<span><i class="fa-solid fa-envelope" aria-hidden="true"></i><input id="email" type="email" placeholder="you@example.com" autocomplete="email" formControlName="email" aria-describedby="email-error"></span><small id="email-error">{{fieldError('email')}}</small></label>
      <label [class.invalid]="fieldError('password')">Password<span><i class="fa-solid fa-lock" aria-hidden="true"></i><input id="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" formControlName="password" aria-describedby="password-error"><button type="button" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" (click)="showPassword.set(!showPassword())"><i [class]="showPassword() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" aria-hidden="true"></i></button></span><small id="password-error">{{fieldError('password')}}</small></label>
      <a class="forgot" routerLink="/forgot-password">Forgot password?</a>
      <label class="remember"><input type="checkbox" formControlName="remember"> Remember me</label>
      @if(error()){<p class="api-error" role="alert">{{error()}}</p>}
      <button class="primary" type="submit" [disabled]="busy()">@if(busy()){<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Logging in...} @else {<i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Log in}</button>
      <p class="create">Don't have an account? <a routerLink="/register">Create one</a></p>
      <p class="tagline">Find your SurePlace.</p>
    </form>
  </section></main>`,
  styleUrl: './auth-pages.scss',
  styles: [
    `.login-card{width:min(100%,500px);display:grid;gap:1rem}h1{margin:0}header p,.create,.tagline{margin:.35rem 0 0;color:var(--slate);line-height:1.5}form{display:grid;gap:.8rem;margin:0}label:not(.remember){display:grid;gap:.3rem;font-weight:780}label span{display:flex;align-items:center;min-height:50px;border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden}label span>i{width:48px;text-align:center;color:var(--teal)}input[type=email],input[type=password],input[type=text]{border:0!important;min-height:48px;padding:.7rem .8rem .7rem 0!important}label button{width:44px;min-height:44px;border:0;background:transparent;color:var(--slate);cursor:pointer}label span:focus-within{outline:3px solid color-mix(in srgb,var(--teal) 25%,transparent);border-color:var(--teal)}small{min-height:1rem;color:var(--slate);font-weight:500}.invalid span{border-color:var(--danger)}.invalid small,.api-error{color:var(--danger)}.forgot{justify-self:end;color:var(--teal);font-weight:800}.remember{display:flex;align-items:center;gap:.55rem;color:var(--midnight)}.remember input{width:18px;height:18px}.primary{min-height:50px;border:0;border-radius:var(--radius-sm);background:var(--teal);color:#fff;font-weight:850;display:flex;align-items:center;justify-content:center;gap:.5rem;cursor:pointer}.primary:disabled{opacity:.72;cursor:not-allowed}.create{text-align:center}.create a{color:var(--teal);font-weight:800}.tagline{text-align:center;font-weight:750}@media(max-width:560px){.auth-page{padding:1rem}.login-card{width:100%;padding:1.1rem}}`,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  showPassword = signal(false);
  busy = signal(false);
  error = signal('');
  fieldErrors = signal<Record<string, string>>({});
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  constructor() {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.controls.email.setValue(email);
  }

  submit() {
    if (this.busy() || !this.validate()) return;
    this.busy.set(true);
    this.error.set('');
    const { email, password, remember } = this.form.getRawValue();
    this.auth.login({ email, password }, remember).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.toast.show('Welcome back.', 'success');
        void this.router.navigateByUrl(this.safeReturnUrl());
      },
      error: (e) => this.handleError(e),
    });
  }

  fieldError(field: 'email' | 'password') { return this.fieldErrors()[field] || ''; }

  private validate() {
    this.form.controls.email.markAsTouched();
    this.form.controls.password.markAsTouched();
    const errors: Record<string, string> = {};
    if (this.form.controls.email.hasError('required')) errors['email'] = 'Email address is required.';
    else if (this.form.controls.email.hasError('email')) errors['email'] = 'Enter a valid email address.';
    if (this.form.controls.password.hasError('required')) errors['password'] = 'Password is required.';
    this.fieldErrors.set(errors);
    return !Object.keys(errors).length;
  }

  private handleError(error: unknown) {
    const normalized = normalizeApiError(error);
    const code = normalized.code;
    this.error.set(code === 'invalid_credentials' || code === 'token_not_found' ? 'The email or password you entered is incorrect.' : "We couldn't sign you in right now. Please try again.");
  }

  private safeReturnUrl() {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');
    return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account';
  }
}

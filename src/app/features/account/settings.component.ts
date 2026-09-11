import { Component, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NotificationsApiService } from '../../core/api/account-api.services';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationPreference } from '../../core/models/account.models';

type PreferenceToggle =
  | 'email_enabled'
  | 'new_message_email'
  | 'booking_updates_email'
  | 'viewing_updates_email'
  | 'saved_search_email';

@Component({
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  template: `<section class="account-page">
    <h1>Settings</h1>
    @if (message()) { <p role="status">{{ message() }}</p> }
    <section class="panel">
      <h2>Email address</h2>
      @if(auth.user(); as u){
        <p><strong>{{u.email}}</strong> <span [class.ok]="u.is_email_verified">{{u.is_email_verified ? 'Verified' : 'Not verified'}}</span></p>
        @if(!u.is_email_verified){<button type="button" [disabled]="busy()" (click)="resend(u.email)">Resend verification email</button>}
        <form [formGroup]="emailForm" (ngSubmit)="saveEmail()">
          <label><span>Change email</span><input type="email" formControlName="email" /></label>
          <small>Changing your email will require verification again.</small>
          <button type="submit" [disabled]="emailForm.invalid || busy()">Save email</button>
        </form>
      }
    </section>
    <section class="panel">
      <h2>Notification preferences</h2>
      @if (loading()) { <div class="skeleton"></div> }
      @else if (prefs(); as p) {
        @for (row of rows; track row.key) {
          <label><span>{{ row.label }}</span><input type="checkbox" [ngModel]="p[row.key]" (ngModelChange)="set(row.key, $event)" /></label>
        }
      } @else {
        <p>Notification preferences could not be loaded.</p>
      }
    </section>
    <section class="panel">
      <h2>Password and session</h2>
      <a routerLink="/account/settings/password">Change password</a>
      <button type="button" (click)="auth.logout()">Log out</button>
    </section>
  </section>`,
  styles: [
    `.account-page{display:grid;gap:1rem}.panel,form{display:grid;gap:.8rem}.panel{padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}h1,h2,p{margin:0}label{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:.65rem 0;border-bottom:1px solid var(--line)}input{min-height:42px;border:1px solid var(--line);border-radius:var(--radius-sm);padding:.55rem .7rem}small{color:var(--slate)}a,button{justify-self:start;padding:.6rem .8rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;text-decoration:none;color:var(--midnight);font-weight:850}.ok{color:var(--teal);font-weight:850}.skeleton{height:120px;background:var(--mist);border-radius:var(--radius-sm)}`,
  ],
})
export class SettingsComponent {
  private api = inject(NotificationsApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  prefs = signal<NotificationPreference | null>(null);
  loading = signal(true);
  busy = signal(false);
  message = signal('');
  emailForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  rows: Array<{ key: PreferenceToggle; label: string }> = [
    { key: 'email_enabled', label: 'Email notifications' },
    { key: 'new_message_email', label: 'Message emails' },
    { key: 'booking_updates_email', label: 'Booking emails' },
    { key: 'viewing_updates_email', label: 'Viewing emails' },
    { key: 'saved_search_email', label: 'Saved-search alert emails' },
  ];
  constructor() {
    this.api.preferences().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (p) => this.prefs.set(p), error: () => this.prefs.set(null) });
    const user = this.auth.user();
    if (user) this.emailForm.controls.email.setValue(user.email);
  }
  resend(email: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.auth.resendVerification(email).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => this.message.set('Verification email sent.'),
      error: () => this.message.set('Could not send verification email right now.'),
    });
  }
  saveEmail() {
    if (this.emailForm.invalid || this.busy()) return;
    this.busy.set(true);
    this.auth.updateMe({ email: this.emailForm.controls.email.value }).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => this.message.set('Email updated. Please verify your new address.'),
      error: () => this.message.set('Could not update email.'),
    });
  }
  set(key: PreferenceToggle, value: boolean) {
    const current = this.prefs();
    if (!current || this.busy()) return;
    this.prefs.set({ ...current, [key]: value });
    this.busy.set(true);
    this.api.updatePreferences({ [key]: value }).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (p) => {
        this.prefs.set(p);
        this.message.set('Preferences updated.');
      },
      error: () => {
        this.prefs.set(current);
        this.message.set('Could not update preferences.');
      },
    });
  }
}

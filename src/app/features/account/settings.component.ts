import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule, RouterLink],
  template: `<section class="account-page">
    <h1>Settings</h1>
    <section class="panel">
      <h2>Notification preferences</h2>
      @if (loading()) { <div class="skeleton"></div> }
      @else if (prefs(); as p) {
        @for (row of rows; track row.key) {
          <label><span>{{ row.label }}</span><input type="checkbox" [ngModel]="p[row.key]" (ngModelChange)="set(row.key, $event)" /></label>
        }
        @if (message()) { <p role="status">{{ message() }}</p> }
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
    `.account-page{display:grid;gap:1rem}.panel{display:grid;gap:.8rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}h1,h2,p{margin:0}label{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:.65rem 0;border-bottom:1px solid var(--line)}a,button{justify-self:start;padding:.6rem .8rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;text-decoration:none;color:var(--midnight);font-weight:850}.skeleton{height:120px;background:var(--mist);border-radius:var(--radius-sm)}`,
  ],
})
export class SettingsComponent {
  private api = inject(NotificationsApiService);
  auth = inject(AuthService);
  prefs = signal<NotificationPreference | null>(null);
  loading = signal(true);
  busy = signal(false);
  message = signal('');
  rows: Array<{ key: PreferenceToggle; label: string }> = [
    { key: 'email_enabled', label: 'Email notifications' },
    { key: 'new_message_email', label: 'Message emails' },
    { key: 'booking_updates_email', label: 'Booking emails' },
    { key: 'viewing_updates_email', label: 'Viewing emails' },
    { key: 'saved_search_email', label: 'Saved-search alert emails' },
  ];
  constructor() {
    this.api.preferences().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (p) => this.prefs.set(p), error: () => this.prefs.set(null) });
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

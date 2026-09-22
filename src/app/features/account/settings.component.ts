import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { NotificationsApiService } from '../../core/api/account-api.services';
import { NotificationPreference } from '../../core/models/account.models';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { ToggleSwitchComponent } from '../../shared/ui/toggle-switch.component';

type PreferenceToggle =
  | 'email_enabled'
  | 'new_message_email'
  | 'booking_updates_email'
  | 'viewing_updates_email'
  | 'saved_search_email'
  | 'listing_reminders_email'
  | 'marketing_email';

interface PreferenceRow {
  key: PreferenceToggle;
  label: string;
  description: string;
  icon: string;
  childOfEmail?: boolean;
}

@Component({
  standalone: true,
  imports: [ToggleSwitchComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private api = inject(NotificationsApiService);
  private toast = inject(ToastService);
  private seo = inject(SeoService);

  prefs = signal<NotificationPreference | null>(null);
  loading = signal(true);
  loadError = signal(false);
  saving = signal<Set<PreferenceToggle>>(new Set());

  readonly notificationRows: PreferenceRow[] = [
    {
      key: 'email_enabled',
      label: 'Email notifications',
      description: 'Receive important updates about your account.',
      icon: 'fa-regular fa-envelope',
    },
    {
      key: 'new_message_email',
      label: 'Messages',
      description: 'Get notified when you receive a new message.',
      icon: 'fa-regular fa-message',
      childOfEmail: true,
    },
    {
      key: 'booking_updates_email',
      label: 'Booking updates',
      description: 'Receive updates about your bookings.',
      icon: 'fa-regular fa-calendar-check',
      childOfEmail: true,
    },
    {
      key: 'viewing_updates_email',
      label: 'Viewing updates',
      description: 'Get updates about viewing requests and schedules.',
      icon: 'fa-regular fa-calendar',
      childOfEmail: true,
    },
    {
      key: 'saved_search_email',
      label: 'Saved search alerts',
      description: 'Receive alerts when new properties match your saved searches.',
      icon: 'fa-solid fa-magnifying-glass',
      childOfEmail: true,
    },
    {
      key: 'listing_reminders_email',
      label: 'Listing reminders',
      description: 'Receive reminders to keep your published listings up to date.',
      icon: 'fa-regular fa-bell',
      childOfEmail: true,
    },
  ];

  readonly privacyRows: PreferenceRow[] = [
    {
      key: 'marketing_email',
      label: 'Marketing communications',
      description: 'Choose whether to receive promotional emails and offers.',
      icon: 'fa-solid fa-bullhorn',
    },
  ];

  constructor() {
    this.seo.privatePage('Settings', 'Manage your SurePlace preferences and app settings.');
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set(false);
    this.api
      .preferences()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (preferences) => this.prefs.set(preferences),
        error: () => {
          this.prefs.set(null);
          this.loadError.set(true);
        },
      });
  }

  isSaving(key: PreferenceToggle) {
    return this.saving().has(key);
  }

  isDisabled(row: PreferenceRow) {
    const preferences = this.prefs();
    return this.isSaving(row.key) || !!(row.childOfEmail && !preferences?.email_enabled);
  }

  set(row: PreferenceRow, value: boolean) {
    const current = this.prefs();
    if (!current || this.isDisabled(row) || current[row.key] === value) return;

    const previous = current[row.key];
    this.prefs.set({ ...current, [row.key]: value });
    this.saving.update((keys) => new Set(keys).add(row.key));

    this.api
      .updatePreferences({ [row.key]: value })
      .pipe(
        finalize(() =>
          this.saving.update((keys) => {
            const next = new Set(keys);
            next.delete(row.key);
            return next;
          }),
        ),
      )
      .subscribe({
        next: (saved) =>
          this.prefs.update((preferences) =>
            preferences ? { ...preferences, [row.key]: saved[row.key] } : preferences,
          ),
        error: () => {
          this.prefs.update((preferences) =>
            preferences ? { ...preferences, [row.key]: previous } : preferences,
          );
          this.toast.show("We couldn't update that preference. Please try again.", 'error');
        },
      });
  }
}

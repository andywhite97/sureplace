import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ProfileApiService } from '../../core/api/account-api.services';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { UserCapabilityService } from '../../core/services/user-capability.service';
import { EswatiniPhoneInputComponent } from '../../shared/ui/eswatini-phone-input.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, EswatiniPhoneInputComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnDestroy {
  private api = inject(ProfileApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private capabilities = inject(UserCapabilityService);
  private route = inject(ActivatedRoute);

  user = signal<User | null>(null);
  loading = signal(true);
  busy = signal(false);
  avatarBusy = signal(false);
  avatarPreview = signal<string | null>(null);
  error = signal('');
  listingIntent = this.route.snapshot.queryParamMap.get('intent') || '';
  fieldErrors = signal<Record<string, string>>({});

  readonly intents = [
    {
      value: 'LOOKING_FOR_PROPERTY',
      label: 'Looking for a property',
      description: 'Find and buy or rent properties in Eswatini.',
      icon: 'fa-solid fa-house',
    },
    {
      value: 'PROPERTY_OWNER',
      label: 'List properties as an owner',
      description: 'Post and manage your own properties.',
      icon: 'fa-solid fa-building',
    },
    {
      value: 'PROPERTY_AGENT',
      label: 'List properties as an agent',
      description: 'Work as a property agent and connect with clients.',
      icon: 'fa-solid fa-user-group',
    },
    {
      value: 'HOSPITALITY_OPERATOR',
      label: 'List a stay / hospitality business',
      description: 'Host stays and manage your hospitality business.',
      icon: 'fa-solid fa-bed',
    },
  ];

  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: [''],
    phone_number: [''],
    onboarding_intents: [[] as string[]],
  });

  constructor() {
    this.load();
  }

  ngOnDestroy() {
    this.revokePreview();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .me()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => this.applyUser(user),
        error: () => this.error.set("We couldn't load your profile."),
      });
  }

  displayName(user: User) {
    return [user.first_name, user.last_name].filter(Boolean).join(' ') || 'SurePlace member';
  }

  initials(user: User) {
    const initials = [user.first_name, user.last_name]
      .filter(Boolean)
      .map((part) => part.trim().charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return initials || user.email.charAt(0).toUpperCase() || 'S';
  }

  hasIntent(value: string) {
    return this.form.controls.onboarding_intents.value.includes(value);
  }

  toggleIntent(value: string, selected: boolean) {
    const current = this.form.controls.onboarding_intents.value;
    this.form.controls.onboarding_intents.setValue(
      selected ? [...new Set([...current, value])] : current.filter((item) => item !== value),
    );
    this.form.controls.onboarding_intents.markAsDirty();
  }

  listingPrompt() {
    return this.listingIntent === 'HOSPITALITY_OPERATOR'
      ? 'Select “List a stay / hospitality business”, then save your profile to begin.'
      : this.listingIntent
        ? 'Select “List properties as an owner”, then save your profile to begin.'
        : '';
  }

  discard() {
    const user = this.user();
    if (user) this.applyUser(user);
  }

  fieldError(field: 'first_name' | 'last_name' | 'phone_number') {
    if (this.fieldErrors()[field]) return this.fieldErrors()[field];
    const control = this.form.controls[field];
    if (field === 'first_name' && control.touched && control.hasError('required')) {
      return 'First name is required.';
    }
    return '';
  }

  clearFieldError(field: 'first_name' | 'last_name' | 'phone_number') {
    if (!this.fieldErrors()[field]) return;
    const next = { ...this.fieldErrors() };
    delete next[field];
    this.fieldErrors.set(next);
  }

  changePhoto(files: FileList | null, input: HTMLInputElement) {
    const file = files?.[0];
    input.value = '';
    if (!file || this.avatarBusy()) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.toast.show('Choose a JPG, PNG or WebP profile photo.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.show('Profile photos must be 5MB or smaller.', 'error');
      return;
    }

    const preview = URL.createObjectURL(file);
    this.revokePreview();
    this.avatarPreview.set(preview);
    this.avatarBusy.set(true);
    this.api
      .uploadAvatar(file)
      .pipe(finalize(() => this.avatarBusy.set(false)))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.auth.user.set(user);
          this.revokePreview();
          this.toast.show('Profile photo updated.', 'success');
        },
        error: () => {
          this.revokePreview();
          this.toast.show("We couldn't update your profile photo. Please try again.", 'error');
        },
      });
  }

  save() {
    if (this.form.invalid || this.form.pristine || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    this.api
      .update(this.form.getRawValue())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (user) => {
          this.applyUser(user);
          this.auth.user.set(user);
          this.capabilities.refresh().subscribe();
          this.toast.show('Profile updated.', 'success');
        },
        error: (response) => {
          const normalized = normalizeApiError(response);
          this.fieldErrors.set(
            Object.fromEntries(
              Object.entries(normalized.errors).map(([field, messages]) => [
                field,
                messages[0] || '',
              ]),
            ),
          );
          this.error.set("We couldn't update your profile. Please try again.");
          this.toast.show("We couldn't update your profile. Please try again.", 'error');
        },
      });
  }

  private applyUser(user: User) {
    this.user.set(user);
    this.form.reset({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || '',
      onboarding_intents: user.onboarding_intents || [],
    });
    this.fieldErrors.set({});
    this.error.set('');
  }

  private revokePreview() {
    const preview = this.avatarPreview();
    if (preview) URL.revokeObjectURL(preview);
    this.avatarPreview.set(null);
  }
}

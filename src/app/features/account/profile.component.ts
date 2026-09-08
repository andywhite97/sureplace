import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileApiService } from '../../core/api/account-api.services';
import { User } from '../../core/models/api.models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<section class="account-page">
    <h1>Profile</h1>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (user(); as u) {
      <header>@if (u.avatar) { <img [src]="u.avatar" alt="" /> }<div><strong>{{ displayName(u) }}</strong><span>{{ u.email }}</span></div></header>
      <form [formGroup]="form" (ngSubmit)="save()">
        <label>First name<input formControlName="first_name" /></label>
        <label>Last name<input formControlName="last_name" /></label>
        <label>Phone<input formControlName="phone_number" /></label>
        <fieldset><legend>What brings you to SurePlace?</legend>
          @for (intent of intents; track intent.value) {
            <label class="check"><input type="checkbox" [checked]="hasIntent(intent.value)" (change)="toggleIntent(intent.value, $any($event.target).checked)" /> {{ intent.label }}</label>
          }
        </fieldset>
        @if (message()) { <p role="status">{{ message() }}</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button type="submit" [disabled]="form.invalid || busy()">Save profile</button>
      </form>
      <p class="hint">Avatar upload is not exposed in the current frontend flow.</p>
    }
  </section>`,
  styles: [
    `.account-page{display:grid;gap:1rem}header{display:flex;gap:.8rem;align-items:center;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}img{width:60px;height:60px;border-radius:999px;object-fit:cover}header div{display:grid}span,.hint{color:var(--slate)}form{display:grid;gap:.8rem;max-width:620px}label{display:grid;gap:.25rem}input{padding:.65rem;border:1px solid var(--line);border-radius:var(--radius-sm)}fieldset{display:grid;gap:.45rem;border:1px solid var(--line);border-radius:var(--radius-sm);padding:1rem}.check{display:flex;align-items:center;gap:.5rem}button{justify-self:start;padding:.65rem .9rem;border:0;border-radius:var(--radius-sm);background:var(--teal);color:#fff;font-weight:850}.error{color:#9b2525}.skeleton{height:180px;background:var(--mist);border-radius:var(--radius-sm)}`,
  ],
})
export class ProfileComponent {
  private api = inject(ProfileApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  user = signal<User | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  intents = [
    { value: 'FIND_PROPERTY', label: 'Find property' },
    { value: 'FIND_STAYS', label: 'Find stays' },
    { value: 'LIST_PROPERTY', label: 'List property' },
    { value: 'LIST_STAYS', label: 'List stays' },
    { value: 'AGENT', label: 'Work as agent' },
  ];
  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: [''],
    phone_number: [''],
    onboarding_intents: [[] as string[]],
  });
  constructor() {
    this.api.me().pipe(finalize(() => this.loading.set(false))).subscribe((u) => {
      this.user.set(u);
      this.form.patchValue(u);
    });
  }
  displayName(u: User) {
    return [u.first_name, u.last_name].filter(Boolean).join(' ') || 'SurePlace member';
  }
  hasIntent(value: string) {
    return this.form.controls.onboarding_intents.value.includes(value);
  }
  toggleIntent(value: string, on: boolean) {
    const current = this.form.controls.onboarding_intents.value;
    this.form.controls.onboarding_intents.setValue(on ? [...current, value] : current.filter((x) => x !== value));
  }
  save() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.api.update(this.form.getRawValue()).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (u) => {
        this.user.set(u);
        this.auth.user.set(u);
        this.message.set('Profile updated.');
      },
      error: () => this.error.set('Profile could not be updated.'),
    });
  }
}

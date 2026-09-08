import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SavedSearchesApiService } from '../../core/api/account-api.services';
import { AuthService } from '../../core/auth/auth.service';
import { SavedSearchCriteria, SavedSearchType } from '../../core/models/account.models';

@Component({
  selector: 'sp-save-search-button',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<button type="button" class="save-search" (click)="open()">Save Search</button>
    @if (modal()) {
      <div class="backdrop" (click)="close()">
        <section role="dialog" aria-modal="true" aria-labelledby="save-search-title" (click)="$event.stopPropagation()">
          <button class="close" type="button" aria-label="Close" (click)="close()">x</button>
          <h2 id="save-search-title">Save this search</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label>Name<input formControlName="name" /></label>
            <label class="check"><input type="checkbox" formControlName="notifications_enabled" /> Email me new matches</label>
            @if (error()) { <p role="alert">{{ error() }}</p> }
            @if (success()) { <p class="ok" role="status">Search saved.</p> }
            <button type="submit" [disabled]="form.invalid || busy()">Save</button>
          </form>
        </section>
      </div>
    }`,
  styles: [
    `.save-search{border:1px solid var(--line);border-radius:999px;padding:.55rem .8rem;background:#fff;color:var(--midnight);font-weight:850}.backdrop{position:fixed;inset:0;background:#102d2d99;z-index:90;display:grid;place-items:center;padding:1rem}section{position:relative;width:min(420px,100%);background:#fff;border-radius:var(--radius);padding:1.25rem}form,label{display:grid;gap:.6rem}.check{display:flex;align-items:center}input{padding:.65rem;border:1px solid var(--line);border-radius:var(--radius-sm)}button[type=submit]{justify-self:start;padding:.65rem .9rem;border:0;border-radius:var(--radius-sm);background:var(--teal);color:#fff;font-weight:850}.close{position:absolute;right:.7rem;top:.7rem;border:0;background:none;font-size:1.2rem}p{margin:0;color:#9b2525}.ok{color:var(--teal);font-weight:850}`,
  ],
})
export class SaveSearchButtonComponent {
  private api = inject(SavedSearchesApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  searchType = input.required<SavedSearchType>();
  criteria = input.required<SavedSearchCriteria>();
  defaultName = input.required<string>();
  modal = signal(false);
  busy = signal(false);
  error = signal('');
  success = signal(false);
  form = this.fb.nonNullable.group({ name: ['', Validators.required], notifications_enabled: [true] });
  open() {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.form.patchValue({ name: this.defaultName(), notifications_enabled: true });
    this.error.set('');
    this.success.set(false);
    this.modal.set(true);
  }
  save() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    this.api
      .create({
        name: value.name.trim(),
        search_type: this.searchType(),
        criteria: this.criteria(),
        notifications_enabled: value.notifications_enabled,
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.success.set(true);
          setTimeout(() => this.close(), 650);
        },
        error: (e) =>
          this.error.set(e?.error?.message || e?.error?.detail || 'Could not save this search.'),
      });
  }
  close() {
    this.modal.set(false);
  }
}

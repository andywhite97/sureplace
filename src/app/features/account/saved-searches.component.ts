import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { SavedSearchesApiService } from '../../core/api/account-api.services';
import { SavedSearch } from '../../core/models/account.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive],
  template: `<section class="account-page saved-searches-page">
    <header><h1>Saved Searches</h1><nav aria-label="Saved content"><a routerLink="/account/saved">Favourites</a><a routerLink="/account/alerts" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Saved searches</a></nav></header>
    @if (loading()) { <div class="skeleton" aria-label="Loading saved searches"></div> }
    @else if (error()) { <div class="state"><p>{{ error() }}</p><button (click)="load()">Retry</button></div> }
    @else if (!items().length) { <div class="state"><h2>Save a search to get back to it quickly.</h2><p>Search filters can be saved from property and stay results.</p><a routerLink="/properties">Search Properties</a><a routerLink="/stays">Search Stays</a></div> }
    @else { <div class="list">
      @for (s of items(); track s.id) {
        <article>
          @if (editing() === s.id) {
            <form [formGroup]="form" (ngSubmit)="saveName(s)">
              <label>Name<input formControlName="name" /></label>
              <button [disabled]="form.invalid || busy()">Save</button>
              <button type="button" (click)="editing.set(null)">Cancel</button>
            </form>
          } @else {
            <div><strong>{{ s.name }}</strong><span>{{ s.search_type === 'PROPERTY' ? 'Property' : 'Stay' }} search</span></div>
            <p>{{ summary(s) }}</p>
            <small>Created {{ date(s.created_at) }}@if (s.last_checked_at) { · Last checked {{ date(s.last_checked_at) }} }</small>
            @if (checkMessage()[s.id]) { <p class="feedback">{{ checkMessage()[s.id] }}</p> }
            <footer>
              <a [routerLink]="route(s)" [queryParams]="s.criteria">Open results</a>
              <button type="button" (click)="edit(s)">Edit name</button>
              <button type="button" (click)="toggle(s)" [disabled]="busy()">{{ s.notifications_enabled ? 'Disable alerts' : 'Enable alerts' }}</button>
              <button type="button" (click)="check(s)" [disabled]="busy()">Check now</button>
              <button type="button" class="danger" (click)="remove(s)" [disabled]="busy()">Delete</button>
            </footer>
          }
        </article>
      }
    </div> }
  </section>`,
  styles: [
    `.account-page{display:grid;gap:1rem}header{display:flex;align-items:center;justify-content:space-between;gap:1rem}h1{margin:0}header nav{display:flex;gap:.35rem}header a{border:0;color:var(--slate)}header a.active{background:var(--teal);color:#fff}.list{display:grid;gap:.8rem}article{display:grid;gap:.55rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff}article div{display:flex;justify-content:space-between;gap:1rem}span,small,p{color:var(--slate)}p{margin:0}footer{display:flex;flex-wrap:wrap;gap:.5rem}button,a{min-height:40px;padding:.48rem .65rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;color:var(--midnight);text-decoration:none;font-weight:800}.danger{color:#9b2525}.feedback{color:var(--teal);font-weight:800}.state{display:grid;place-items:center;text-align:center;gap:.6rem;padding:3rem 1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.state a{color:var(--teal)}.skeleton{height:220px;background:linear-gradient(105deg,var(--mist) 30%,#fff 47%,var(--mist) 64%);background-size:220% 100%;animation:shimmer 1.2s linear infinite;border-radius:var(--radius-sm)}@keyframes shimmer{to{background-position:-220% 0}}form{display:flex;flex-wrap:wrap;gap:.5rem;align-items:end}label{display:grid;gap:.25rem}input{padding:.55rem;border:1px solid var(--line);border-radius:var(--radius-sm)}@media(max-width:767px){.account-page{gap:1.15rem}header{display:grid;gap:.8rem}h1{font-size:1.55rem}header nav{overflow-x:auto;margin-inline:-.25rem;padding-inline:.25rem}header a{white-space:nowrap}article{padding:1rem;border-radius:1rem;box-shadow:0 8px 22px rgba(21,43,42,.05)}article div{align-items:start;flex-direction:column;gap:.25rem}footer{display:grid;grid-template-columns:1fr 1fr;padding-top:.6rem;border-top:1px solid var(--line)}footer a,footer button{min-height:44px;text-align:center}.danger{grid-column:1/-1}.state{min-height:260px}.skeleton{height:320px;border-radius:1rem}input{min-height:48px;font-size:16px}}@media(prefers-reduced-motion:reduce){.skeleton{animation:none}}`,
  ],
})
export class SavedSearchesComponent {
  private api = inject(SavedSearchesApiService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  items = signal<SavedSearch[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  editing = signal<string | null>(null);
  checkMessage = signal<Record<string, string>>({});
  form = this.fb.nonNullable.group({ name: ['', Validators.required] });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: (p) => this.items.set(p.results), error: () => this.error.set('Saved searches could not be loaded.') });
  }
  summary(s: SavedSearch) {
    const c = s.criteria;
    const parts = [
      c['property_type'] || c['stay_type'],
      c['listing_type'] === 'SALE' ? 'for sale' : c['listing_type'] === 'RENT' ? 'for rent' : '',
      c['suburb'] || c['town'] || c['region'] || 'Eswatini',
      this.range(c['min_price'], c['max_price'], s.search_type === 'STAY' ? '/night' : ''),
      c['min_bedrooms'] ? `${c['min_bedrooms']}+ beds` : '',
    ].filter(Boolean);
    return parts.join(' · ');
  }
  range(min: unknown, max: unknown, suffix: string) {
    if (!min && !max) return '';
    const money = (v: unknown) => (v ? `E${Number(v).toLocaleString()}` : 'Any');
    return `${money(min)}-${money(max)}${suffix}`;
  }
  date(v: string) {
    return new Intl.DateTimeFormat('en-SZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v));
  }
  route(s: SavedSearch) {
    return s.search_type === 'PROPERTY' ? '/properties' : '/stays';
  }
  edit(s: SavedSearch) {
    this.form.setValue({ name: s.name });
    this.editing.set(s.id);
  }
  saveName(s: SavedSearch) {
    if (this.form.invalid) return;
    this.patch(s.id, { name: this.form.getRawValue().name }, 'Saved search renamed.', () => this.editing.set(null));
  }
  toggle(s: SavedSearch) {
    this.patch(
      s.id,
      { notifications_enabled: !s.notifications_enabled },
      s.notifications_enabled ? 'Search alerts disabled.' : 'Search alerts enabled.',
    );
  }
  check(s: SavedSearch) {
    this.busy.set(true);
    this.api
      .check(s.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (r) => this.checkMessage.update((m) => ({ ...m, [s.id]: `${r.new_matches} matching listings found.` })),
        error: () => this.toast.show('This saved search could not be checked.', 'error'),
      });
  }
  remove(s: SavedSearch) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    this.busy.set(true);
    this.api
      .delete(s.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.items.update((xs) => xs.filter((x) => x.id !== s.id));
          this.toast.show('Saved search deleted.', 'success');
        },
        error: () => this.toast.show('Saved search could not be deleted.', 'error'),
      });
  }
  private patch(id: string, body: Partial<SavedSearch>, message: string, done = () => {}) {
    this.busy.set(true);
    this.api
      .patch(id, body)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.items.update((xs) => xs.map((x) => (x.id === id ? updated : x)));
          done();
          this.toast.show(message, 'success');
        },
        error: () => this.toast.show('Saved search could not be updated.', 'error'),
      });
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FavouritesApiService } from '../../core/api/favourites-api.service';
import { FavouriteItem } from '../../core/models/account.models';
import { PropertyCardComponent } from '../../shared/listing/property-card.component';
import { StayCardComponent } from '../../shared/listing/stay-card.component';

@Component({
  standalone: true,
  imports: [RouterLink, PropertyCardComponent, StayCardComponent],
  template: `<section class="account-page">
    <header><h1>Saved listings</h1><div role="group" aria-label="Saved filter"><button [class.active]="filter()==='all'" (click)="filter.set('all')">All</button><button [class.active]="filter()==='property'" (click)="filter.set('property')">Properties</button><button [class.active]="filter()==='stay'" (click)="filter.set('stay')">Stays</button></div></header>
    @if (loading()) { <div class="skeleton" aria-label="Loading saved listings"></div> }
    @else if (error()) { <div class="state"><p>{{ error() }}</p><button (click)="load()">Retry</button></div> }
    @else if (!filtered().length) { <div class="state"><h2>You haven't saved anything yet.</h2><p>Save properties and stays to compare them later.</p><a routerLink="/properties">Browse Properties</a><a routerLink="/stays">Browse Stays</a></div> }
    @else { <div class="grid">
      @for (f of filtered(); track f.id) {
        <div class="saved-card">
          @if (f.property_card) { <sp-property-card [item]="withFavourite(f.property_card)" /> }
          @if (f.stay_card) { <sp-stay-card [item]="withFavourite(f.stay_card)" /> }
          <button type="button" (click)="remove(f)" [disabled]="removing() === f.id">Remove</button>
        </div>
      }
    </div> }
  </section>`,
  styles: [
    `.account-page{display:grid;gap:1rem}header{display:flex;justify-content:space-between;gap:1rem;align-items:center}h1{margin:0}button,a{font:inherit}header button{border:0;padding:.5rem .75rem;border-radius:999px}.active{background:var(--midnight);color:#fff}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1rem}.saved-card{display:grid;gap:.5rem}.saved-card>button{padding:.55rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;color:#9b2525;font-weight:800}.state{display:grid;place-items:center;text-align:center;gap:.6rem;padding:3rem 1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.state a{color:var(--teal);font-weight:800}.skeleton{height:260px;border-radius:var(--radius-sm);background:var(--mist)}@media(max-width:760px){header{align-items:start;display:grid}.grid{grid-template-columns:1fr}}`,
  ],
})
export class SavedListingsComponent {
  private api = inject(FavouritesApiService);
  items = signal<FavouriteItem[]>([]);
  loading = signal(true);
  error = signal('');
  removing = signal<string | null>(null);
  filter = signal<'all' | 'property' | 'stay'>('all');
  filtered = computed(() =>
    this.items().filter((x) => {
      const filter = this.filter();
      return filter === 'all' || Boolean(filter === 'property' ? x.property : x.stay);
    }),
  );
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.items.set(p.results),
        error: () => this.error.set('Saved listings could not be loaded.'),
      });
  }
  withFavourite<T extends { is_favourited: boolean }>(item: T): T {
    return { ...item, is_favourited: true };
  }
  remove(item: FavouriteItem) {
    this.removing.set(item.id);
    this.api
      .removeByFavouriteId(item.id)
      .pipe(finalize(() => this.removing.set(null)))
      .subscribe(() => this.items.update((xs) => xs.filter((x) => x.id !== item.id)));
  }
}

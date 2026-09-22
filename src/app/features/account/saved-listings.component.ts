import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FavouritesApiService } from '../../core/api/favourites-api.service';
import { FavouriteItem } from '../../core/models/account.models';
import { ToastService } from '../../core/services/toast.service';
import { PropertyCardComponent } from '../../shared/listing/property-card.component';
import { StayCardComponent } from '../../shared/listing/stay-card.component';

@Component({
  standalone: true,
  imports: [RouterLink, PropertyCardComponent, StayCardComponent],
  template: `<section class="account-page saved-listings-page">
    <header class="page-heading">
      <div class="heading-copy">
        <h1>Saved listings</h1>
        <p>Keep your favourite properties and stays together in one place.</p>
      </div>
      <div class="listing-filter" role="group" aria-label="Saved listing filter">
        <button
          type="button"
          [class.active]="filter() === 'all'"
          [attr.aria-pressed]="filter() === 'all'"
          (click)="filter.set('all')"
        >
          All <span>{{ items().length }}</span>
        </button>
        <button
          type="button"
          [class.active]="filter() === 'property'"
          [attr.aria-pressed]="filter() === 'property'"
          (click)="filter.set('property')"
        >
          Properties <span>{{ propertyCount() }}</span>
        </button>
        <button
          type="button"
          [class.active]="filter() === 'stay'"
          [attr.aria-pressed]="filter() === 'stay'"
          (click)="filter.set('stay')"
        >
          Stays <span>{{ stayCount() }}</span>
        </button>
      </div>
    </header>
    @if (actionError()) {
      <p class="action-error" role="alert">{{ actionError() }}</p>
    }
    @if (loading()) {
      <div class="skeleton" aria-label="Loading saved listings"></div>
    } @else if (error()) {
      <div class="state">
        <p>{{ error() }}</p>
        <button (click)="load()">Retry</button>
      </div>
    } @else if (!filtered().length) {
      <div class="state">
        <i class="fa-regular fa-heart" aria-hidden="true"></i>
        <h2>
          {{
            filter() === 'all'
              ? "You haven't saved anything yet."
              : 'No saved ' + (filter() === 'property' ? 'properties' : 'stays')
          }}
        </h2>
        <p>
          {{
            filter() === 'all'
              ? 'Save properties and stays to compare them later.'
              : 'Save ' +
                (filter() === 'property' ? 'homes' : 'stays') +
                " you like and they'll appear here."
          }}
        </p>
        <a [routerLink]="filter() === 'stay' ? '/stays' : '/properties'"
          >Explore {{ filter() === 'stay' ? 'stays' : 'properties' }}</a
        >
      </div>
    } @else {
      <div class="results-summary">
        <strong>{{ filtered().length }}</strong> saved
        {{
          filter() === 'all'
            ? 'listing' + (filtered().length === 1 ? '' : 's')
            : filter() === 'property'
              ? 'propert' + (filtered().length === 1 ? 'y' : 'ies')
              : 'stay' + (filtered().length === 1 ? '' : 's')
        }}
      </div>
      <div class="grid">
        @for (f of filtered(); track f.id) {
          <div class="saved-card">
            @if (f.property_card) {
              <sp-property-card [item]="withFavourite(f.property_card)" />
            }
            @if (f.stay_card) {
              <sp-stay-card [item]="withFavourite(f.stay_card)" />
            }
            <button
              type="button"
              class="remove-saved"
              (click)="remove(f)"
              [disabled]="removing() === f.id"
              aria-label="Remove from saved"
            >
              <i
                [class]="removing() === f.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-heart'"
                aria-hidden="true"
              ></i
              ><span>Remove from saved</span>
            </button>
          </div>
        }
      </div>
    }
  </section>`,
  styles: [
    `
      .account-page {
        display: grid;
        gap: 0.9rem;
      }
      .page-heading {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: end;
        flex-wrap: wrap;
      }
      .heading-copy {
        display: grid;
        gap: 0.25rem;
      }
      .heading-copy h1 {
        margin: 0;
      }
      .heading-copy p {
        margin: 0;
        color: var(--slate);
        font-size: 0.88rem;
      }
      .listing-filter {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem;
        border-radius: 0.8rem;
        background: var(--mist);
      }
      .listing-filter button {
        display: inline-flex;
        min-height: 38px;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 0.72rem;
        border: 0;
        border-radius: 0.62rem;
        background: transparent;
        color: var(--slate);
        font: inherit;
        font-weight: 750;
        white-space: nowrap;
        cursor: pointer;
      }
      .listing-filter button span {
        display: grid;
        min-width: 1.25rem;
        height: 1.25rem;
        place-items: center;
        padding: 0 0.25rem;
        border-radius: 999px;
        background: rgba(112, 137, 132, 0.12);
        font-size: 0.68rem;
      }
      .listing-filter button.active {
        background: #fff;
        color: var(--teal);
        box-shadow: 0 2px 9px rgba(21, 43, 42, 0.08);
      }
      .listing-filter button.active span {
        background: #e4f6f3;
      }
      .listing-filter button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--teal) 24%, transparent);
        outline-offset: 2px;
      }
      .results-summary {
        color: var(--slate);
        font-size: 0.78rem;
      }
      .results-summary strong {
        color: var(--midnight);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        align-items: start;
        gap: 1rem;
      }
      .saved-card {
        position: relative;
        min-width: 0;
        border-radius: var(--radius-sm);
        background: #fff;
        box-shadow: 0 5px 18px rgba(21, 43, 42, 0.05);
      }
      .saved-card > .remove-saved {
        position: absolute;
        z-index: 5;
        top: 0.75rem;
        right: 0.75rem;
        display: grid;
        width: 2.6rem;
        height: 2.6rem;
        min-height: 0;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.96);
        color: #ef476f;
        font: inherit;
        cursor: pointer;
        box-shadow: 0 3px 12px rgba(21, 43, 42, 0.14);
      }
      .saved-card > .remove-saved:hover {
        background: #fff0f3;
      }
      .saved-card > .remove-saved:focus-visible {
        outline: 3px solid rgba(239, 71, 111, 0.24);
        outline-offset: 2px;
      }
      .remove-saved span {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
      .action-error {
        margin: 0;
        padding: 0.7rem 0.85rem;
        border-radius: 0.75rem;
        background: #fff1f1;
        color: #9b2525;
      }
      .state {
        display: grid;
        place-items: center;
        text-align: center;
        gap: 0.6rem;
        padding: 3rem 1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
      }
      .state > i {
        font-size: 2rem;
        color: var(--teal);
      }
      .state a {
        color: var(--teal);
        font-weight: 800;
      }
      .skeleton {
        height: 260px;
        border-radius: var(--radius-sm);
        background: linear-gradient(105deg, var(--mist) 30%, #fff 47%, var(--mist) 64%);
        background-size: 220% 100%;
        animation: shimmer 1.2s linear infinite;
      }
      @keyframes shimmer {
        to {
          background-position: -220% 0;
        }
      }
      :host ::ng-deep .saved-card .fav {
        display: none;
      }
      @media (max-width: 767px) {
        .account-page {
          gap: 0.7rem;
        }
        .page-heading {
          display: grid;
          gap: 0.7rem;
        }
        .heading-copy h1 {
          font-size: 1.5rem;
        }
        .heading-copy p {
          font-size: 0.8rem;
        }
        .listing-filter {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          width: 100%;
          box-sizing: border-box;
        }
        .listing-filter button {
          min-width: 0;
          justify-content: center;
          padding: 0.45rem 0.25rem;
          font-size: 0.78rem;
        }
        .listing-filter button span {
          min-width: 1.1rem;
          height: 1.1rem;
          font-size: 0.62rem;
        }
        .grid {
          grid-template-columns: 1fr;
          gap: 0.65rem;
        }
        .saved-card {
          overflow: visible;
          border-radius: 0.9rem;
          box-shadow: 0 5px 18px rgba(21, 43, 42, 0.06);
        }
        .saved-card > .remove-saved {
          top: 0.55rem;
          right: 0.55rem;
          width: 2.35rem;
          height: 2.35rem;
        }
        .state {
          min-height: 260px;
          padding: 2rem 1rem;
          border-radius: 1rem;
        }
        .skeleton {
          height: 330px;
          border-radius: 1rem;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .skeleton {
          animation: none;
        }
      }
    `,
    `
      @media (max-width: 767px) {
        :host ::ng-deep .saved-card article {
          position: relative;
          display: grid;
          grid-template-columns: 6.35rem minmax(0, 1fr);
          min-height: 6.9rem;
          border-radius: 0.9rem;
          box-shadow: none;
        }
        :host ::ng-deep .saved-card article:hover {
          transform: none;
          box-shadow: none;
        }
        :host ::ng-deep .saved-card .visual,
        :host ::ng-deep .saved-card .visual > a,
        :host ::ng-deep .saved-card .visual sp-image {
          height: 100%;
        }
        :host ::ng-deep .saved-card .visual {
          overflow: hidden;
          border-radius: 0.9rem;
        }
        :host ::ng-deep .saved-card .visual sp-image {
          --image-ratio: 1 / 1;
        }
        :host ::ng-deep .saved-card .type,
        :host ::ng-deep .saved-card .fav {
          display: none;
        }
        :host ::ng-deep .saved-card .body {
          align-content: center;
          min-width: 0;
          gap: 0.2rem;
          padding: 0.58rem 2.85rem 0.58rem 0.65rem;
        }
        :host ::ng-deep .saved-card .price {
          overflow: hidden;
          font-size: 1rem;
          line-height: 1.15;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        :host ::ng-deep .saved-card .price small {
          font-size: 0.7rem;
        }
        :host ::ng-deep .saved-card h3 {
          font-size: 0.86rem;
          line-height: 1.2;
        }
        :host ::ng-deep .saved-card h3 a {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        :host ::ng-deep .saved-card .location {
          min-width: 0;
          overflow: hidden;
          font-size: 0.72rem;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        :host ::ng-deep .saved-card .location sp-icon {
          flex: 0 0 auto;
        }
        :host ::ng-deep .saved-card .specs,
        :host ::ng-deep .saved-card sp-verification-badge {
          display: none;
        }
        :host ::ng-deep .saved-card .rooms {
          overflow: hidden;
          font-size: 0.7rem;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        :host ::ng-deep .saved-card sp-availability-status {
          font-size: 0.66rem;
        }
      }
      @media (max-width: 340px) {
        :host ::ng-deep .saved-card article {
          grid-template-columns: 5.75rem minmax(0, 1fr);
          min-height: 6.4rem;
        }
        :host ::ng-deep .saved-card .body {
          padding-right: 2.6rem;
          padding-left: 0.55rem;
        }
      }
    `,
  ],
})
export class SavedListingsComponent {
  private api = inject(FavouritesApiService);
  private toast = inject(ToastService);
  items = signal<FavouriteItem[]>([]);
  loading = signal(true);
  error = signal('');
  actionError = signal('');
  removing = signal<string | null>(null);
  filter = signal<'all' | 'property' | 'stay'>('all');
  filtered = computed(() =>
    this.items().filter((x) => {
      const filter = this.filter();
      return filter === 'all' || Boolean(filter === 'property' ? x.property : x.stay);
    }),
  );
  propertyCount = computed(() => this.items().filter((item) => !!item.property).length);
  stayCount = computed(() => this.items().filter((item) => !!item.stay).length);
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
    this.actionError.set('');
    const before = this.items();
    this.items.update((xs) => xs.filter((x) => x.id !== item.id));
    this.removing.set(item.id);
    this.api
      .removeByFavouriteId(item.id)
      .pipe(finalize(() => this.removing.set(null)))
      .subscribe({
        next: () => this.toast.show('Removed from saved.', 'success'),
        error: () => {
          this.items.set(before);
          this.actionError.set('That favourite could not be removed. Please try again.');
          this.toast.show('That favourite could not be removed.', 'error');
        },
      });
  }
}

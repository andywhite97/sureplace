import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PropertyManagementApiService } from '../../core/api/manage-api.services';
import { ManagedProperty } from '../../core/models/manage.models';
import { ToastService } from '../../core/services/toast.service';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { ManageStatusComponent, QualityScoreComponent } from './manage-ui';

@Component({
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    SmartImageComponent,
    ManageStatusComponent,
    QualityScoreComponent,
  ],
  template: `<section class="workspace">
    <header class="page-head">
      <div>
        <h1>Manage Properties</h1>
        <p>View and manage your property listings.</p>
      </div>
      <a class="primary" routerLink="/account/manage/properties/new" [queryParams]="createQuery()"
        ><i class="fa-solid fa-plus"></i> Add Property</a
      >
    </header>
    <section class="filters">
      <label
        ><i class="fa-solid fa-magnifying-glass"></i
        ><input
          type="search"
          aria-label="Search properties"
          placeholder="Search title, public ID or town..."
          (input)="query.set($any($event.target).value)"
      /></label>
      <div class="chips" role="tablist" aria-label="Property status filters">
        @for (f of filters; track f.value) {
          <button
            [class.active]="filter() === f.value"
            [attr.aria-current]="filter() === f.value ? 'page' : null"
            (click)="filter.set(f.value)"
          >
            {{ f.label }} <span>{{ count(f.value) }}</span>
          </button>
        }
      </div>
    </section>
    @if (loading()) {
      <div class="skeleton filters-skeleton"></div>
      <div class="skeleton card-skeleton"></div>
      <div class="skeleton card-skeleton"></div>
    } @else if (error()) {
      <section class="state" role="alert">
        <h2>Couldn't load this page.</h2>
        <p>{{ error() }}</p>
        <button (click)="load()">Retry</button>
      </section>
    } @else if (!filtered().length) {
      <section class="state">
        <i class="fa-solid fa-house-circle-xmark"></i>
        <h2>No properties match these filters.</h2>
        <p>Create a property listing to start managing it here.</p>
        <a class="primary" routerLink="/account/manage/properties/new" [queryParams]="createQuery()"
          >Add Property</a
        >
      </section>
    } @else {
      <div class="cards">
        @for (p of filtered(); track p.id) {
          <article class="listing-card">
            <sp-image [src]="p.images[0]?.image || null" [alt]="p.title" ratio="4 / 3" />
            <div class="listing-copy">
              <div class="title-row">
                <div>
                  <h2>{{ p.title }}</h2>
                  <p>{{ p.public_id }} · {{ p.suburb ? p.suburb + ', ' : '' }}{{ p.town }}</p>
                </div>
                <sp-manage-status [status]="p.status" />
              </div>
              <p class="price">{{ p.listing_type }} · {{ formatMoney(p.price, p.currency) }}</p>
              <p class="facts">
                <span><i class="fa-solid fa-bed"></i> {{ p.bedrooms ?? '—' }} beds</span
                ><span><i class="fa-solid fa-bath"></i> {{ p.bathrooms ?? '—' }} baths</span>
                @if (p.floor_area) {
                  <span><i class="fa-solid fa-ruler-combined"></i> {{ p.floor_area }} m²</span>
                }
              </p>
              <p class="state-copy">{{ statusCopy(p) }}</p>
              @if (p.status === 'CHANGES_REQUESTED') {
                <p class="feedback">
                  <i class="fa-solid fa-circle-info"></i> Review the requested changes, then
                  resubmit.
                </p>
              }
              <sp-quality-score
                [score]="p.quality?.score || 0"
                [suggestions]="p.quality?.suggestions || []"
              />
            </div>
            <footer>
              <div class="badges">
                <sp-manage-status [status]="p.availability_status" /><small
                  >Updated {{ p.updated_at | date: 'mediumDate' }}</small
                >
              </div>
              <div class="actions">
                <a class="primary" [routerLink]="['/account/manage/properties', p.id, 'edit']"
                  >Edit</a
                >
                @if (p.status === 'PUBLISHED') {
                  <a [routerLink]="['/properties', p.slug]">View public</a>
                }
                @if (canSubmit(p)) {
                  <button (click)="submit(p)">
                    {{ p.status === 'CHANGES_REQUESTED' ? 'Resubmit' : 'Submit' }}
                  </button>
                }
                <details>
                  <summary aria-label="More property actions">
                    <i class="fa-solid fa-ellipsis"></i>
                  </summary>
                  <div>
                    @if (p.status === 'PUBLISHED') {
                      <button (click)="pause(p)">Pause listing</button>
                    }
                    @if (p.status === 'PUBLISHED' || p.status === 'PAUSED') {
                      <button (click)="confirm(p)">Confirm availability</button>
                    }
                  </div>
                </details>
              </div>
            </footer>
          </article>
        }
      </div>
    }
  </section>`,
  styles: [
    `
      .workspace {
        display: grid;
        gap: 1rem;
        max-width: 1160px;
      }
      .page-head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: end;
      }
      .page-head h1,
      .page-head p,
      h2,
      p {
        margin: 0;
      }
      .page-head p,
      .listing-copy > p,
      small {
        color: var(--slate);
      }
      .primary,
      button,
      a {
        min-height: 42px;
        box-sizing: border-box;
        padding: 0.6rem 0.8rem;
        border: 1px solid var(--line);
        border-radius: 0.55rem;
        background: #fff;
        color: var(--midnight);
        font: inherit;
        font-weight: 850;
        text-decoration: none;
        cursor: pointer;
      }
      .primary {
        border-color: var(--teal);
        background: var(--teal);
        color: #fff;
      }
      .filters {
        display: grid;
        gap: 0.7rem;
        padding: 0.8rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
      }
      .filters label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid var(--line);
        border-radius: 0.55rem;
        padding: 0 0.65rem;
        color: var(--slate);
      }
      input {
        width: 100%;
        border: 0;
        padding: 0.68rem 0;
        font: inherit;
        outline: 0;
      }
      .chips {
        display: flex;
        gap: 0.45rem;
        overflow: auto;
        padding-bottom: 0.1rem;
      }
      .chips button {
        white-space: nowrap;
        min-height: 36px;
        padding: 0.4rem 0.65rem;
      }
      .chips .active {
        background: var(--midnight);
        color: #fff;
        border-color: var(--midnight);
      }
      .chips span {
        opacity: 0.7;
      }
      .cards {
        display: grid;
        gap: 0.8rem;
      }
      .listing-card {
        display: grid;
        grid-template-columns: 150px minmax(0, 1fr);
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
      }
      .listing-card sp-image {
        border-radius: 0.7rem;
        overflow: hidden;
      }
      .listing-copy {
        display: grid;
        gap: 0.55rem;
      }
      .title-row {
        display: flex;
        justify-content: space-between;
        gap: 0.7rem;
      }
      .title-row h2 {
        font-size: 1.05rem;
      }
      .title-row p {
        margin-top: 0.18rem;
        font-size: 0.84rem;
      }
      .price {
        font-weight: 850;
        color: var(--midnight) !important;
      }
      .facts {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        font-size: 0.84rem;
      }
      .facts i,
      .feedback i {
        color: var(--teal);
      }
      .state-copy {
        font-size: 0.87rem;
      }
      .feedback {
        padding: 0.55rem;
        border-radius: 0.5rem;
        background: #fff6e6;
        color: #815300 !important;
        font-size: 0.84rem;
      }
      footer {
        grid-column: 2;
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        align-items: center;
      }
      .badges,
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        align-items: center;
      }
      .actions details {
        position: relative;
      }
      .actions summary {
        display: grid;
        place-items: center;
        min-width: 42px;
        min-height: 42px;
        border: 1px solid var(--line);
        border-radius: 0.55rem;
        cursor: pointer;
        list-style: none;
      }
      .actions details > div {
        position: absolute;
        right: 0;
        z-index: 2;
        display: grid;
        gap: 0.3rem;
        min-width: 180px;
        padding: 0.4rem;
        border: 1px solid var(--line);
        border-radius: 0.55rem;
        background: #fff;
        box-shadow: 0 10px 25px #122b291a;
      }
      .actions details button {
        text-align: left;
        border: 0;
      }
      .state {
        display: grid;
        justify-items: center;
        gap: 0.55rem;
        padding: 3rem 1rem;
        text-align: center;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
      }
      .state i {
        font-size: 1.8rem;
        color: var(--teal);
      }
      .skeleton {
        border-radius: 1rem;
        background: linear-gradient(90deg, #edf2f0 25%, #f8fbfa 45%, #edf2f0 65%);
        background-size: 300% 100%;
        animation: shimmer 1.2s infinite;
      }
      .filters-skeleton {
        height: 92px;
      }
      .card-skeleton {
        height: 190px;
      }
      @keyframes shimmer {
        to {
          background-position: -100% 0;
        }
      }
      @media (max-width: 680px) {
        .page-head {
          display: grid;
          align-items: stretch;
        }
        .page-head .primary {
          width: 100%;
          text-align: center;
        }
        .listing-card {
          grid-template-columns: 1fr;
        }
        .listing-card sp-image {
          max-width: 220px;
        }
        footer {
          grid-column: auto;
          display: grid;
        }
        .badges {
          justify-content: space-between;
        }
        .actions {
          display: grid;
          grid-template-columns: 1fr auto;
        }
        .actions > a,
        .actions > button {
          width: 100%;
          text-align: center;
        }
        .actions details {
          grid-column: 2;
          grid-row: 1;
        }
        .actions details > div {
          right: 0;
        }
        .title-row {
          align-items: start;
        }
      }
    `,
  ],
})
export class PropertyManagementListComponent {
  private api = inject(PropertyManagementApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  rows = signal<ManagedProperty[]>([]);
  loading = signal(true);
  error = signal('');
  query = signal('');
  filter = signal('all');
  readonly formatMoney = formatMoney;
  filters = [
    { value: 'all', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'pending', label: 'Pending review' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'PAUSED', label: 'Paused' },
  ];
  filtered = computed(() =>
    this.rows().filter(
      (p) =>
        this.matches(p, this.filter()) &&
        (!this.query().trim() ||
          `${p.title} ${p.public_id} ${p.town}`
            .toLowerCase()
            .includes(this.query().trim().toLowerCase())),
    ),
  );
  constructor() {
    this.load();
  }
  private scope(): Record<string, string> {
    const agency = this.route.snapshot.queryParamMap.get('agency');
    return agency ? { agency } : { context: 'individual' };
  }
  createQuery(): Record<string, string> {
    const agency = this.route.snapshot.queryParamMap.get('agency');
    return agency ? { agency } : {};
  }
  matches(p: ManagedProperty, f: string) {
    return (
      f === 'all' ||
      p.status === f ||
      (f === 'pending' && ['SUBMITTED', 'UNDER_REVIEW'].includes(p.status))
    );
  }
  count(f: string) {
    return this.rows().filter((p) => this.matches(p, f)).length;
  }
  canSubmit(p: ManagedProperty) {
    return ['DRAFT', 'REJECTED', 'CHANGES_REQUESTED'].includes(p.status);
  }
  statusCopy(p: ManagedProperty) {
    return p.status === 'PUBLISHED'
      ? 'This listing is visible publicly.'
      : p.status === 'DRAFT'
        ? 'Finish your listing before submitting.'
        : ['SUBMITTED', 'UNDER_REVIEW'].includes(p.status)
          ? 'SurePlace is reviewing this listing.'
          : p.status === 'CHANGES_REQUESTED'
            ? 'Changes are needed before approval.'
            : p.status === 'PAUSED'
              ? 'This listing is currently hidden.'
              : p.status === 'REJECTED'
                ? 'This listing was not approved.'
                : 'Status unavailable.';
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .mine(this.scope())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.rows.set(p.results),
        error: () => this.error.set('Properties could not be loaded.'),
      });
  }
  submit(p: ManagedProperty) {
    this.api.submit(p.id).subscribe({
      next: (x) => {
        this.replace(x);
        this.toast.show('Property submitted for review.', 'success');
      },
      error: () => this.toast.show('Property could not be submitted.', 'error'),
    });
  }
  pause(p: ManagedProperty) {
    if (confirm('Pause this listing? It will no longer appear publicly.'))
      this.api.pause(p.id).subscribe({
        next: (x) => {
          this.replace(x);
          this.toast.show('Property listing paused.', 'success');
        },
        error: () => this.toast.show('Property listing could not be paused.', 'error'),
      });
  }
  confirm(p: ManagedProperty) {
    this.api.confirmAvailability(p.id).subscribe({
      next: (x) => {
        this.replace(x);
        this.toast.show('Property availability confirmed.', 'success');
      },
      error: () => this.toast.show('Availability could not be confirmed.', 'error'),
    });
  }
  private replace(p: ManagedProperty) {
    this.rows.update((xs) => xs.map((x) => (x.id === p.id ? p : x)));
  }
}

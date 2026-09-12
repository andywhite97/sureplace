import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PropertyManagementApiService } from '../../core/api/manage-api.services';
import { ManagedProperty } from '../../core/models/manage.models';
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
  template: `<section class="page">
    <header>
      <h1>Manage properties</h1>
      <a routerLink="/account/manage/listings/new">Add Property</a>
    </header>
    <div class="tools">
      <input
        type="search"
        aria-label="Search properties"
        placeholder="Search title, public ID or town"
        (input)="query.set($any($event.target).value)"
      />
      <div role="group" aria-label="Property status filter">
        @for (f of filters; track f.value) {
          <button [class.active]="filter() === f.value" (click)="filter.set(f.value)">
            {{ f.label }}
          </button>
        }
      </div>
    </div>
    @if (loading()) {
      <div class="skeleton"></div>
    } @else if (error()) {
      <div class="state">
        <p>{{ error() }}</p>
        <button (click)="load()">Retry</button>
      </div>
    } @else if (!filtered().length) {
      <div class="state">
        <h2>No manageable properties found.</h2>
        <a routerLink="/account/manage/listings/new">Add Property</a>
      </div>
    } @else {
      <div class="list">
        @for (p of filtered(); track p.id) {
          <article>
            <sp-image [src]="p.images[0]?.image || null" [alt]="p.title" ratio="4 / 3" />
            <div>
              <h2>{{ p.title }}</h2>
              <p>{{ p.public_id }} &middot; {{ p.suburb ? p.suburb + ', ' : '' }}{{ p.town }}</p>
              <p>{{ p.listing_type }} &middot; {{ formatMoney(p.price, p.currency) }}</p>
              <p class="status-copy">{{ statusCopy(p) }}</p>
              @if (p.status === 'CHANGES_REQUESTED') {
                <p class="feedback">
                  SurePlace feedback: update the requested details, then resubmit.
                </p>
              }
              <sp-quality-score
                [score]="p.quality?.score || 0"
                [suggestions]="p.quality?.suggestions || []"
              />
            </div>
            <aside>
              <sp-manage-status [status]="p.status" /><sp-manage-status
                [status]="p.availability_status"
              /><small>Updated {{ p.updated_at | date: 'mediumDate' }}</small
              ><a [routerLink]="['/account/manage/properties', p.id, 'edit']">Edit</a>
              @if (p.status === 'PUBLISHED') {
                <a [routerLink]="['/properties', p.slug]">View Public Listing</a
                ><button (click)="pause(p)">Pause</button>
              }
              @if (
                p.status === 'DRAFT' || p.status === 'REJECTED' || p.status === 'CHANGES_REQUESTED'
              ) {
                <button (click)="submit(p)">
                  {{ p.status === 'CHANGES_REQUESTED' ? 'Resubmit' : 'Submit for Review' }}
                </button>
              }
              @if (p.status === 'PUBLISHED' || p.status === 'PAUSED') {
                <button (click)="confirm(p)">Confirm Availability</button>
              }
            </aside>
          </article>
        }
      </div>
    }
  </section>`,
  styles: [
    `
      .page {
        display: grid;
        gap: 1rem;
      }
      header,
      .tools {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
      }
      header a {
        background: var(--teal);
        color: #fff;
      }
      input {
        padding: 0.6rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        min-width: 260px;
      }
      button,
      a {
        padding: 0.5rem 0.65rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        color: var(--midnight);
        text-decoration: none;
        font-weight: 800;
      }
      .active {
        background: var(--midnight);
        color: #fff;
      }
      .list {
        display: grid;
        gap: 0.8rem;
      }
      article {
        display: grid;
        grid-template-columns: 130px 1fr auto;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
      }
      h1,
      h2,
      p {
        margin: 0;
      }
      p,
      small {
        color: var(--slate);
      }
      .status-copy {
        font-weight: 750;
      }
      .feedback {
        padding: 0.45rem 0.6rem;
        border-left: 3px solid var(--amber);
        background: #fff8e8;
      }
      aside {
        display: grid;
        gap: 0.45rem;
        align-content: start;
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
      .skeleton {
        height: 200px;
        background: var(--mist);
        border-radius: var(--radius-sm);
      }
      @media (max-width: 760px) {
        header,
        .tools {
          display: grid;
          justify-content: stretch;
        }
        article {
          grid-template-columns: 1fr;
        }
        aside {
          display: flex;
          flex-wrap: wrap;
        }
        input {
          min-width: 0;
          width: 100%;
        }
      }
    `,
  ],
})
export class PropertyManagementListComponent {
  private api = inject(PropertyManagementApiService);
  rows = signal<ManagedProperty[]>([]);
  loading = signal(true);
  error = signal('');
  query = signal('');
  filter = signal('all');
  filters = [
    { value: 'all', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'pending', label: 'Pending review' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'PAUSED', label: 'Paused' },
  ];
  filtered = computed(() => {
    const q = this.query().trim().toLowerCase(),
      f = this.filter();
    return this.rows().filter((p) => {
      const status =
        f === 'all' ||
        p.status === f ||
        (f === 'pending' && ['SUBMITTED', 'UNDER_REVIEW'].includes(p.status));
      const match = !q || `${p.title} ${p.public_id} ${p.town}`.toLowerCase().includes(q);
      return status && match;
    });
  });
  readonly formatMoney = formatMoney;
  statusCopy(p: ManagedProperty) {
    if (['SUBMITTED', 'UNDER_REVIEW'].includes(p.status))
      return 'SurePlace is reviewing this listing.';
    if (p.status === 'CHANGES_REQUESTED') return 'Update the listing and resubmit it for review.';
    if (p.status === 'PUBLISHED') return 'This listing is visible publicly.';
    if (p.status === 'DRAFT') return 'Finish the draft and submit it for review.';
    if (p.status === 'REJECTED') return 'This listing was not approved.';
    if (p.status === 'PAUSED') return 'This listing is paused and not public.';
    if (p.status === 'SUSPENDED') return 'This listing is suspended by SurePlace.';
    return 'Status unavailable.';
  }
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api
      .mine()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.rows.set(p.results),
        error: () => this.error.set('Properties could not be loaded.'),
      });
  }
  submit(p: ManagedProperty) {
    this.api.submit(p.id).subscribe((x) => this.replace(x));
  }
  pause(p: ManagedProperty) {
    if (confirm('Pause this listing? It will no longer appear publicly.'))
      this.api.pause(p.id).subscribe((x) => this.replace(x));
  }
  confirm(p: ManagedProperty) {
    this.api.confirmAvailability(p.id).subscribe((x) => this.replace(x));
  }
  private replace(p: ManagedProperty) {
    this.rows.update((xs) => xs.map((x) => (x.id === p.id ? p : x)));
  }
}

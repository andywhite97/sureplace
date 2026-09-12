import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StaffApiService } from '../../core/api/staff-api.service';
import { StaffProperty } from '../../core/models/staff.models';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, SmartImageComponent],
  template: `<section class="staff-page">
    <header>
      <div>
        <p class="eyebrow">Property moderation</p>
        <h1>Listing queue</h1>
      </div>
      <button type="button" (click)="load()">
        <i class="fa-solid fa-rotate" aria-hidden="true"></i> Refresh
      </button>
    </header>

    <div class="tools">
      <label>
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="search"
          placeholder="Search title, public ID, owner, town"
          [value]="search()"
          (input)="search.set($any($event.target).value); load()"
        />
      </label>
      <select
        aria-label="Filter by status"
        [value]="status()"
        (change)="status.set($any($event.target).value); load()"
      >
        @for (option of statusOptions; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
      <select
        aria-label="Sort listings"
        [value]="ordering()"
        (change)="ordering.set($any($event.target).value); load()"
      >
        <option value="-created_at">Newest</option>
        <option value="created_at">Oldest</option>
        <option value="-updated_at">Recently updated</option>
        <option value="-price">Highest price</option>
        <option value="price">Lowest price</option>
      </select>
    </div>

    @if (loading()) {
      <div class="skeleton"></div>
    } @else if (error()) {
      <div class="state">
        <p>{{ error() }}</p>
        <button type="button" (click)="load()">Retry</button>
      </div>
    } @else if (!rows().length) {
      <div class="state">
        <h2>No listings match this queue.</h2>
        <p>Try a different status or search term.</p>
      </div>
    } @else {
      <div class="queue">
        @for (item of rows(); track item.id) {
          <article>
            <sp-image [src]="item.images[0]?.image || null" [alt]="item.title" ratio="4 / 3" />
            <div class="main">
              <a [routerLink]="['/staff/listings', item.id]">{{ item.title }}</a>
              <p>
                {{ item.public_id }} &middot; {{ item.property_type }} &middot;
                {{ item.town || 'No town' }}
              </p>
              <p>
                {{ item.owner.email }}
                @if (item.agency) {
                  &middot; {{ item.agency.name }}
                }
              </p>
              @if (item.latest_note) {
                <small class="note">{{ item.latest_note }}</small>
              }
            </div>
            <div class="meta">
              <strong>{{ formatMoney(item.price, item.currency) }}</strong>
              <span [class]="statusClass(item.status)">{{ item.status_label }}</span>
              @if (item.open_reports_count) {
                <span class="reports"
                  ><i class="fa-solid fa-flag" aria-hidden="true"></i>
                  {{ item.open_reports_count }}</span
                >
              }
              <small>Updated {{ item.updated_at | date: 'mediumDate' }}</small>
            </div>
          </article>
        }
      </div>
    }
  </section>`,
  styles: [
    `
      .staff-page {
        display: grid;
        gap: 1rem;
      }
      header,
      .tools {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
      }
      h1,
      h2,
      p {
        margin: 0;
      }
      .eyebrow {
        color: var(--teal);
        font-weight: 800;
        text-transform: uppercase;
      }
      .tools,
      article,
      .state,
      .skeleton {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
      }
      .tools {
        padding: 0.7rem;
      }
      label {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid var(--line);
        border-radius: 0.45rem;
        padding: 0 0.65rem;
      }
      input,
      select {
        min-height: 42px;
        border: 1px solid var(--line);
        border-radius: 0.45rem;
        background: #fff;
        padding: 0 0.65rem;
      }
      label input {
        width: 100%;
        border: 0;
        padding: 0;
      }
      button {
        min-height: 42px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: var(--midnight);
        color: #fff;
        padding: 0 0.9rem;
        font-weight: 800;
      }
      .queue {
        display: grid;
        gap: 0.75rem;
      }
      article {
        display: grid;
        grid-template-columns: 116px minmax(0, 1fr) auto;
        gap: 0.9rem;
        padding: 0.85rem;
      }
      .main {
        display: grid;
        align-content: start;
        gap: 0.3rem;
      }
      .main a {
        color: var(--midnight);
        font-weight: 900;
        text-decoration: none;
        font-size: 1.03rem;
      }
      p,
      small,
      .tools i {
        color: var(--slate);
      }
      .note {
        padding-left: 0.65rem;
        border-left: 3px solid var(--line);
      }
      .meta {
        display: grid;
        justify-items: end;
        align-content: start;
        gap: 0.4rem;
        min-width: 150px;
      }
      .status,
      .reports {
        padding: 0.25rem 0.45rem;
        border-radius: 999px;
        background: var(--mist);
        font-size: 0.82rem;
        font-weight: 800;
      }
      .status.review {
        color: #6f5300;
        background: #fff4d8;
      }
      .status.live {
        color: #08705f;
        background: #ddf6ef;
      }
      .status.danger {
        color: var(--danger);
        background: #ffe8eb;
      }
      .state {
        display: grid;
        place-items: center;
        gap: 0.5rem;
        padding: 2.5rem 1rem;
        text-align: center;
      }
      .skeleton {
        height: 300px;
      }
      @media (max-width: 780px) {
        header,
        .tools {
          display: grid;
          justify-content: stretch;
        }
        article {
          grid-template-columns: 92px minmax(0, 1fr);
        }
        .meta {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
          min-width: 0;
        }
      }
    `,
  ],
})
export class StaffListingsComponent {
  private api = inject(StaffApiService);
  private route = inject(ActivatedRoute);
  rows = signal<StaffProperty[]>([]);
  loading = signal(true);
  error = signal('');
  search = signal('');
  status = signal('SUBMITTED,UNDER_REVIEW');
  ordering = signal('-created_at');
  hasRows = computed(() => this.rows().length > 0);
  readonly formatMoney = formatMoney;
  statusOptions = [
    { value: '', label: 'All moderation states' },
    { value: 'SUBMITTED,UNDER_REVIEW', label: 'Awaiting review' },
    { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'SUSPENDED', label: 'Suspended' },
  ];

  constructor() {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status) this.status.set(status);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .properties({
        status: this.status(),
        search: this.search().trim(),
        ordering: this.ordering(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.rows.set(page.results),
        error: () => this.error.set('Listings could not be loaded.'),
      });
  }

  statusClass(status: string) {
    if (['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(status)) return 'status review';
    if (status === 'PUBLISHED') return 'status live';
    if (['REJECTED', 'SUSPENDED'].includes(status)) return 'status danger';
    return 'status';
  }
}

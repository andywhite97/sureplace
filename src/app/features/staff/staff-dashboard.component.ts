import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StaffApiService } from '../../core/api/staff-api.service';
import { StaffProperty, StaffSummary } from '../../core/models/staff.models';
import { formatMoney } from '../../shared/listing/price-format';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `<section class="staff-page">
    <header>
      <p class="eyebrow">Moderation</p>
      <h1>Staff dashboard</h1>
    </header>

    @if (loading()) {
      <div class="skeleton"></div>
    } @else if (error()) {
      <div class="state">
        <p>{{ error() }}</p>
        <button type="button" (click)="load()">Retry</button>
      </div>
    } @else {
      <div class="metrics">
        @for (metric of metricCards(); track metric.label) {
          <a [routerLink]="metric.link" [queryParams]="metric.query">
            <i [class]="metric.icon" aria-hidden="true"></i>
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </a>
        }
      </div>
      <section class="panel">
        <div class="panel-head">
          <h2>Latest listings needing attention</h2>
          <a routerLink="/staff/listings">Open queue</a>
        </div>
        @if (!queue().length) {
          <p class="muted">No property listings are waiting in the staff queue.</p>
        } @else {
          <div class="rows">
            @for (item of queue(); track item.id) {
              <a [routerLink]="['/staff/listings', item.id]">
                <span>
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.public_id }} &middot; {{ item.town || 'No town' }}</small>
                </span>
                <span>{{ formatMoney(item.price, item.currency) }}</span>
                <span class="status">{{ item.status_label }}</span>
                <small>{{ item.updated_at | date: 'mediumDate' }}</small>
              </a>
            }
          </div>
        }
      </section>
    }
  </section>`,
  styles: [
    `
      .staff-page {
        display: grid;
        gap: 1rem;
      }
      header h1,
      header p,
      h2,
      .muted {
        margin: 0;
      }
      .eyebrow {
        color: var(--teal);
        font-weight: 800;
        text-transform: uppercase;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.85rem;
      }
      .metrics a,
      .panel {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
      }
      .metrics a {
        min-height: 112px;
        display: grid;
        gap: 0.35rem;
        padding: 1rem;
        color: var(--midnight);
        text-decoration: none;
      }
      .metrics i {
        color: var(--teal);
      }
      .metrics span,
      .muted,
      small {
        color: var(--slate);
      }
      .metrics strong {
        font-size: 2rem;
      }
      .panel {
        padding: 1rem;
      }
      .panel-head,
      .rows a {
        display: grid;
        grid-template-columns: 1fr auto auto auto;
        gap: 1rem;
        align-items: center;
      }
      .panel-head {
        margin-bottom: 0.75rem;
      }
      .panel-head a {
        color: var(--teal);
        font-weight: 800;
      }
      .rows {
        display: grid;
      }
      .rows a {
        min-height: 58px;
        border-top: 1px solid var(--line);
        color: var(--midnight);
        text-decoration: none;
      }
      .rows strong,
      .rows small {
        display: block;
      }
      .status {
        padding: 0.25rem 0.45rem;
        border-radius: 999px;
        background: var(--mist);
        font-size: 0.82rem;
        font-weight: 800;
      }
      .state,
      .skeleton {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
      }
      .state {
        padding: 2rem;
        text-align: center;
      }
      .skeleton {
        height: 280px;
      }
      button {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: var(--midnight);
        color: #fff;
        padding: 0.65rem 0.9rem;
      }
      @media (max-width: 880px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .panel-head,
        .rows a {
          grid-template-columns: 1fr;
          gap: 0.35rem;
          padding: 0.7rem 0;
        }
      }
      @media (max-width: 560px) {
        .metrics {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StaffDashboardComponent {
  private api = inject(StaffApiService);
  summary = signal<StaffSummary | null>(null);
  queue = signal<StaffProperty[]>([]);
  loading = signal(true);
  error = signal('');
  readonly formatMoney = formatMoney;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.summary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.error.set('Staff dashboard could not be loaded.'),
    });
    this.api
      .properties({ status: 'SUBMITTED,UNDER_REVIEW', ordering: '-updated_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.queue.set(page.results.slice(0, 8)),
        error: () => this.error.set('Staff dashboard could not be loaded.'),
      });
  }

  metricCards() {
    const s = this.summary();
    return [
      {
        label: 'Awaiting Review',
        value: s?.awaiting_review ?? 0,
        icon: 'fa-solid fa-hourglass-half',
        link: '/staff/listings',
        query: { status: 'SUBMITTED,UNDER_REVIEW' },
      },
      {
        label: 'Approved Today',
        value: s?.approved_today ?? 0,
        icon: 'fa-solid fa-circle-check',
        link: '/staff/listings',
        query: { status: 'PUBLISHED' },
      },
      {
        label: 'Changes Requested',
        value: s?.changes_requested ?? 0,
        icon: 'fa-solid fa-pen-to-square',
        link: '/staff/listings',
        query: { status: 'CHANGES_REQUESTED' },
      },
      {
        label: 'Rejected',
        value: s?.rejected ?? 0,
        icon: 'fa-solid fa-circle-xmark',
        link: '/staff/listings',
        query: { status: 'REJECTED' },
      },
      {
        label: 'Suspended',
        value: s?.suspended ?? 0,
        icon: 'fa-solid fa-ban',
        link: '/staff/listings',
        query: { status: 'SUSPENDED' },
      },
      {
        label: 'Open Reports',
        value: s?.open_reports ?? 0,
        icon: 'fa-solid fa-flag',
        link: '/staff/reports',
        query: {},
      },
    ];
  }
}

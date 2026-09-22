import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { StaffApiService } from '../../core/api/staff-api.service';
import { StaffReportReview } from '../../core/models/staff.models';
import { normalizeApiError } from '../../core/api/error-normalizer';

@Component({
  standalone: true,
  imports: [DatePipe],
  template: `
    <section class="page">
      <header>
        <div>
          <p class="eyebrow">Trust & safety</p>
          <h1>Listing reports</h1>
          <p>Review concerns raised by SurePlace members and record each decision.</p>
        </div>
        <div class="summary">
          <strong>{{ openCount() }}</strong
          ><span>Needs attention</span>
        </div>
      </header>
      <nav aria-label="Report status">
        @for (item of filters; track item.value) {
          <button
            type="button"
            [class.active]="filter() === item.value"
            (click)="filter.set(item.value)"
          >
            {{ item.label }}
          </button>
        }
      </nav>
      @if (loading()) {
        <div class="state" role="status">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <p>Loading reports…</p>
        </div>
      } @else if (error()) {
        <div class="state error">
          <h2>Reports could not be loaded</h2>
          <p>{{ error() }}</p>
          <button type="button" (click)="load()">Try again</button>
        </div>
      } @else if (!visible().length) {
        <div class="state">
          <i class="fa-regular fa-circle-check"></i>
          <h2>No reports in this view</h2>
          <p>There is nothing requiring action here right now.</p>
        </div>
      } @else {
        <div class="list">
          @for (report of visible(); track report.id) {
            <article>
              <div class="icon">
                <i [class]="report.property ? 'fa-solid fa-building' : 'fa-solid fa-bed'"></i>
              </div>
              <div class="copy">
                <div class="meta">
                  <span class="status" [attr.data-status]="report.status">{{
                    statusLabel(report.status)
                  }}</span
                  ><span>{{ report.created_at | date: 'medium' }}</span>
                </div>
                <h2>{{ reasonLabel(report.reason) }}</h2>
                <p>{{ report.details || 'No additional details were provided.' }}</p>
                <small
                  >{{ report.property ? 'Property' : 'Stay' }} · Reference
                  {{ target(report) }}</small
                >
                @if (report.resolution_notes) {
                  <blockquote>{{ report.resolution_notes }}</blockquote>
                }
              </div>
              @if (report.status === 'OPEN' || report.status === 'UNDER_REVIEW') {
                <div class="actions">
                  @if (report.status === 'OPEN') {
                    <button
                      type="button"
                      (click)="act(report, 'assign')"
                      [disabled]="busy() === report.id"
                    >
                      Start review
                    </button>
                  }
                  <button
                    class="resolve"
                    type="button"
                    (click)="act(report, 'resolve')"
                    [disabled]="busy() === report.id"
                  >
                    Resolve
                  </button>
                  <button
                    class="dismiss"
                    type="button"
                    (click)="act(report, 'dismiss')"
                    [disabled]="busy() === report.id"
                  >
                    Dismiss
                  </button>
                </div>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 1.25rem;
      }
      header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 2rem;
        padding: 1.5rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
      }
      h1 {
        margin: 0.2rem 0;
        font-size: clamp(2rem, 4vw, 3rem);
      }
      header p {
        margin: 0;
        color: var(--slate);
      }
      .eyebrow {
        color: var(--teal) !important;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .summary {
        display: grid;
        min-width: 145px;
        padding: 1rem;
        border-radius: 0.8rem;
        background: var(--mist);
        text-align: center;
      }
      .summary strong {
        font-size: 2rem;
        color: var(--teal);
      }
      .summary span {
        font-size: 0.75rem;
        color: var(--slate);
        font-weight: 800;
      }
      nav {
        display: flex;
        gap: 0.5rem;
        overflow: auto;
      }
      nav button,
      .actions button,
      .state button {
        min-height: 40px;
        padding: 0 0.9rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #fff;
        color: var(--midnight);
        font: inherit;
        font-weight: 800;
      }
      nav button.active {
        border-color: var(--teal);
        background: var(--teal);
        color: #fff;
      }
      .list {
        display: grid;
        gap: 0.75rem;
      }
      article {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 1rem;
        padding: 1.2rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
      }
      .icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border-radius: 0.75rem;
        background: var(--mist);
        color: var(--teal);
      }
      .copy h2 {
        margin: 0.45rem 0;
        font-size: 1.05rem;
      }
      .copy p {
        margin: 0 0 0.6rem;
        color: var(--slate);
        line-height: 1.55;
      }
      .copy small {
        color: var(--slate);
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        color: var(--slate);
        font-size: 0.72rem;
      }
      .status {
        padding: 0.25rem 0.5rem;
        border-radius: 999px;
        background: #fff2cb;
        color: #775700;
        font-weight: 900;
      }
      .status[data-status='RESOLVED'] {
        background: #e4f7ef;
        color: #08705f;
      }
      .status[data-status='DISMISSED'] {
        background: #eef1f2;
        color: #58676a;
      }
      .status[data-status='UNDER_REVIEW'] {
        background: #e4f0fb;
        color: #235c86;
      }
      .actions {
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
      }
      .actions .resolve {
        border-color: var(--teal);
        color: var(--teal);
      }
      .actions .dismiss {
        color: #8a4650;
      }
      .actions button:disabled {
        opacity: 0.55;
      }
      .state {
        display: grid;
        place-items: center;
        min-height: 320px;
        padding: 2rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
        text-align: center;
      }
      .state i {
        font-size: 2rem;
        color: var(--teal);
      }
      .state h2,
      .state p {
        margin: 0.2rem;
      }
      .state p {
        color: var(--slate);
      }
      blockquote {
        margin: 0.75rem 0 0;
        padding: 0.7rem;
        border-left: 3px solid var(--teal);
        background: var(--mist);
        color: var(--slate);
      }
      @media (max-width: 760px) {
        header {
          align-items: stretch;
          flex-direction: column;
        }
        .summary {
          grid-template-columns: auto 1fr;
          align-items: center;
          text-align: left;
        }
        article {
          grid-template-columns: auto 1fr;
        }
        .actions {
          grid-column: 1/-1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }
        .actions button {
          padding: 0.55rem 0.35rem;
          font-size: 0.78rem;
        }
      }
    `,
  ],
})
export class StaffReportsComponent {
  private api = inject(StaffApiService);
  reports = signal<StaffReportReview[]>([]);
  loading = signal(true);
  error = signal('');
  busy = signal<string | null>(null);
  filter = signal('ACTIVE');
  filters = [
    { label: 'Needs attention', value: 'ACTIVE' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Dismissed', value: 'DISMISSED' },
    { label: 'All', value: 'ALL' },
  ];
  visible = computed(() =>
    this.reports().filter(
      (r) =>
        this.filter() === 'ALL' ||
        (this.filter() === 'ACTIVE'
          ? ['OPEN', 'UNDER_REVIEW'].includes(r.status)
          : r.status === this.filter()),
    ),
  );
  openCount = computed(
    () => this.reports().filter((r) => ['OPEN', 'UNDER_REVIEW'].includes(r.status)).length,
  );

  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .reports()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.reports.set(page.results),
        error: (e) => this.error.set(normalizeApiError(e).message),
      });
  }
  act(report: StaffReportReview, action: 'assign' | 'resolve' | 'dismiss') {
    const notes =
      action === 'assign'
        ? ''
        : (window.prompt(
            action === 'resolve'
              ? 'Resolution notes (optional)'
              : 'Why is this report being dismissed? (optional)',
            '',
          ) ?? null);
    if (notes === null) return;
    this.busy.set(report.id);
    const request =
      action === 'assign'
        ? this.api.assignReport(report.id)
        : action === 'resolve'
          ? this.api.resolveReport(report.id, notes)
          : this.api.dismissReport(report.id, notes);
    request.pipe(finalize(() => this.busy.set(null))).subscribe({
      next: (updated) =>
        this.reports.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row))),
      error: (e) => this.error.set(normalizeApiError(e).message),
    });
  }
  target(report: StaffReportReview) {
    return (report.property || report.stay || report.id).slice(0, 8).toUpperCase();
  }
  reasonLabel(reason: string) {
    return reason
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase());
  }
  statusLabel(status: string) {
    return status
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase());
  }
}

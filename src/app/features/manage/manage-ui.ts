import { Component, input } from '@angular/core';

@Component({
  selector: 'sp-manage-status',
  standalone: true,
  template: `<span [class]="tone()">{{ label() }}</span>`,
  styles: [
    `
      span {
        display: inline-flex;
        width: max-content;
        border-radius: 999px;
        padding: 0.22rem 0.55rem;
        font-size: 0.74rem;
        font-weight: 850;
        background: var(--mist);
        color: var(--slate);
      }
      .good {
        background: #e6f7ef;
        color: #17633b;
      }
      .warn {
        background: #fff4dd;
        color: #8a5a00;
      }
      .info {
        background: #e9f1fb;
        color: #235f9f;
      }
      .muted {
        background: #edf0f0;
        color: #60706f;
      }
      .bad {
        background: #fde8e8;
        color: #9b2525;
      }
    `,
  ],
})
export class ManageStatusComponent {
  status = input.required<string>();
  label() {
    const labels: Record<string, string> = {
      DRAFT: 'Draft',
      SUBMITTED: 'Pending review',
      UNDER_REVIEW: 'Pending review',
      CHANGES_REQUESTED: 'Changes requested',
      PUBLISHED: 'Published',
      PAUSED: 'Paused',
      REJECTED: 'Rejected',
      SUSPENDED: 'Suspended',
      AVAILABLE: 'Available',
      UNDER_OFFER: 'Under offer',
      UNAVAILABLE: 'Unavailable',
      UNKNOWN: 'Availability not confirmed',
      APPROVED: 'Verified',
      PENDING: 'Pending review',
      CANCELLED: 'Cancelled',
      EXPIRED: 'Expired',
      NOT_STARTED: 'Not started',
    };
    return labels[this.status()] || 'Status unavailable';
  }
  tone() {
    if (['PUBLISHED', 'CONFIRMED', 'APPROVED', 'COMPLETED', 'AVAILABLE'].includes(this.status()))
      return 'good';
    if (['CHANGES_REQUESTED', 'UNDER_REVIEW'].includes(this.status())) return 'info';
    if (['PAUSED', 'INACTIVE', 'NOT_STARTED'].includes(this.status())) return 'muted';
    if (
      ['REJECTED', 'SUSPENDED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'UNAVAILABLE'].includes(
        this.status(),
      )
    )
      return 'bad';
    return 'warn';
  }
}

@Component({
  selector: 'sp-quality-score',
  standalone: true,
  template: `<section class="quality-card">
    <header>
      <span>
        <small>Listing quality</small>
        <strong>{{ qualityLabel() }}</strong>
      </span>
      <b>{{ score() }}%</b>
    </header>
    <meter
      min="0"
      max="100"
      [value]="score()"
      [attr.aria-label]="'Listing quality ' + score() + '%'"
    ></meter>
    @if (suggestions().length) {
      <p>Recommended next steps</p>
      <ul>
        @for (item of suggestions(); track item) {
          <li>{{ suggestionLabel(item) }}</li>
        }
      </ul>
    }
  </section>`,
  styles: [
    `
      .quality-card {
        display: grid;
        gap: 0.65rem;
        padding: 0.7rem;
        border: 1px solid var(--line);
        border-radius: 0.8rem;
        background: #fbfdfc;
      }
      header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
      }
      header span {
        display: grid;
        gap: 0.1rem;
      }
      small,
      p {
        margin: 0;
        color: var(--slate);
        font-size: 0.78rem;
        font-weight: 850;
      }
      strong {
        color: var(--midnight);
      }
      b {
        display: inline-grid;
        place-items: center;
        min-width: 46px;
        min-height: 34px;
        border-radius: 0.55rem;
        color: var(--teal);
        background: #e6f5f1;
      }
      meter {
        width: 100%;
        height: 0.6rem;
      }
      ul {
        margin: 0.2rem 0 0;
        padding-left: 1.1rem;
        color: var(--slate);
        font-size: 0.86rem;
      }
      li:nth-child(n + 4) {
        display: none;
      }
    `,
  ],
})
export class QualityScoreComponent {
  score = input(0);
  suggestions = input<string[]>([]);
  qualityLabel() {
    if (this.score() >= 85) return 'Ready for review';
    if (this.score() >= 65) return 'Nearly ready';
    return 'Needs a little work';
  }
  suggestionLabel(item: string) {
    return item === 'Add at least 5 photos' ? 'Add more photos to improve your listing' : item;
  }
}

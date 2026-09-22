import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ViewingsApiService } from '../../core/api/account-api.services';
import { ViewingRequest } from '../../core/models/account.models';
import { ToastService } from '../../core/services/toast.service';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { StatusBadgeComponent } from './account-ui';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, SmartImageComponent, StatusBadgeComponent],
  template: `<section class="account-page">
    <header class="page-heading">
      <div class="heading-copy">
        <h1>Viewing Requests</h1>
        <p>Keep track of your property viewing appointments.</p>
      </div>
      <div class="filters" role="group" aria-label="Viewing filter">
        <button
          type="button"
          [class.active]="filter() === 'upcoming'"
          [attr.aria-pressed]="filter() === 'upcoming'"
          (click)="filter.set('upcoming')"
        >
          Upcoming
        </button>
        <button
          type="button"
          [class.active]="filter() === 'past'"
          [attr.aria-pressed]="filter() === 'past'"
          (click)="filter.set('past')"
        >
          Past
        </button>
        <button
          type="button"
          [class.active]="filter() === 'cancelled'"
          [attr.aria-pressed]="filter() === 'cancelled'"
          (click)="filter.set('cancelled')"
        >
          Cancelled
        </button>
      </div>
    </header>
    @if (loading()) {
      <div class="skeleton"></div>
    } @else if (error()) {
      <div class="state">
        <p>{{ error() }}</p>
        <button (click)="load()">Retry</button>
      </div>
    } @else if (!filtered().length) {
      <div class="state">
        <i class="fa-regular fa-calendar" aria-hidden="true"></i>
        <h2>No {{ filter() }} viewing requests.</h2>
        <p>Request a viewing from a property page.</p>
        <a routerLink="/properties">Explore properties</a>
      </div>
    } @else {
      <div class="results-heading">
        <strong
          >{{ filtered().length }} {{ filter() }} request{{
            filtered().length === 1 ? '' : 's'
          }}</strong
        >
      </div>
      <div class="list">
        @for (v of filtered(); track v.id) {
          <article class="viewing-card">
            <sp-image [src]="v.property_image" [alt]="v.property_title" ratio="4 / 3" />
            <div class="viewing-details">
              <div class="title-row">
                <h2>{{ v.property_title || 'Property viewing' }}</h2>
                <sp-status-badge [status]="v.status" />
              </div>
              <p class="location">
                <i class="fa-solid fa-location-dot" aria-hidden="true"></i>{{ location(v) }}
              </p>
              <div class="schedule">
                <i class="fa-regular fa-calendar-check" aria-hidden="true"></i
                ><span
                  ><small>Requested viewing</small
                  ><strong
                    >{{ v.requested_date | date: 'EEE, d MMM y' }} ·
                    {{ displayTime(v.requested_time) }}</strong
                  ></span
                >
              </div>
              @if (v.alternative_date) {
                <p class="alternative">
                  Alternative: {{ v.alternative_date | date: 'd MMM y' }} at
                  {{ displayTime(v.alternative_time) }}
                </p>
              }
              <small class="created">Requested on {{ v.created_at | date: 'mediumDate' }}</small>
            </div>
            <aside class="card-actions">
              @if (v.conversation) {
                <a class="primary-action" [routerLink]="['/account/messages', v.conversation]"
                  ><i class="fa-regular fa-message" aria-hidden="true"></i>Open conversation</a
                >
              }
              <a class="secondary-action" [routerLink]="['/properties', v.property_slug]"
                ><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>View
                property</a
              >
              @if (canCancel(v)) {
                <button class="cancel-action" type="button" (click)="cancel(v)" [disabled]="busy()">
                  Cancel request
                </button>
              }
            </aside>
          </article>
        }
      </div>
    }
  </section>`,
  styles: [
    `
      .account-page {
        display: grid;
        gap: 0.85rem;
      }
      .page-heading {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: end;
      }
      .heading-copy {
        display: grid;
        gap: 0.25rem;
      }
      .heading-copy p {
        color: var(--slate);
        font-size: 0.88rem;
      }
      .filters {
        display: flex;
        gap: 0.4rem;
        padding: 0.25rem;
        border-radius: 0.75rem;
        background: var(--mist);
      }
      .filters button {
        min-height: 38px;
        padding: 0.45rem 0.8rem;
        border: 0;
        border-radius: 0.6rem;
        background: transparent;
        color: var(--midnight);
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }
      .filters button.active {
        background: var(--teal);
        color: #fff;
        box-shadow: 0 3px 10px rgba(0, 150, 136, 0.18);
      }
      .filters button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--teal) 24%, transparent);
        outline-offset: 2px;
      }
      .results-heading {
        color: var(--slate);
        font-size: 0.78rem;
        text-transform: capitalize;
      }
      .list {
        display: grid;
        gap: 0.7rem;
      }
      .viewing-card {
        display: grid;
        grid-template-columns: 108px minmax(0, 1fr) 190px;
        align-items: stretch;
        gap: 1rem;
        padding: 0.85rem;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 5px 18px rgba(15, 45, 52, 0.035);
      }
      .viewing-card > sp-image {
        width: 108px;
        min-height: 108px;
        overflow: hidden;
        border-radius: 11px;
      }
      .viewing-details {
        display: grid;
        min-width: 0;
        align-content: center;
        gap: 0.28rem;
      }
      .title-row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.65rem;
      }
      .title-row h2 {
        min-width: 0;
        overflow: hidden;
        font-size: 1.05rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .location {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--slate);
        font-size: 0.78rem;
      }
      .location i {
        color: var(--teal);
        font-size: 0.7rem;
      }
      .schedule {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        margin-top: 0.15rem;
      }
      .schedule > i {
        display: grid;
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        place-items: center;
        border-radius: 9px;
        background: #eaf7f5;
        color: var(--teal);
      }
      .schedule > span {
        display: grid;
        gap: 0.05rem;
      }
      .schedule small {
        color: var(--slate);
        font-size: 0.67rem;
      }
      .schedule strong {
        font-size: 0.8rem;
      }
      .alternative,
      .created {
        color: var(--slate);
        font-size: 0.7rem;
      }
      .created {
        opacity: 0.8;
      }
      .card-actions {
        display: grid;
        align-content: center;
        gap: 0.4rem;
        padding-left: 0.9rem;
        border-left: 1px solid var(--line);
      }
      .card-actions a,
      .card-actions button {
        display: inline-flex;
        min-height: 38px;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        padding: 0.45rem 0.65rem;
        border-radius: 9px;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
      }
      .primary-action {
        border: 1px solid var(--teal);
        background: var(--teal);
        color: #fff;
      }
      .secondary-action {
        border: 1px solid #bad4cf;
        background: #fff;
        color: var(--teal);
      }
      .cancel-action {
        min-height: 32px !important;
        border: 0 !important;
        background: transparent !important;
        color: #a43a3a !important;
        font-size: 0.72rem !important;
      }
      .card-actions a:focus-visible,
      .card-actions button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--teal) 22%, transparent);
        outline-offset: 2px;
      }
      h1,
      h2,
      p {
        margin: 0;
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
        min-height: 40px;
        padding: 0.48rem 0.65rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        color: var(--teal);
        font-weight: 800;
        text-decoration: none;
      }
      .skeleton {
        height: 180px;
        background: var(--mist);
        border-radius: var(--radius-sm);
      }
      @media (max-width: 767px) {
        .account-page {
          gap: 0.8rem;
        }
        .page-heading {
          display: grid;
          gap: 0.75rem;
        }
        .heading-copy p {
          font-size: 0.8rem;
        }
        h1 {
          font-size: 1.55rem;
        }
        .filters {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.25rem;
          width: 100%;
          box-sizing: border-box;
        }
        .filters button {
          min-width: 0;
          padding: 0.45rem 0.35rem;
          white-space: nowrap;
        }
        .filters button.active {
          background: var(--teal);
          color: #fff;
        }
        .results-heading {
          padding: 0 0.2rem;
        }
        .viewing-card {
          grid-template-columns: 82px minmax(0, 1fr);
          gap: 0.7rem;
          padding: 0.7rem;
          border-radius: 1rem;
          box-shadow: 0 8px 22px rgba(21, 43, 42, 0.05);
        }
        .viewing-card > sp-image {
          width: 82px;
          min-height: 82px;
          height: 82px;
          border-radius: 0.7rem;
        }
        .viewing-details {
          align-content: start;
          gap: 0.22rem;
        }
        .title-row {
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.3rem;
        }
        .title-row h2 {
          width: 100%;
          font-size: 0.92rem;
          white-space: normal;
          line-height: 1.2;
        }
        .location {
          font-size: 0.72rem;
        }
        .schedule {
          grid-column: 1/-1;
          margin-top: 0.2rem;
        }
        .schedule > i {
          width: 30px;
          height: 30px;
          flex-basis: 30px;
        }
        .schedule small {
          display: none;
        }
        .schedule strong {
          font-size: 0.75rem;
        }
        .alternative {
          font-size: 0.68rem;
        }
        .created {
          display: none;
        }
        .card-actions {
          grid-column: 1/-1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.4rem;
          padding: 0.6rem 0 0;
          border-top: 1px solid var(--line);
          border-left: 0;
        }
        .card-actions a,
        .card-actions button {
          min-height: 40px;
        }
        .primary-action {
          grid-column: 1;
        }
        .secondary-action {
          grid-column: 2;
          width: 40px;
          padding: 0 !important;
          font-size: 0 !important;
        }
        .secondary-action i {
          font-size: 0.78rem;
        }
        .cancel-action {
          grid-column: 1/-1;
          justify-self: start;
          min-height: 30px !important;
          padding: 0.2rem 0.1rem !important;
        }
        .state {
          min-height: 260px;
          padding: 2rem 1rem;
          border-radius: 1rem;
        }
        .skeleton {
          height: 320px;
          border-radius: 1rem;
        }
      }
    `,
  ],
})
export class ViewingsComponent {
  private api = inject(ViewingsApiService);
  private toast = inject(ToastService);
  items = signal<ViewingRequest[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  filter = signal<'upcoming' | 'past' | 'cancelled'>('upcoming');
  filtered = computed(() => {
    if (this.filter() === 'upcoming')
      return this.items().filter((item) =>
        ['PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(item.status),
      );
    if (this.filter() === 'cancelled')
      return this.items().filter((item) => ['CANCELLED', 'DECLINED'].includes(item.status));
    return this.items().filter((item) => item.status === 'COMPLETED');
  });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.items.set(p.results),
        error: () => this.error.set('Viewing requests could not be loaded.'),
      });
  }
  location(v: ViewingRequest) {
    return [v.property_suburb, v.property_town].filter(Boolean).join(', ');
  }
  canCancel(v: ViewingRequest) {
    return ['PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(v.status);
  }
  displayTime(value: string | null | undefined) {
    return value ? value.slice(0, 5) : '';
  }
  cancel(v: ViewingRequest) {
    this.busy.set(true);
    this.api
      .cancel(v.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.items.update((xs) => xs.map((x) => (x.id === v.id ? updated : x)));
          this.toast.show('Viewing request cancelled.', 'success');
        },
        error: () => this.toast.show('Viewing request could not be cancelled.', 'error'),
      });
  }
}

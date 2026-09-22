import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StayManagementApiService } from '../../core/api/manage-api.services';
import { ManagedStay } from '../../core/models/manage.models';
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
        <h1>Manage Stays</h1>
        <p>Manage your guest houses and short-term stays.</p>
      </div>
      <a class="primary" routerLink="/account/manage/stays/new" [queryParams]="createQuery()"
        ><i class="fa-solid fa-plus"></i> Add Stay</a
      >
    </header>
    <section class="filters">
      <label
        ><i class="fa-solid fa-magnifying-glass"></i
        ><input
          type="search"
          aria-label="Search stays"
          placeholder="Search name, public ID or town..."
          (input)="query.set($any($event.target).value)"
      /></label>
      <div class="chips" role="tablist">
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
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    } @else if (error()) {
      <section class="state" role="alert">
        <h2>Couldn't load this page.</h2>
        <p>{{ error() }}</p>
        <button (click)="load()">Retry</button>
      </section>
    } @else if (!filtered().length) {
      <section class="state">
        <i class="fa-solid fa-bed"></i>
        <h2>No stays match these filters.</h2>
        <a class="primary" routerLink="/account/manage/stays/new" [queryParams]="createQuery()"
          >Add Stay</a
        >
      </section>
    } @else {
      <div class="cards">
        @for (s of filtered(); track s.id) {
          <article class="listing-card">
            <sp-image [src]="s.images[0]?.image || null" [alt]="s.name" ratio="4 / 3" />
            <div class="listing-copy">
              <div class="title-row">
                <div>
                  <h2>{{ s.name }}</h2>
                  <p>
                    {{ s.public_id }} · {{ s.stay_type }} · {{ s.suburb ? s.suburb + ', ' : ''
                    }}{{ s.town }}
                  </p>
                </div>
                <sp-manage-status [status]="s.status" />
              </div>
              <p class="price">
                {{ s.room_types.length }} room type{{ s.room_types.length === 1 ? '' : 's' }}
                @if (lowestPrice(s)) {
                  · From {{ lowestPrice(s) }}/night
                }
              </p>
              <p class="facts">
                <span><i class="fa-solid fa-bed"></i> {{ s.room_types.length }} room types</span
                ><span><i class="fa-solid fa-calendar-check"></i> {{ availabilityCopy(s) }}</span>
              </p>
              <p class="state-copy">{{ statusCopy(s) }}</p>
              <sp-quality-score
                [score]="s.quality?.score || 0"
                [suggestions]="s.quality?.suggestions || []"
              />
            </div>
            <footer>
              <div class="badges">
                <sp-manage-status
                  [status]="s.status === 'PUBLISHED' ? 'AVAILABLE' : 'UNKNOWN'"
                /><small>Updated {{ s.updated_at | date: 'mediumDate' }}</small>
              </div>
              <div class="actions">
                <a class="primary" [routerLink]="['/account/manage/stays', s.id, 'edit']"
                  >Manage Stay</a
                ><a [routerLink]="['/account/manage/stays', s.id, 'rooms']">Rooms</a
                ><a [routerLink]="['/account/manage/stays', s.id, 'calendar']">Availability</a>
                <details>
                  <summary aria-label="More stay actions">
                    <i class="fa-solid fa-ellipsis"></i>
                  </summary>
                  <div>
                    @if (s.status === 'PUBLISHED') {
                      <a [routerLink]="['/stays', s.slug]">View public stay</a
                      ><button (click)="pause(s)">Pause stay</button>
                    }
                    @if (s.status === 'DRAFT' || s.status === 'REJECTED') {
                      <button (click)="submit(s)">Continue listing</button>
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
      .facts i {
        color: var(--teal);
      }
      .state-copy {
        font-size: 0.87rem;
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
      .actions details a,
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
        height: 190px;
        border-radius: 1rem;
        background: linear-gradient(90deg, #edf2f0 25%, #f8fbfa 45%, #edf2f0 65%);
        background-size: 300% 100%;
        animation: shimmer 1.2s infinite;
      }
      @keyframes shimmer {
        to {
          background-position: -100% 0;
        }
      }
      @media (max-width: 680px) {
        .page-head {
          display: grid;
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
          grid-template-columns: 1fr 1fr auto;
        }
        .actions > a {
          text-align: center;
        }
        .actions details > div {
          right: 0;
        }
      }
    `,
  ],
})
export class StayManagementListComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(StayManagementApiService);
  private toast = inject(ToastService);
  rows = signal<ManagedStay[]>([]);
  loading = signal(true);
  error = signal('');
  query = signal('');
  filter = signal('all');
  filters = [
    { value: 'all', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'review', label: 'Review' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'attention', label: 'Needs attention' },
  ];
  filtered = computed(() =>
    this.rows().filter(
      (s) =>
        this.matches(s, this.filter()) &&
        (!this.query().trim() ||
          `${s.name} ${s.public_id} ${s.town}`
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
  matches(s: ManagedStay, f: string) {
    return (
      f === 'all' ||
      s.status === f ||
      (f === 'review' && ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status)) ||
      (f === 'attention' && Boolean(s.quality?.suggestions?.length))
    );
  }
  count(f: string) {
    return this.rows().filter((s) => this.matches(s, f)).length;
  }
  lowestPrice(s: ManagedStay) {
    const room = [...s.room_types]
      .filter((r) => Number(r.base_price) > 0)
      .sort((a, b) => Number(a.base_price) - Number(b.base_price))[0];
    return room ? formatMoney(room.base_price, room.currency) : '';
  }
  availabilityCopy(s: ManagedStay) {
    return s.status === 'PUBLISHED' ? 'Availability confirmed' : 'Availability needs confirmation';
  }
  statusCopy(s: ManagedStay) {
    return s.status === 'PUBLISHED'
      ? 'This stay is visible publicly.'
      : s.status === 'DRAFT'
        ? 'Finish the stay before submitting.'
        : ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status)
          ? 'SurePlace is reviewing this stay.'
          : s.status === 'PAUSED'
            ? 'This stay is currently hidden.'
            : s.status === 'REJECTED'
              ? 'This stay was not approved.'
              : 'Manage your stay details and rooms.';
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .mine(this.scope())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.rows.set(p.results),
        error: () => this.error.set('Stays could not be loaded.'),
      });
  }
  submit(s: ManagedStay) {
    void this.router.navigate(['/account/manage/stays', s.id, 'edit']);
  }
  pause(s: ManagedStay) {
    if (confirm('Pause this stay? It will no longer appear publicly.'))
      this.api.pause(s.id).subscribe({
        next: (x) => {
          this.replace(x);
          this.toast.show('Stay paused.', 'success');
        },
        error: () => this.toast.show('Stay could not be paused.', 'error'),
      });
  }
  private replace(s: ManagedStay) {
    this.rows.update((xs) => xs.map((x) => (x.id === s.id ? s : x)));
  }
}

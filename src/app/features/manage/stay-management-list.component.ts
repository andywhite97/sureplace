import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StayManagementApiService } from '../../core/api/manage-api.services';
import { ManagedStay } from '../../core/models/manage.models';
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
      <h1>Manage stays</h1>
      <a routerLink="/account/manage/listings/new">Add Stay</a>
    </header>
    <div class="tools">
      <input
        type="search"
        aria-label="Search stays"
        placeholder="Search name, public ID or town"
        (input)="query.set($any($event.target).value)"
      />
      <div role="group">
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
        <h2>No manageable stays found.</h2>
        <a routerLink="/account/manage/listings/new">Add Stay</a>
      </div>
    } @else {
      <div class="list">
        @for (s of filtered(); track s.id) {
          <article>
            <sp-image [src]="s.images[0]?.image || null" [alt]="s.name" ratio="4 / 3" />
            <div>
              <h2>{{ s.name }}</h2>
              <p>
                {{ s.public_id }} &middot; {{ s.stay_type }} &middot;
                {{ s.suburb ? s.suburb + ', ' : '' }}{{ s.town }}
              </p>
              <p>{{ s.room_types.length }} room type{{ s.room_types.length === 1 ? '' : 's' }}</p>
              <sp-quality-score
                [score]="s.quality?.score || 0"
                [suggestions]="s.quality?.suggestions || []"
              />
            </div>
            <aside>
              <sp-manage-status [status]="s.status" /><small
                >Updated {{ s.updated_at | date: 'mediumDate' }}</small
              ><a [routerLink]="['/account/manage/stays', s.id, 'edit']">Edit</a
              ><a [routerLink]="['/account/manage/stays', s.id, 'rooms']">Manage Rooms</a
              ><a [routerLink]="['/account/manage/stays', s.id, 'calendar']">Availability</a>
              @if (s.status === 'PUBLISHED') {
                <a [routerLink]="['/stays', s.slug]">View Public Stay</a
                ><button (click)="pause(s)">Pause</button>
              }
              @if (s.status === 'DRAFT' || s.status === 'REJECTED') {
                <button (click)="submit(s)">Submit</button>
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
export class StayManagementListComponent {
  private api = inject(StayManagementApiService);
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
    this.rows().filter((s) => {
      const f = this.filter(),
        q = this.query().trim().toLowerCase();
      return (
        (f === 'all' ||
          s.status === f ||
          (f === 'review' && ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status)) ||
          (f === 'attention' && Boolean(s.quality?.suggestions?.length))) &&
        (!q || `${s.name} ${s.public_id} ${s.town}`.toLowerCase().includes(q))
      );
    }),
  );
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
        error: () => this.error.set('Stays could not be loaded.'),
      });
  }
  submit(s: ManagedStay) {
    this.api.submit(s.id).subscribe((x) => this.replace(x));
  }
  pause(s: ManagedStay) {
    if (confirm('Pause this stay? It will no longer appear publicly.'))
      this.api.pause(s.id).subscribe((x) => this.replace(x));
  }
  private replace(s: ManagedStay) {
    this.rows.update((xs) => xs.map((x) => (x.id === s.id ? s : x)));
  }
}

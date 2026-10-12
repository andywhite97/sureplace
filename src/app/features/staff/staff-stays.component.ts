import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, filter, finalize, of, startWith, switchMap } from 'rxjs';
import { StaffStayApiService } from '../../core/api/staff-stay-api.service';
import {
  StaffStay,
  StaffStayQuery,
  StaffStaySummary,
  StayModerationAction,
} from '../../core/models/staff-stay.models';
import { ToastService } from '../../core/services/toast.service';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { StaffStayReviewComponent, StayReviewTab } from './staff-stay-review.component';
export type { StaffStay } from '../../core/models/staff-stay.models';

@Component({ standalone: true, template: '' })
export class StaffStaySelectionComponent {}
const DEFAULT_QUERY: StaffStayQuery = {
  search: '',
  status: 'SUBMITTED,UNDER_REVIEW',
  town: '',
  host: '',
  ordering: '-submitted_at',
  page: 1,
};
@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterOutlet,
    SmartImageComponent,
    StaffStayReviewComponent,
  ],
  templateUrl: './staff-stays.component.html',
  styleUrl: './staff-stays.component.scss',
})
export class StaffStaysComponent {
  private api = inject(StaffStayApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy = inject(DestroyRef);
  private toast = inject(ToastService);
  private queueRequests = new Subject<StaffStayQuery>();
  private detailRequests = new Subject<string | null>();
  private summaryRequests = new Subject<void>();
  private lastQueueKey = '';
  detailId = signal<string | null>(null);
  stays = signal<StaffStay[]>([]);
  stay = signal<StaffStay | null>(null);
  summary = signal<StaffStaySummary | null>(null);
  summaryError = signal('');
  summaryLoading = signal(false);
  loading = signal(false);
  detailLoading = signal(false);
  busy = signal(false);
  queueError = signal('');
  detailError = signal('');
  actionError = signal('');
  saved = signal(0);
  count = signal(0);
  hasNext = signal(false);
  tab = signal<StayReviewTab>('overview');
  query = signal<StaffStayQuery>({ ...DEFAULT_QUERY });
  filterDialog = viewChild.required<ElementRef<HTMLDialogElement>>('filterDialog');
  filtersOpen = signal(false);
  filterDraft = { status: DEFAULT_QUERY.status, town: '', host: '' };
  filterCount = computed(() => {
    const q = this.query();
    return Number(q.status !== DEFAULT_QUERY.status) + Number(!!q.town) + Number(!!q.host);
  });
  search = '';
  status = DEFAULT_QUERY.status;
  town = '';
  host = '';
  ordering = DEFAULT_QUERY.ordering;
  page = computed(() => this.query().page);
  first = computed(() => (this.count() && this.stays().length ? (this.page() - 1) * 20 + 1 : 0));
  last = computed(() => (this.first() ? this.first() + this.stays().length - 1 : 0));
  applied = computed(() => {
    const q = this.query();
    return [
      q.search && `Search: ${q.search}`,
      q.town && `Town: ${q.town}`,
      q.host &&
        `Host: ${this.summary()?.hosts?.find((h) => h.id === q.host)?.name || 'Selected host'}`,
      q.status !== DEFAULT_QUERY.status &&
        `Status: ${q.status ? q.status.replaceAll('_', ' ').toLowerCase() : 'All review statuses'}`,
    ].filter(Boolean);
  });
  constructor() {
    this.queueRequests
      .pipe(
        switchMap((query) => {
          this.loading.set(true);
          this.queueError.set('');
          return this.api.list(query).pipe(
            catchError((error) => {
              if (error?.status === 404 && query.page > 1) {
                // A review decision can remove the final row from the final page.
                this.navigateQuery({ ...query, page: 1 });
                return of(null);
              }
              this.queueError.set(this.message(error, 'Could not load stays. Try again.'));
              this.stays.set([]);
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        if (page) {
          this.stays.set(page.results);
          this.count.set(page.count);
          this.hasNext.set(!!page.next);
        }
      });
    this.detailRequests
      .pipe(
        switchMap((id) => {
          this.stay.set(null);
          this.detailError.set('');
          this.actionError.set('');
          if (!id) {
            this.detailLoading.set(false);
            return of(null);
          }
          this.detailLoading.set(true);
          return this.api.detail(id).pipe(
            catchError((error) => {
              this.detailError.set(this.message(error, 'Could not open this stay review.'));
              return of(null);
            }),
            finalize(() => this.detailLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((stay) => this.stay.set(stay));
    this.summaryRequests
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.summaryLoading.set(true);
          this.summaryError.set('');
          return this.api.summary().pipe(
            catchError(() => {
              this.summaryError.set('Summary counts are unavailable.');
              return of(null);
            }),
            finalize(() => this.summaryLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((summary) => this.summary.set(summary));
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.syncRoute());
  }
  private syncRoute() {
    const params = this.route.snapshot.queryParamMap;
    const page = Number(params.get('page'));
    const q: StaffStayQuery = {
      search: params.get('search') || '',
      status: params.get('status') ?? DEFAULT_QUERY.status,
      town: params.get('town') || '',
      host: params.get('host') || '',
      ordering: params.get('ordering') || DEFAULT_QUERY.ordering,
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
    this.query.set(q);
    this.search = q.search;
    this.status = q.status;
    this.town = q.town;
    this.host = q.host;
    this.ordering = q.ordering;
    const key = JSON.stringify(q);
    if (key !== this.lastQueueKey) {
      this.lastQueueKey = key;
      this.queueRequests.next(q);
    }
    const id = this.route.snapshot.firstChild?.paramMap.get('id') || null;
    if (id !== this.detailId()) {
      this.detailId.set(id);
      this.detailRequests.next(id);
    }
    const tab = params.get('tab');
    this.tab.set(
      ['overview', 'rooms', 'policies', 'verification'].includes(tab || '')
        ? (tab as StayReviewTab)
        : 'overview',
    );
  }
  openFilters() {
    const q = this.query();
    this.filterDraft = { status: q.status, town: q.town, host: q.host };
    this.filtersOpen.set(true);
    this.filterDialog().nativeElement.showModal();
  }
  closeFilters() {
    this.filterDialog().nativeElement.close();
    this.filtersOpen.set(false);
  }
  resetMobileFilters() {
    this.filterDraft = { status: DEFAULT_QUERY.status, town: '', host: '' };
  }
  applyMobileFilters() {
    Object.assign(this, this.filterDraft);
    this.closeFilters();
    this.applyFilters();
  }
  applyFilters() {
    this.navigateQuery({
      search: this.search.trim(),
      status: this.status,
      town: this.town,
      host: this.host,
      ordering: this.ordering,
      page: 1,
    });
  }
  clearFilters() {
    this.search = '';
    this.status = DEFAULT_QUERY.status;
    this.town = '';
    this.host = '';
    this.ordering = DEFAULT_QUERY.ordering;
    this.applyFilters();
  }
  changePage(delta: number) {
    if (!this.loading() && (delta < 0 ? this.page() > 1 : this.hasNext()))
      this.navigateQuery({ ...this.query(), page: this.page() + delta });
  }
  private navigateQuery(query: StaffStayQuery) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: query.search || null,
        status: query.status === DEFAULT_QUERY.status ? null : query.status,
        town: query.town || null,
        host: query.host || null,
        ordering: query.ordering === DEFAULT_QUERY.ordering ? null : query.ordering,
        page: query.page === 1 ? null : query.page,
      },
      queryParamsHandling: 'merge',
    });
  }
  selectTab(tab: StayReviewTab) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  closeReview() {
    void this.router.navigate(['/staff/stays'], {
      queryParams: { ...this.route.snapshot.queryParams, tab: null },
    });
  }
  refreshSummary() {
    this.summaryRequests.next();
  }
  retryQueue() {
    this.queueRequests.next(this.query());
  }
  retryDetail() {
    this.detailRequests.next(this.detailId());
  }
  cover(stay: StaffStay) {
    return stay.images?.find((image) => image.is_cover)?.image || stay.images?.[0]?.image || null;
  }
  hostName(stay: StaffStay) {
    return `${stay.owner.first_name} ${stay.owner.last_name}`.trim() || 'Stay host';
  }
  act(event: { action: StayModerationAction; reason: string }) {
    const item = this.stay();
    if (!item || this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.api
      .moderate(item.id, event.action, event.reason)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (stay) => {
          if (this.detailId() === item.id) {
            this.stay.set(stay);
            this.saved.update((value) => value + 1);
          }
          this.retryQueue();
          this.refreshSummary();
          this.toast.show({
            kind: 'success',
            title: 'Stay review saved',
            message: `${stay.name}: ${stay.status_label}`,
          });
        },
        error: (error) => {
          const message = this.message(error, 'Could not save this decision. Please try again.');
          this.actionError.set(message);
          this.toast.show({ kind: 'error', title: 'Decision not saved', message });
        },
      });
  }
  private message(error: unknown, fallback: string): string {
    const data = (error as { error?: { message?: string; errors?: unknown } })?.error;
    const messages = this.flatten(data?.errors);
    return [...new Set(messages.length ? messages : [data?.message || fallback])].join(' ');
  }
  private flatten(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap((item) => this.flatten(item));
    if (value && typeof value === 'object')
      return Object.values(value).flatMap((item) => this.flatten(item));
    return [];
  }
}

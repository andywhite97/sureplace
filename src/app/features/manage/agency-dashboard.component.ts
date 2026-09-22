import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { AuthService } from '../../core/auth/auth.service';
import { ManagementDashboardResponse, ManagementListing } from '../../core/models/manage.models';
import { SeoService } from '../../core/services/seo.service';
import { UserCapabilityService } from '../../core/services/user-capability.service';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { ManageStatusComponent } from './manage-ui';

type ListingTypeFilter = 'all' | 'property' | 'stay';

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, SmartImageComponent, ManageStatusComponent],
  templateUrl: './agency-dashboard.component.html',
  styleUrl: './agency-dashboard.component.scss',
})
export class AgencyDashboardComponent {
  private api = inject(AgencyManagementApiService);
  private auth = inject(AuthService);
  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);
  readonly capabilities = inject(UserCapabilityService);
  private readonly storageKey = 'sureplace.management-context';
  private retriedContext = false;

  loading = signal(true);
  error = signal('');
  dashboard = signal<ManagementDashboardResponse | null>(null);
  contextKey = signal('');
  query = signal('');
  status = signal('');
  type = signal<ListingTypeFilter>('all');
  ordering = signal<'newest' | 'oldest'>('newest');
  page = signal(1);

  readonly statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'UNDER_REVIEW', label: 'Under review' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'SUSPENDED', label: 'Suspended' },
  ];

  userName = computed(() => this.auth.user()?.first_name || 'there');
  isAgency = computed(() => this.dashboard()?.context?.kind === 'agency');
  canManageAgency = computed(() =>
    ['OWNER', 'ADMIN'].includes(this.dashboard()?.context?.role || ''),
  );
  createQuery = computed(() => {
    const context = this.dashboard()?.context;
    return context?.kind === 'agency' && context.id ? { agency: context.id } : {};
  });
  managementQuery = computed(() => {
    const context = this.dashboard()?.context;
    return context?.kind === 'agency' && context.id
      ? { agency: context.id }
      : { context: 'individual' };
  });

  constructor() {
    this.seo.privatePage(
      'Manage Listings',
      'Manage your properties, stays, enquiries and booking activity.',
    );
    const stored = isPlatformBrowser(this.platformId)
      ? sessionStorage.getItem(this.storageKey) || ''
      : '';
    this.contextKey.set(stored);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string> = {
      page: String(this.page()),
      page_size: '6',
      type: this.type(),
      ordering: this.ordering(),
    };
    if (this.contextKey()) params['context'] = this.contextKey();
    if (this.query().trim()) params['search'] = this.query().trim();
    if (this.status()) params['status'] = this.status();

    this.api
      .managementDashboard(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          const context = dashboard.context;
          if (context) {
            const key = context.kind === 'agency' ? `agency:${context.id}` : 'individual';
            this.contextKey.set(key);
            if (isPlatformBrowser(this.platformId)) sessionStorage.setItem(this.storageKey, key);
          }
        },
        error: (error) => {
          if (
            this.contextKey() &&
            !this.retriedContext &&
            [400, 403, 404].includes(Number(error?.status))
          ) {
            this.retriedContext = true;
            this.contextKey.set('');
            if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem(this.storageKey);
            this.load();
            return;
          }
          this.error.set("We couldn't load your management dashboard.");
        },
      });
  }

  switchContext(key: string) {
    if (key === this.contextKey() || this.loading()) return;
    this.contextKey.set(key);
    this.page.set(1);
    this.query.set('');
    this.status.set('');
    this.type.set('all');
    this.ordering.set('newest');
    this.load();
  }

  applyFilters() {
    this.page.set(1);
    this.load();
  }

  goToPage(page: number | null) {
    if (!page || page === this.page() || this.loading()) return;
    this.page.set(page);
    this.load();
  }

  setType(value: string) {
    this.type.set((['property', 'stay'].includes(value) ? value : 'all') as ListingTypeFilter);
    this.applyFilters();
  }

  location(listing: ManagementListing) {
    return [listing.suburb, listing.town].filter(Boolean).join(', ');
  }

  trackContext(agencyId: string) {
    return `agency:${agencyId}`;
  }
}

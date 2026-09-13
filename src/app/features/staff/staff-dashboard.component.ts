import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StaffApiService } from '../../core/api/staff-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { StaffDashboard, StaffDashboardListing } from '../../core/models/staff.models';
import { formatMoney } from '../../shared/listing/price-format';

type Metric = {
  label: string;
  value: number | null | undefined;
  icon: string;
  hint: string;
  tone: string;
  status?: string;
};
@Component({
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, RouterLink],
  templateUrl: './staff-dashboard.component.html',
  styleUrl: './staff-dashboard.component.scss',
})
export class StaffDashboardComponent {
  private api = inject(StaffApiService);
  private destroy = inject(DestroyRef);
  auth = inject(AuthService);
  data = signal<StaffDashboard | null>(null);
  loading = signal(true);
  error = signal('');
  readonly formatMoney = formatMoney;
  readonly today = new Date();
  primary = computed<Metric[]>(() => {
    const s = this.data();
    return [
      {
        label: 'Awaiting Review',
        value: s?.awaiting_review,
        icon: 'fa-solid fa-hourglass-half',
        hint: 'Property listings needing attention',
        tone: 'amber',
        status: 'SUBMITTED,UNDER_REVIEW',
      },
      {
        label: 'Open Reports',
        value: s?.open_reports,
        icon: 'fa-solid fa-flag',
        hint: s?.open_reports === 0 ? 'No open property reports' : 'Open property reports',
        tone: 'amber',
      },
      {
        label: 'Changes Requested',
        value: s?.changes_requested,
        icon: 'fa-solid fa-pen-to-square',
        hint: 'Awaiting advertiser resubmission',
        tone: 'blue',
        status: 'CHANGES_REQUESTED',
      },
      {
        label: 'Approved Today',
        value: s?.approved_today,
        icon: 'fa-solid fa-circle-check',
        hint: 'Published today - Mbabane time',
        tone: 'teal',
      },
    ];
  });
  secondary = computed<Metric[]>(() => {
    const s = this.data();
    return [
      {
        label: 'Rejected',
        value: s?.rejected,
        icon: 'fa-solid fa-circle-xmark',
        hint: 'Current rejected property listings',
        tone: 'slate',
        status: 'REJECTED',
      },
      {
        label: 'Suspended',
        value: s?.suspended,
        icon: 'fa-solid fa-ban',
        hint: 'Current property suspensions',
        tone: 'slate',
        status: 'SUSPENDED',
      },
      {
        label: 'Agency Reviews',
        value: s?.agency_reviews,
        icon: 'fa-solid fa-building-shield',
        hint: 'Pending agency verifications',
        tone: 'slate',
      },
      {
        label: 'Verification Requests',
        value: s?.verification_requests,
        icon: 'fa-solid fa-shield-halved',
        hint: 'All pending verification requests',
        tone: 'slate',
      },
    ];
  });
  readonly quickActions = [
    {
      title: 'Review property listings',
      hint: 'Moderate new and updated listings',
      icon: 'fa-solid fa-building-user',
      status: 'SUBMITTED,UNDER_REVIEW',
    },
    {
      title: 'Follow up on changes',
      hint: 'See listings awaiting resubmission',
      icon: 'fa-solid fa-pen-to-square',
      status: 'CHANGES_REQUESTED',
    },
    {
      title: 'Review suspensions',
      hint: 'Inspect suspended property listings',
      icon: 'fa-solid fa-ban',
      status: 'SUSPENDED',
    },
  ];
  constructor() {
    this.load();
  }
  load() {
    if (this.loading() && this.requestStarted) return;
    this.requestStarted = true;
    this.loading.set(true);
    this.error.set('');
    this.api
      .dashboard()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (data) =>
          this.data.set({
            ...data,
            latest_listings: data.latest_listings.slice(0, 5),
            recent_activity: data.recent_activity.slice(0, 7),
          }),
        error: () => this.error.set('Could not load dashboard data.'),
      });
  }
  private requestStarted = false;
  signals(item: StaffDashboardListing) {
    const signals: string[] = [];
    if (item.verification_status !== 'VERIFIED') signals.push('Not verified');
    if (item.image_count === 0) signals.push('No photos');
    else if (item.image_count === 1) signals.push('Only 1 photo');
    if (item.latitude == null || item.longitude == null) signals.push('No exact location');
    if (!item.town) signals.push('Town missing');
    if (item.open_reports_count)
      signals.push(
        `${item.open_reports_count} open ${item.open_reports_count === 1 ? 'report' : 'reports'}`,
      );
    return signals;
  }
  statusLabel(status: string) {
    return (
      (
        {
          SUBMITTED: 'Pending review',
          UNDER_REVIEW: 'Under review',
          CHANGES_REQUESTED: 'Changes requested',
          SUSPENDED: 'Suspended',
          PUBLISHED: 'Published',
          REJECTED: 'Rejected',
        } as Record<string, string>
      )[status] || 'Needs review'
    );
  }
  listingType(type: string) {
    return ({ SALE: 'For sale', RENT: 'To rent' } as Record<string, string>)[type] || 'Property';
  }
  activityLabel(action: string) {
    return (
      (
        {
          PROPERTY_APPROVED: 'Listing approved',
          PROPERTY_REVIEW_STARTED: 'Review started',
          PROPERTY_CHANGES_REQUESTED: 'Changes requested',
          PROPERTY_REJECTED: 'Listing rejected',
          PROPERTY_SUSPENDED: 'Listing suspended',
          PROPERTY_RESTORED: 'Listing restored',
          PROPERTY_NOTE_ADDED: 'Moderation note added',
          REPORT_ASSIGNED: 'Report assigned',
          REPORT_RESOLVED: 'Report resolved',
          REPORT_DISMISSED: 'Report dismissed',
          LISTING_SUSPEND: 'Listing suspended',
          LISTING_REINSTATE: 'Listing reinstated',
          LISTING_PAUSE: 'Listing paused',
          LISTING_UNPUBLISH: 'Listing unpublished',
        } as Record<string, string>
      )[action] || 'Moderation update'
    );
  }
  imageFailed(event: Event) {
    (event.target as HTMLImageElement).hidden = true;
  }
}

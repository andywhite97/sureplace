import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { OverviewVerification } from '../../core/models/account.models';
import { AccountActivityStore } from '../../core/services/account-activity.store';
import { ManageStatusComponent } from '../manage/manage-ui';
import { NotificationItemComponent } from './account-ui';

type AttentionItem =
  | {
      kind: 'viewing';
      priority: number;
      title: string;
      name: string;
      date: string;
      time: string;
      route: string;
    }
  | {
      kind: 'stay';
      priority: number;
      title: string;
      name: string;
      checkIn: string;
      checkOut: string;
      route: string;
    }
  | {
      kind: 'verification';
      priority: number;
      title: string;
      request: OverviewVerification;
      route: string;
    };

@Component({
  standalone: true,
  imports: [DatePipe, TitleCasePipe, RouterLink, ManageStatusComponent, NotificationItemComponent],
  templateUrl: './account-overview.component.html',
  styleUrl: './account-overview.component.scss',
})
export class AccountOverviewComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(AccountActivityStore);

  readonly attention = computed<AttentionItem[]>(() => {
    const summary = this.store.summary();
    if (!summary) return [];
    const items: AttentionItem[] = (summary.verification_attention || []).map((request) => ({
      kind: 'verification',
      priority: request.status === 'CHANGES_REQUESTED' ? 0 : request.status === 'DRAFT' ? 2 : 3,
      title: request.status === 'CHANGES_REQUESTED' ? 'Changes requested' : 'Verification status',
      request,
      route: '/account/manage/verification',
    }));
    if (summary.next_viewing) {
      items.push({
        kind: 'viewing',
        priority: 1,
        title: 'Upcoming viewing',
        name: summary.next_viewing.property_title,
        date: summary.next_viewing.requested_date,
        time: summary.next_viewing.requested_time,
        route: '/account/viewings',
      });
    }
    if (summary.next_stay) {
      items.push({
        kind: 'stay',
        priority: 1,
        title: 'Upcoming stay',
        name: summary.next_stay.stay_name,
        checkIn: summary.next_stay.check_in,
        checkOut: summary.next_stay.check_out,
        route: '/account/bookings',
      });
    }
    return items.sort((a, b) => a.priority - b.priority).slice(0, 3);
  });

  constructor() {
    this.store.refresh();
    this.store.startPolling();
  }

  retry() {
    this.store.refresh();
  }
  verificationIcon(type: string) {
    return `/verification icons/verified_${type.toLowerCase()}.png`;
  }
  time(value: string) {
    return value?.slice(0, 5) || '';
  }

  @HostListener('document:visibilitychange')
  visible() {
    if (!document.hidden) this.store.refresh(true);
  }
}

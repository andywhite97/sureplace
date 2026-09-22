import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { StaffDashboard, StaffDashboardActivity, StaffReportReview } from '../models/staff.models';
import { PaginatedResponse } from '../models/api.models';
import { ApiClient } from './api-client';
import {
  ModerationAuditEvent,
  StaffProperty,
  StaffPropertyPage,
  StaffSummary,
} from '../models/staff.models';

export interface StaffListingQuery {
  status?: string;
  search?: string;
  ordering?: string;
  page?: string;
  page_size?: string;
}

@Injectable({ providedIn: 'root' })
export class StaffApiService {
  private api = inject(ApiClient);

  summary() {
    return this.api.get<StaffSummary>('/staff/properties/summary/');
  }

  dashboard() {
    return this.summary().pipe(
      switchMap((summary) => {
        if (summary.latest_listings && summary.recent_activity)
          return of(summary as StaffDashboard);
        // Compatibility with the deployed summary while its additive dashboard fields roll out.
        return forkJoin({
          queue: this.properties({
            status: 'SUBMITTED,UNDER_REVIEW',
            ordering: '-updated_at',
            page_size: '5',
          }),
          operations: this.api
            .get<{
              pending_verification_requests: number;
              recent_moderation_activity: StaffDashboardActivity[];
            }>('/moderation/summary/')
            .pipe(catchError(() => of(null))),
        }).pipe(
          map(({ queue, operations }): StaffDashboard => ({
            ...summary,
            agency_reviews: null,
            verification_requests: operations?.pending_verification_requests ?? null,
            latest_listings: queue.results.slice(0, 5).map((item) => ({
              ...item,
              cover_image:
                (item.images.find((image) => image.is_cover) || item.images[0])?.image || null,
              image_count: item.images.length,
              advertiser:
                item.agency?.name ||
                [item.owner?.first_name, item.owner?.last_name].filter(Boolean).join(' ') ||
                'Property advertiser',
            })),
            recent_activity: (operations?.recent_moderation_activity || []).slice(0, 7),
            activity_unavailable: !operations,
          })),
        );
      }),
    );
  }

  properties(query: StaffListingQuery = {}) {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => Boolean(value)),
    ) as Record<string, string>;
    return this.api.get<StaffPropertyPage>('/staff/properties/', params);
  }

  property(id: string) {
    return this.api.get<StaffProperty>(`/staff/properties/${encodeURIComponent(id)}/`);
  }

  audit(id: string) {
    return this.api.get<{ results: ModerationAuditEvent[] } | ModerationAuditEvent[]>(
      `/staff/properties/${encodeURIComponent(id)}/audit/`,
    );
  }

  startReview(id: string) {
    return this.api.post<StaffProperty>(
      `/staff/properties/${encodeURIComponent(id)}/start-review/`,
      {},
    );
  }

  approve(id: string, note = '') {
    return this.api.post<StaffProperty>(`/staff/properties/${encodeURIComponent(id)}/approve/`, {
      note,
    });
  }

  requestChanges(id: string, reason: string) {
    return this.api.post<StaffProperty>(
      `/staff/properties/${encodeURIComponent(id)}/request-changes/`,
      { reason },
    );
  }

  reject(id: string, reason: string) {
    return this.api.post<StaffProperty>(`/staff/properties/${encodeURIComponent(id)}/reject/`, {
      reason,
    });
  }

  suspend(id: string, reason: string) {
    return this.api.post<StaffProperty>(`/staff/properties/${encodeURIComponent(id)}/suspend/`, {
      reason,
    });
  }

  restore(id: string) {
    return this.api.post<StaffProperty>(`/staff/properties/${encodeURIComponent(id)}/restore/`, {});
  }

  addNote(id: string, note: string) {
    return this.api.post<StaffProperty>(`/staff/properties/${encodeURIComponent(id)}/notes/`, {
      note,
    });
  }

  reports() {
    return this.api.get<PaginatedResponse<StaffReportReview>>('/moderation/reports/');
  }

  assignReport(id: string) {
    return this.api.post<StaffReportReview>(
      `/moderation/reports/${encodeURIComponent(id)}/assign/`,
      {},
    );
  }

  resolveReport(id: string, notes: string) {
    return this.api.post<StaffReportReview>(
      `/moderation/reports/${encodeURIComponent(id)}/resolve/`,
      { notes },
    );
  }

  dismissReport(id: string, notes: string) {
    return this.api.post<StaffReportReview>(
      `/moderation/reports/${encodeURIComponent(id)}/dismiss/`,
      { notes },
    );
  }
}

import { inject, Injectable } from '@angular/core';
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
}

@Injectable({ providedIn: 'root' })
export class StaffApiService {
  private api = inject(ApiClient);

  summary() {
    return this.api.get<StaffSummary>('/staff/properties/summary/');
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
}

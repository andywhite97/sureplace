import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import { PaginatedResponse } from '../models/api.models';
import {
  StaffStay,
  StaffStayQuery,
  StaffStaySummary,
  StayModerationAction,
} from '../models/staff-stay.models';

@Injectable({ providedIn: 'root' })
export class StaffStayApiService {
  private api = inject(ApiClient);
  list(query: StaffStayQuery) {
    const params = Object.fromEntries(
      Object.entries(query)
        .filter(([, value]) => value !== '')
        .map(([key, value]) => [key, String(value)]),
    );
    return this.api.get<PaginatedResponse<StaffStay>>('/staff/stays/', {
      ...params,
      page_size: '20',
    });
  }
  summary() {
    return this.api.get<StaffStaySummary>('/staff/stays/summary/');
  }
  detail(id: string) {
    return this.api.get<StaffStay>(`/staff/stays/${encodeURIComponent(id)}/`);
  }
  moderate(id: string, action: StayModerationAction, reason: string) {
    return this.api.post<StaffStay>(`/staff/stays/${encodeURIComponent(id)}/${action}/`, {
      reason,
      note: reason,
    });
  }
}

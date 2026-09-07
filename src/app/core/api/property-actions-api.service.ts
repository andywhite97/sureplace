import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
export interface ViewingRequest {
  requested_date: string;
  requested_time: string;
  alternative_date?: string;
  alternative_time?: string;
  notes?: string;
}
@Injectable({ providedIn: 'root' })
export class PropertyActionsApiService {
  private api = inject(ApiClient);
  viewing(property: string, body: ViewingRequest) {
    return this.api.post<{ id: string }>(`/properties/${property}/viewing-requests/`, body);
  }
  report(property: string, reason: string, details: string) {
    return this.api.post<{ id: string }>('/reports/listings/', { property, reason, details });
  }
}

import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import { PaginatedResponse } from '../models/api.models';
import {
  BookingCreateRequest,
  BookingSummary,
  StayAvailabilityResponse,
  StayCard,
  StayDetail,
} from '../models/listing.models';
import { StaySearchParams } from '../models/stay-search.models';
import { StayQueryService } from '../services/stay-query.service';
@Injectable({ providedIn: 'root' })
export class StaysApiService {
  private api = inject(ApiClient);
  private query = inject(StayQueryService);
  featured() {
    return this.api.get<PaginatedResponse<StayCard>>('/stays/featured/');
  }
  search(params: StaySearchParams) {
    return this.api.get<PaginatedResponse<StayCard>>('/stays/', this.query.apiParams(params));
  }
  detail(slugOrId: string) {
    return this.api.get<StayDetail>(`/stays/${encodeURIComponent(slugOrId)}/`);
  }
  availability(
    slugOrId: string,
    params: {
      check_in: string;
      check_out: string;
      adults: number;
      children: number;
      rooms: number;
    },
  ) {
    return this.api.get<StayAvailabilityResponse>(
      `/stays/${encodeURIComponent(slugOrId)}/availability/`,
      Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
    );
  }
  createBooking(stayId: string, body: BookingCreateRequest, idempotencyKey: string) {
    return this.api.postWithHeaders<BookingSummary>(`/stays/${stayId}/bookings/`, body, {
      'Idempotency-Key': idempotencyKey,
    });
  }
  report(stay: string, reason: string, details: string) {
    return this.api.post<{ id: string }>('/reports/listings/', { stay, reason, details });
  }
}

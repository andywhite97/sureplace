import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import { PaginatedResponse } from '../models/api.models';
import {
  AvailabilityBulkRequest,
  ManagedBookingPage,
  ManagedProperty,
  ManagedPropertyPage,
  ManagedStay,
  ManagedStayPage,
  ManagedViewingPage,
  PropertyWriteRequest,
  RoomAvailabilityDay,
  RoomPage,
  RoomWriteRequest,
  StayWriteRequest,
  VerificationRequestCreate,
  VerificationRequestSummary,
  VerificationTypeInfo,
} from '../models/manage.models';
import { RoomTypeSummary } from '../models/listing.models';

@Injectable({ providedIn: 'root' })
export class PropertyManagementApiService {
  private api = inject(ApiClient);
  mine() {
    return this.api.get<ManagedPropertyPage>('/properties/mine/');
  }
  detail(id: string) {
    return this.api.get<ManagedProperty>(`/properties/${encodeURIComponent(id)}/`);
  }
  create(body: PropertyWriteRequest) {
    return this.api.post<ManagedProperty>('/properties/', body);
  }
  update(id: string, body: Partial<PropertyWriteRequest>) {
    return this.api.patch<ManagedProperty>(`/properties/${encodeURIComponent(id)}/`, body);
  }
  submit(id: string) {
    return this.api.post<ManagedProperty>(`/properties/${encodeURIComponent(id)}/submit/`, {});
  }
  pause(id: string) {
    return this.api.post<ManagedProperty>(`/properties/${encodeURIComponent(id)}/pause/`, {});
  }
  confirmAvailability(id: string) {
    return this.api.post<ManagedProperty>(`/properties/${encodeURIComponent(id)}/confirm-availability/`, {});
  }
  uploadImage(id: string, data: FormData) {
    return this.api.post<unknown>(`/properties/${encodeURIComponent(id)}/images/`, data);
  }
  updateImage(id: string, imageId: string, body: { sort_order?: number; is_cover?: boolean; caption?: string }) {
    return this.api.patch<unknown>(`/properties/${encodeURIComponent(id)}/images/`, { id: imageId, ...body });
  }
  deleteImage(id: string, imageId: string) {
    return this.api.delete<void>(`/properties/${encodeURIComponent(id)}/images/?id=${encodeURIComponent(imageId)}`);
  }
}

@Injectable({ providedIn: 'root' })
export class StayManagementApiService {
  private api = inject(ApiClient);
  mine() {
    return this.api.get<ManagedStayPage>('/stays/mine/');
  }
  detail(id: string) {
    return this.api.get<ManagedStay>(`/stays/${encodeURIComponent(id)}/`);
  }
  create(body: StayWriteRequest) {
    return this.api.post<ManagedStay>('/stays/', body);
  }
  update(id: string, body: Partial<StayWriteRequest>) {
    return this.api.patch<ManagedStay>(`/stays/${encodeURIComponent(id)}/`, body);
  }
  submit(id: string) {
    return this.api.post<ManagedStay>(`/stays/${encodeURIComponent(id)}/submit/`, {});
  }
  pause(id: string) {
    return this.api.post<ManagedStay>(`/stays/${encodeURIComponent(id)}/pause/`, {});
  }
  rooms(id: string) {
    return this.api.get<RoomPage>(`/stays/${encodeURIComponent(id)}/rooms/`);
  }
  createRoom(id: string, body: RoomWriteRequest) {
    return this.api.post<RoomTypeSummary>(`/stays/${encodeURIComponent(id)}/rooms/`, body);
  }
  uploadImage(id: string, data: FormData) {
    return this.api.post<unknown>(`/stays/${encodeURIComponent(id)}/images/`, data);
  }
  updateImage(id: string, imageId: string, body: { sort_order?: number; is_cover?: boolean; caption?: string }) {
    return this.api.patch<unknown>(`/stays/${encodeURIComponent(id)}/images/`, { id: imageId, ...body });
  }
  deleteImage(id: string, imageId: string) {
    return this.api.delete<void>(`/stays/${encodeURIComponent(id)}/images/?id=${encodeURIComponent(imageId)}`);
  }
}

@Injectable({ providedIn: 'root' })
export class RoomManagementApiService {
  private api = inject(ApiClient);
  update(id: string, body: Partial<RoomWriteRequest>) {
    return this.api.patch<RoomTypeSummary>(`/rooms/${encodeURIComponent(id)}/`, body);
  }
  delete(id: string) {
    return this.api.delete<void>(`/rooms/${encodeURIComponent(id)}/`);
  }
  calendar(id: string, start: string, end: string) {
    return this.api.get<RoomAvailabilityDay[]>(`/rooms/${encodeURIComponent(id)}/calendar/`, { start, end });
  }
  bulkAvailability(id: string, body: AvailabilityBulkRequest) {
    return this.api.post<{ updated: number }>(`/rooms/${encodeURIComponent(id)}/availability/bulk/`, body);
  }
  uploadImage(id: string, data: FormData) {
    return this.api.post<unknown>(`/rooms/${encodeURIComponent(id)}/images/`, data);
  }
  updateImage(id: string, imageId: string, body: { sort_order?: number; is_cover?: boolean; caption?: string }) {
    return this.api.patch<unknown>(`/rooms/${encodeURIComponent(id)}/images/`, { id: imageId, ...body });
  }
  deleteImage(id: string, imageId: string) {
    return this.api.delete<void>(`/rooms/${encodeURIComponent(id)}/images/?id=${encodeURIComponent(imageId)}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ManagerViewingsApiService {
  private api = inject(ApiClient);
  list() {
    return this.api.get<ManagedViewingPage>('/viewing-requests/', { scope: 'manager' });
  }
  confirm(id: string) {
    return this.api.post<unknown>(`/viewing-requests/${encodeURIComponent(id)}/confirm/`, {});
  }
  decline(id: string) {
    return this.api.post<unknown>(`/viewing-requests/${encodeURIComponent(id)}/decline/`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class ManagerBookingsApiService {
  private api = inject(ApiClient);
  list() {
    return this.api.get<ManagedBookingPage>('/bookings/', { scope: 'manager' });
  }
  action(id: string, action: 'confirm' | 'decline' | 'cancel' | 'complete') {
    return this.api.post<unknown>(`/bookings/${encodeURIComponent(id)}/${action}/`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class VerificationApiService {
  private api = inject(ApiClient);
  list() {
    return this.api.get<PaginatedResponse<VerificationRequestSummary>>('/verification/requests/');
  }
  create(body: VerificationRequestCreate) {
    return this.api.post<VerificationRequestSummary>('/verification/requests/', body);
  }
  types() {
    return this.api.get<VerificationTypeInfo[]>('/verification/types/');
  }
  submit(id: string) {
    return this.api.post<VerificationRequestSummary>(`/verification/requests/${encodeURIComponent(id)}/submit/`, {});
  }
  uploadDocument(id: string, data: FormData) {
    return this.api.post<unknown>(`/verification/requests/${encodeURIComponent(id)}/documents/`, data);
  }
}

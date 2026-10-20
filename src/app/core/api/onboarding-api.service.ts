import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
export interface Prospect {
  id: string;
  kind: string;
  business_name: string;
  town: string;
  region: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  assigned_staff: string | null;
  status: string;
  consent_status: string;
  consent_evidence: string;
  notes: string;
  next_action: string;
  last_contacted_at: string | null;
  source_evidence: string;
  version: number;
  approved_version: number | null;
  draft_payload: Record<string, unknown>;
  images: { id: string; caption: string; source: string; permission_evidence: string }[];
  audit: { id: number; action: string; version: number; created_at: string; evidence: unknown }[];
}
export interface PreviewContent {
  business_name: string;
  kind: string;
  version: number;
  content: Record<string, unknown>;
  notice: string;
  images: { id: string; caption: string; data: string }[];
}
@Injectable({ providedIn: 'root' })
export class OnboardingApi {
  private api = inject(ApiClient);
  list(params: Record<string, string>) {
    return this.api.get<{ results: Prospect[]; count: number }>('/staff/onboarding/', params);
  }
  create(body: unknown) {
    return this.api.post<Prospect>('/staff/onboarding/', body);
  }
  update(id: string, body: unknown) {
    return this.api.patch<Prospect>(`/staff/onboarding/${id}/`, body);
  }
  action(id: string, action: string, body: unknown) {
    return this.api.post<Prospect>(`/staff/onboarding/${id}/${action}/`, body);
  }
  issue(id: string, version: number) {
    return this.api.post<{ token: string; expires_at: string }>(`/staff/onboarding/${id}/issue/`, {
      version,
    });
  }
  preview(token: string) {
    return this.api.post<PreviewContent>('/onboarding/preview/', { token });
  }
  claim(id: string) {
    return this.api.get<{
      business_name: string;
      kind: string;
      version: number;
      status: string;
      content: Record<string, unknown>;
      images?: {id:string;caption:string;data:string}[];
    }>(`/onboarding/claims/${id}/`);
  }
  accept(id: string, version: number, useApprovedPhotos = false) {
    return this.api.post<{ kind: string; listing_id: string; image_notice?: string }>(
      `/onboarding/claims/${id}/`,
      { version, accept_rights: true, use_approved_photos: useApprovedPhotos },
    );
  }
}

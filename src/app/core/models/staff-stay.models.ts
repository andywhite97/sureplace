import { StayDetail } from './listing.models';
import { ModerationAuditEvent, StaffListingReport, StaffUserSummary } from './staff.models';

export interface StaffStay extends StayDetail {
  submitted_at?: string | null;
  status_label: string;
  owner: StaffUserSummary;
  audit_events: ModerationAuditEvent[];
  reports: StaffListingReport[];
  verification_requests?: { id: string; status: string }[];
  verification_request_count?: number | null;
  verification_document_count?: number | null;
}
export interface StaffStaySummary {
  total: number;
  submitted: number;
  under_review: number;
  approved: number;
  rejected: number;
  awaiting_review: number;
  changes_requested: number;
  suspended: number;
  approved_today: number;
  towns: string[];
  hosts: { id: string; name: string }[];
}
export interface StaffStayQuery {
  search: string;
  status: string;
  town: string;
  host: string;
  ordering: string;
  page: number;
}
export type StayModerationAction =
  'start-review' | 'approve' | 'request-changes' | 'reject' | 'suspend' | 'restore' | 'notes';

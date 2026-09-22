import { PaginatedResponse } from './api.models';
import { AdvertiserAgency, PropertyImage } from './listing.models';

export interface StaffUserSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
}

export interface ModerationAuditEvent {
  id: string;
  action: string;
  reason: string;
  metadata: Record<string, unknown>;
  actor_name: string;
  actor_email: string | null;
  created_at: string;
}

export interface StaffListingReport {
  id: string;
  reporter_email: string;
  reason: string;
  details: string;
  status: string;
  reviewed_at: string | null;
  created_at: string;
}

export interface StaffReportReview {
  id: string;
  reporter: string;
  property: string | null;
  stay: string | null;
  reason: string;
  details: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  assigned_to: string | null;
  reviewed_at: string | null;
  resolution_notes: string;
  created_at: string;
}

export interface StaffProperty {
  id: string;
  public_id: string;
  slug: string;
  title: string;
  description: string;
  listing_type: string;
  property_type: string;
  price: string;
  currency: string;
  country_code: string;
  region: string;
  town: string;
  suburb: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  floor_area: string | null;
  land_area: string | null;
  furnished: boolean;
  pet_friendly: boolean;
  status: string;
  status_label: string;
  verification_status: string;
  availability_status: string;
  availability_confirmed_at: string | null;
  featured: boolean;
  published_at: string | null;
  expires_at: string | null;
  owner: StaffUserSummary;
  agency: AdvertiserAgency | null;
  images: PropertyImage[];
  open_reports_count: number;
  latest_note: string;
  created_at: string;
  updated_at: string;
  reports?: StaffListingReport[];
  audit_events?: ModerationAuditEvent[];
}

export interface StaffSummary {
  agency_reviews?: number | null;
  verification_requests?: number | null;
  latest_listings?: StaffDashboardListing[];
  recent_activity?: StaffDashboardActivity[];
  awaiting_review: number;
  approved_today: number;
  changes_requested: number;
  rejected: number;
  suspended: number;
  open_reports: number;
}

export type StaffPropertyPage = PaginatedResponse<StaffProperty>;
export interface StaffDashboardListing {
  id: string;
  public_id: string;
  title: string;
  listing_type: string;
  price: string;
  currency: string;
  town: string;
  region: string;
  status: string;
  status_label: string;
  verification_status: string;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
  cover_image: string | null;
  image_count: number;
  advertiser: string;
  open_reports_count: number;
}
export interface StaffDashboardActivity {
  id?: string;
  action: string;
  created_at: string;
  actor_name?: string | null;
  listing_id?: string;
  public_id?: string;
}
export interface StaffDashboard extends StaffSummary {
  latest_listings: StaffDashboardListing[];
  recent_activity: StaffDashboardActivity[];
  activity_unavailable?: boolean;
}

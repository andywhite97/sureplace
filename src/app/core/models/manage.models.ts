import {
  PropertyDetail,
  PropertyImage,
  RoomTypeSummary,
  StayDetail,
  StayImage,
} from './listing.models';
import { Booking, BookingPage, ViewingPage, ViewingRequest } from './account.models';
import { PaginatedResponse } from './api.models';

export interface QualityScore {
  score: number;
  suggestions: string[];
}

export interface ManagedProperty extends PropertyDetail {
  status: string;
  quality?: QualityScore;
}

export interface ManagedStay extends StayDetail {
  submitted_at?: string | null;
  quality?: QualityScore;
}

export interface PropertyWriteRequest {
  title: string;
  description: string;
  listing_type: string;
  property_type: string;
  price: string;
  currency: string;
  region: string;
  town: string;
  suburb: string;
  address: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  floor_area?: string | null;
  land_area?: string | null;
  furnished: boolean;
  pet_friendly: boolean;
  amenities: string[];
  agency?: string;
}

export interface StayWriteRequest {
  name: string;
  description: string;
  stay_type: string;
  region: string;
  town: string;
  suburb: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  whatsapp_number: string;
  website: string;
  check_in_time: string | null;
  check_out_time: string | null;
  amenities: string[];
  agency?: string;
}

export interface RoomWriteRequest {
  name: string;
  description: string;
  capacity_adults: number;
  capacity_children: number;
  total_capacity: number;
  number_of_beds: number;
  bed_configuration: string;
  bathroom_type: string;
  quantity: number;
  base_price: string;
  currency: string;
  minimum_stay: number;
  is_active: boolean;
}

export interface RoomAvailabilityDay {
  date: string;
  base_inventory: number;
  manual_inventory: number | null;
  reserved_units: number;
  available_units: number;
  blocked: boolean;
  effective_price: string;
}

export interface AvailabilityBulkRequest {
  start_date: string;
  end_date: string;
  available_units?: number;
  custom_price?: string;
  minimum_stay_override?: number;
  is_blocked?: boolean;
}

export interface VerificationRequestSummary {
  id: string;
  verification_type: string;
  status: string;
  agency: string | null;
  agent_profile: string | null;
  property: string | null;
  stay: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string;
  rejection_reason?: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  requirements?: VerificationRequestRequirement[];
  documents?: VerificationEvidence[];
}

export interface VerificationEvidence {
  id: string;
  document_type: string;
  status: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  rejection_reason: string;
}
export interface VerificationRequestRequirement extends VerificationRequirement {
  uploaded: boolean;
  document_types: string[];
}

export interface VerificationRequestCreate {
  verification_type: string;
  agency?: string;
  agent_profile?: string;
  property?: string;
  stay?: string;
}

export interface VerificationTypeInfo {
  type: string;
  label: string;
  description: string;
  disclaimer: string;
}

/** Backend-defined trust scope and evidence rules; never duplicate these rules in the UI. */
export interface VerificationDependency {
  type: string;
  required: boolean;
}
export interface VerificationRequirement {
  key: string;
  label: string;
  description: string;
  required: boolean;
  mode?: 'ONE_OF';
  alternatives?: string[];
  accepted_file_types: string[];
  max_files?: number;
}
export interface VerificationDefinition extends VerificationTypeInfo {
  title: string;
  max_file_size_mb: number;
  scope: string[];
  badge_meaning: string;
  badge_disclaimer: string;
  prerequisites: VerificationDependency[];
  requirements: VerificationRequirement[];
}
export interface VerificationEligibleItem {
  id: string;
  name: string;
  public_id?: string;
}
export interface VerificationEligibility {
  agencies: VerificationEligibleItem[];
  agents: VerificationEligibleItem[];
  properties: VerificationEligibleItem[];
  stays: VerificationEligibleItem[];
}

export type AgencyRole = 'OWNER' | 'ADMIN' | 'AGENT';

export interface Agency {
  id: string;
  name: string;
  trading_name: string;
  slug: string;
  logo: string | null;
  description: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  website: string;
  address: string;
  region: string;
  town: string;
  suburb: string;
  country_code: string;
  verification_status: string;
  is_active: boolean;
  user_role: AgencyRole | '';
  team_count?: number;
}

export interface AgencyDashboard {
  agency: Agency;
  role: AgencyRole;
  active_properties: number;
  draft_properties: number;
  active_stays: number;
  team_members: number;
  pending_invitations: number;
  verification_status: string;
}

export interface ManagementContext {
  kind: 'individual' | 'agency';
  id: string | null;
  name: string;
  role: AgencyRole;
  agency?: Agency;
}

export interface ManagementListing {
  id: string;
  kind: 'property' | 'stay';
  public_id: string;
  slug: string;
  title: string;
  subtype: string;
  status: string;
  town: string;
  suburb: string;
  cover_image: string | null;
  updated_at: string;
  facts: string[];
  edit_url: string;
  public_url: string | null;
  rooms_url?: string;
  availability_url?: string;
}

export interface ManagementDashboardResponse {
  mode: 'onboarding' | 'dashboard';
  contexts: {
    individual: boolean;
    agencies: Agency[];
  };
  context: ManagementContext | null;
  stats: {
    total_listings: number;
    published_listings: number;
    enquiries: number;
    pending_requests: number;
    pending_viewings: number;
    pending_bookings: number;
  } | null;
  listings: {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    next_page: number | null;
    previous_page: number | null;
    results: ManagementListing[];
  };
}

export interface AgencyMember {
  id: string;
  user: string;
  name: string;
  email: string;
  avatar: string | null;
  role: AgencyRole;
  bio: string;
  professional_reference: string;
  whatsapp_number: string;
  verification_status: string;
  is_active: boolean;
}

export interface AgencyInvitation {
  id: string;
  agency: string;
  email: string;
  role: AgencyRole;
  status: string;
  inviter_name: string;
  expires_at: string;
  created_at: string;
}

export type ManagedPropertyPage = PaginatedResponse<ManagedProperty>;
export type ManagedStayPage = PaginatedResponse<ManagedStay>;
export type RoomPage = RoomTypeSummary[];
export type ManagedViewingPage = ViewingPage;
export type ManagedBookingPage = BookingPage;
export type { Booking, PropertyImage, StayImage, ViewingRequest };

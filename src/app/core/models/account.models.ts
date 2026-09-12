import { PaginatedResponse, User } from './api.models';
import { PropertyCard, StayCard, NightlyPrice } from './listing.models';

export interface FavouriteItem {
  id: string;
  property: string | null;
  stay: string | null;
  property_card: PropertyCard | null;
  stay_card: StayCard | null;
  created_at: string;
}

export interface SeekerSummary {
  total_saved_properties: number;
  total_saved_stays: number;
  active_saved_searches: number;
  new_alert_count: number;
  unread_notifications: number;
  upcoming_stays: number;
  pending_bookings: number;
  confirmed_bookings: number;
  unread_messages?: number;
}

export type SavedSearchType = 'PROPERTY' | 'STAY';
export type SavedSearchFrequency = 'OFF' | 'DAILY' | 'WEEKLY' | string;
export type SavedSearchCriteria = Record<string, string | number | boolean | string[] | undefined>;

export interface SavedSearch {
  id: string;
  name: string;
  search_type: SavedSearchType;
  criteria: SavedSearchCriteria;
  notifications_enabled: boolean;
  frequency: SavedSearchFrequency;
  last_checked_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedSearchCreateRequest {
  name: string;
  search_type: SavedSearchType;
  criteria: SavedSearchCriteria;
  notifications_enabled: boolean;
}

export interface SavedSearchCheckResponse {
  saved_search_id: string;
  new_matches: number;
  matches: Array<PropertyCard | StayCard>;
}

export type ViewingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'RESCHEDULE_REQUESTED'
  | string;

export interface ViewingRequest {
  id: string;
  requester_display_name?: string;
  property: string;
  property_title: string;
  property_slug: string;
  property_town: string;
  property_suburb: string;
  property_image: string | null;
  conversation: string | null;
  requested_date: string;
  requested_time: string;
  alternative_date: string | null;
  alternative_time: string | null;
  notes: string;
  status: ViewingStatus;
  created_at: string;
  updated_at: string;
}

export type BookingStatus =
  'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED' | string;

export interface Booking {
  id: string;
  reference: string;
  stay: string;
  stay_name: string;
  stay_slug: string;
  stay_town: string;
  stay_suburb: string;
  stay_image: string | null;
  room_type: string;
  room_name: string;
  conversation: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  rooms: number;
  nightly_pricing: NightlyPrice[];
  nightly_subtotal: string;
  taxes: string;
  fees: string;
  total: string;
  currency: string;
  status: BookingStatus;
  payment_status: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationData {
  route?: string;
  conversation_id?: string;
  booking_id?: string;
  viewing_id?: string;
  saved_search_id?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AccountNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  data: NotificationData;
  action?: { label: string; url: string } | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface NotificationPreference {
  id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  new_message_email: boolean;
  viewing_updates_email: boolean;
  booking_updates_email: boolean;
  saved_search_email: boolean;
  listing_reminders_email: boolean;
  marketing_email: boolean;
  created_at: string;
  updated_at: string;
}

export type UserProfileUpdate = Pick<
  User,
  'first_name' | 'last_name' | 'phone_number' | 'onboarding_intents'
>;

export type FavouritePage = PaginatedResponse<FavouriteItem>;
export type SavedSearchPage = PaginatedResponse<SavedSearch>;
export type ViewingPage = PaginatedResponse<ViewingRequest>;
export type BookingPage = PaginatedResponse<Booking>;
export type NotificationPage = PaginatedResponse<AccountNotification>;

export interface ApiError {
  code: string;
  message: string;
  errors: Record<string, string[]>;
  request_id: string | null;
}
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
export interface User {
  id: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  onboarding_intents: string[];
}
export interface AuthTokens {
  access: string;
  refresh: string;
}
export interface ReferenceOption {
  value: string;
  label: string;
}
export interface RegionReference extends ReferenceOption {
  areas: string[];
}
export interface AmenityReference {
  id: string;
  name: string;
  slug: string;
  category: string;
}
export interface ReferenceData {
  property_types: ReferenceOption[];
  property_amenities: AmenityReference[];
  stay_amenities?: AmenityReference[];
  listing_types: ReferenceOption[];
  stay_types: ReferenceOption[];
  regions: RegionReference[];
  countries: ReferenceOption[];
  currencies: ReferenceOption[];
  verification_types: ReferenceOption[];
}
export interface FrontendConfig {
  default_country: string;
  default_currency: string;
  supported_currencies: string[];
  features: {
    properties: boolean;
    stays: boolean;
    bookings: boolean;
    internal_messaging: boolean;
    registration: boolean;
  };
  map: { default_latitude: number; default_longitude: number; default_zoom: number };
}

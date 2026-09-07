export type StayOrdering = 'newest' | 'price_asc' | 'price_desc' | 'name';
export type StayView = 'list' | 'map';
export interface StaySearchParams {
  stay_type?: string;
  region?: string;
  town?: string;
  suburb?: string;
  search?: string;
  check_in?: string;
  check_out?: string;
  adults?: number;
  children?: number;
  rooms?: number;
  min_price?: string;
  max_price?: string;
  amenities?: string[];
  featured?: boolean;
  verification_status?: string;
  ordering?: StayOrdering;
  page?: number;
  view?: StayView;
  north?: string;
  south?: string;
  east?: string;
  west?: string;
}
export interface StayDateValidation {
  valid: boolean;
  message: string | null;
  complete: boolean;
}

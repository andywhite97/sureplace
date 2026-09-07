export interface VerificationBadge {
  type: string;
  label: string;
}
export interface PropertyCard {
  id: string;
  public_id: string;
  slug: string;
  title: string;
  listing_type: 'RENT' | 'SALE' | string;
  property_type: string;
  price: string;
  currency: string;
  town: string;
  suburb: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: string | number | null;
  parking_spaces: number | null;
  featured: boolean;
  verification_status: string;
  verification_badges: VerificationBadge[];
  availability_status: string;
  availability_confirmed_at: string | null;
  cover_image: string | null;
  is_favourited: boolean;
  created_at: string;
}
export interface StayCard {
  id: string;
  public_id: string;
  slug: string;
  name: string;
  stay_type: string;
  region: string;
  town: string;
  suburb: string;
  latitude?: number | null;
  longitude?: number | null;
  verification_status: string;
  verification_badges: VerificationBadge[];
  featured: boolean;
  cover_image: string | null;
  minimum_nightly_price: string | null;
  available_room_type_count: number;
  is_favourited: boolean;
  created_at: string;
}
export interface Favourite {
  id: string;
  property: string | null;
  stay: string | null;
  created_at: string;
}
export interface PropertyImage {
  id: string;
  image: string;
  caption: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}
export interface PropertyAmenity {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category: string;
}
export interface AdvertiserAgent {
  id: string;
  name: string;
  whatsapp_number: string;
  verification_status: string;
}
export interface AdvertiserAgency {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  verification_status: string;
}
export interface PropertyDetail extends Omit<PropertyCard, 'cover_image'> {
  description: string;
  address: string;
  floor_area: string | null;
  land_area: string | null;
  furnished: boolean;
  pet_friendly: boolean;
  images: PropertyImage[];
  amenities: PropertyAmenity[];
  agent: AdvertiserAgent | null;
  agency: AdvertiserAgency | null;
  published_at: string | null;
  updated_at: string;
  expires_at: string | null;
}
export interface StayImage {
  id: string;
  image: string;
  caption: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}
export interface RoomTypeSummary {
  id: string;
  name: string;
  slug: string;
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
  images: StayImage[];
  created_at: string;
  updated_at: string;
}
export interface StayAmenity {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category: string;
}
export interface StayDetail extends Omit<
  StayCard,
  'cover_image' | 'minimum_nightly_price' | 'available_room_type_count'
> {
  description: string;
  country_code: string;
  address: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  website: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
  images: StayImage[];
  amenities: StayAmenity[];
  room_types: RoomTypeSummary[];
  agency: string | null;
  agent: string | null;
}
export interface NightlyPrice {
  date: string;
  price: string;
}
export interface RoomAvailabilityResult {
  available: boolean;
  room_type_id: string;
  rooms_available: number;
  nightly_prices: NightlyPrice[];
  total: string;
}
export interface StayAvailabilityResponse {
  stay_id: string;
  room_types: RoomAvailabilityResult[];
}
export interface BookingCreateRequest {
  room_type: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  rooms: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests: string;
}
export interface BookingSummary {
  id: string;
  reference: string;
  stay: string;
  stay_name: string;
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
  status: string;
  payment_status: string;
  expires_at: string | null;
  created_at: string;
}

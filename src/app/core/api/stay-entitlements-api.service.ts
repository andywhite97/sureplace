import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';

export interface StayPlan {
  code: string; display_name: string; price: string; billing_interval: string; active_listing_limit: number;
}
export interface StayPricing {
  currency: string; currency_symbol: string; checkout_available: boolean; booking_commission_percent: number;
  plans: StayPlan[]; features: string[];
  addons: { code: string; display_name: string; price: string; quantity: number; duration_days: number; purchase_validity_days: number | null }[];
  promotions: { code: string; display_name: string; price: string; duration_days: number; operational: boolean; checkout_available: boolean; description: string }[];
}
export interface StayEntitlements {
  account_type: string; agency_id: string | null; current_plan: Omit<StayPlan, 'active_listing_limit'>;
  subscription_status: string; active_stay_count: number; base_listing_allowance: number;
  active_extra_allowances: number; unused_extra_allowances: number; base_slots_remaining: number;
  remaining_publication_capacity: number; listing_limit: number; usage_percent: number;
  legacy_over_limit: boolean; protected_booking_over_limit: boolean; can_publish_stay: boolean;
  subscription_expiration: string | null; subscription_grace_until: string | null; grace_entered_at: string | null;
  activated_addons: { id: string; assigned_stay_id: string; activated_at: string; expires_at: string; status: string; expiry_processed_at: string | null }[];
  capacity_reviews: { stay_id: string; stay_name: string; status: string; reason: string; pause_when_safe: boolean; opened_at: string; resolved_at: string | null }[];
  checkout_available: boolean;
}

@Injectable({ providedIn: 'root' })
export class StayEntitlementsApiService {
  private api = inject(ApiClient);
  pricing() { return this.api.get<StayPricing>('/pricing/stays/'); }
  summary(agency?: string | null, stay?: string) {
    return this.api.get<StayEntitlements>('/account/stay-entitlements/', { agency, stay });
  }
}

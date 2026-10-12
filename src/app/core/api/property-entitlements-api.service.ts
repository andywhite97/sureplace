import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';

export interface PropertyPlan {
  code: string; display_name: string; price: string; billing_interval: string;
  active_listing_limit: number; applicable_account_types: string[];
}
export interface PropertyPricing {
  currency: string; currency_symbol: string; checkout_available: boolean;
  plans: PropertyPlan[];
  addons: { code: string; display_name: string; price: string; quantity: number; duration_days: number }[];
  features: string[]; property_sales_commission_percent: number;
}
export interface PropertyEntitlements {
  account_type: string; current_plan: Pick<PropertyPlan, 'code' | 'display_name' | 'price' | 'billing_interval'>;
  active_listing_count: number; base_listing_allowance: number; active_extra_allowances: number;
  unused_extra_allowances: number; remaining_publication_capacity: number; base_slots_remaining: number;
  can_publish_property: boolean;
  listing_limit: number; usage_percent: number; legacy_over_limit: boolean;
  subscription_status: string; subscription_expiration: string | null; subscription_grace_until: string | null;
  activated_addons: { id: string; assigned_property_id: string; activated_at: string; expires_at: string; status: string }[];
  checkout_available: boolean;
}

@Injectable({ providedIn: 'root' })
export class PropertyEntitlementsApiService {
  private api = inject(ApiClient);
  pricing() { return this.api.get<PropertyPricing>('/pricing/properties/'); }
  summary(agency?: string | null, property?: string) {
    return this.api.get<PropertyEntitlements>('/account/property-entitlements/', { agency, property });
  }
}

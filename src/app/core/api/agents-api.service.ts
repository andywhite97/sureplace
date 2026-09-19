import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import { PaginatedResponse } from '../models/api.models';

export interface AgentListItem {
  id: string;
  slug: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  agency: {
    id: string;
    name: string;
    slug: string | null;
    logo: string | null;
    verification_status: string;
  } | null;
  verified_agent: boolean;
  verified_agency: boolean;
  service_areas: string[];
  active_listings_count: number;
  created_at: string;
}

export interface AgentDetail extends AgentListItem {
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  languages: string[];
  years_of_experience: number | null;
  agency_description: string | null;
  active_listings: Array<{
    id: string;
    slug: string;
    title: string;
    listing_type: string;
    price: string;
    currency: string;
    town: string;
    suburb: string;
    bedrooms: number | null;
    bathrooms: number | null;
    cover_image: string | null;
    is_favourited: boolean;
  }>;
}

@Injectable({ providedIn: 'root' })
export class AgentsApiService {
  private api = inject(ApiClient);

  list(params: Record<string, string | string[] | null | undefined> = {}) {
    return this.api.get<PaginatedResponse<AgentListItem>>('/agents/', params as Record<string, string | string[]>);
  }

  detail(idOrSlug: string) {
    return this.api.get<AgentDetail>(`/agents/${encodeURIComponent(idOrSlug)}/`);
  }
}

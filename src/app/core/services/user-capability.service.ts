import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthApiService } from '../auth/auth-api.service';
import { UserCapabilitySummary } from '../models/api.models';
import { ConfigApiService } from '../api/config-api.service';

export type UserCapabilityKey = keyof UserCapabilities;
export type CapabilityStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UserCapabilities {
  canSeekProperties: boolean;
  canSeekStays: boolean;
  canUseSaved: boolean;
  canUseMessaging: boolean;
  canUseViewings: boolean;
  canUseBookings: boolean;
  canUseSavedSearches: boolean;
  canAccessManageDashboard: boolean;
  canManageProperties: boolean;
  canManageStays: boolean;
  canCreatePropertyListing: boolean;
  canCreateStayListing: boolean;
  canAccessAgentTools: boolean;
  hasAgentProfile: boolean;
  canAccessAgencyTools: boolean;
  canCreateAgency: boolean;
  canManageAgency: boolean;
  hasAgencyContext: boolean;
  canAccessVerification: boolean;
  hasIndividualManagementContext: boolean;
  hasAgencyManagementContext: boolean;
}

const emptySummary: UserCapabilitySummary = {
  has_individual_property_context: false,
  has_individual_stay_context: false,
  has_agent_profile: false,
  has_agency_management_context: false,
  can_manage_agency: false,
  agency_count: 0,
};

@Injectable({ providedIn: 'root' })
export class UserCapabilityService {
  private auth = inject(AuthService);
  private api = inject(AuthApiService);
  private config = inject(ConfigApiService);
  private activeUserId = '';
  private request$: Observable<UserCapabilities> | null = null;

  readonly summary = signal<UserCapabilitySummary | null>(null);
  readonly status = signal<CapabilityStatus>('idle');
  readonly capabilities = computed(() => {
    const user = this.auth.user();
    if (!user || !this.authenticated()) {
      return this.resolveCapabilities([], emptySummary);
    }
    return this.resolveCapabilities(user.onboarding_intents || [], this.summary() || emptySummary);
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user || !this.authenticated()) {
        this.clear();
        return;
      }
      if (this.activeUserId !== user.id) {
        this.activeUserId = user.id;
        this.summary.set(null);
        this.status.set('idle');
        this.request$ = null;
        this.resolve().subscribe();
      }
    });
  }

  has(capability: UserCapabilityKey) {
    return this.capabilities()[capability];
  }

  resolve(): Observable<UserCapabilities> {
    if (!this.authenticated()) return of(this.capabilities());
    if (this.summary()) return of(this.capabilities());
    if (this.request$) return this.request$;

    this.status.set('loading');
    const request = this.api.capabilities().pipe(
      tap((summary) => {
        this.summary.set(summary);
        this.status.set('ready');
      }),
      map(() => this.capabilities()),
      catchError(() => {
        this.status.set('error');
        return of(this.capabilities());
      }),
      finalize(() => {
        if (this.request$ === request) this.request$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.request$ = request;
    return request;
  }

  refresh(): Observable<UserCapabilities> {
    if (!this.authenticated()) return of(this.capabilities());
    this.summary.set(null);
    this.request$ = null;
    return this.resolve();
  }

  clear() {
    this.activeUserId = '';
    this.summary.set(null);
    this.request$ = null;
    this.status.set('idle');
  }

  private authenticated() {
    // Supports the lightweight AuthService stubs used by isolated feature tests.
    return this.auth.isAuthenticated?.() ?? !!this.auth.user?.();
  }

  private resolveCapabilities(intents: string[], summary: UserCapabilitySummary): UserCapabilities {
    const selected = new Set(intents);
    const features = this.config.config().features;
    const propertyOwnerIntent = selected.has('PROPERTY_OWNER');
    const agentIntent = selected.has('PROPERTY_AGENT');
    const stayIntent = selected.has('HOSPITALITY_OPERATOR');
    const managerByRelationship =
      summary.has_agent_profile || summary.has_agency_management_context;
    const canManageProperties =
      features.properties &&
      (propertyOwnerIntent || summary.has_individual_property_context || managerByRelationship);
    const canManageStays =
      features.stays &&
      (stayIntent || summary.has_individual_stay_context || managerByRelationship);
    const canAccessManageDashboard =
      canManageProperties ||
      canManageStays ||
      agentIntent ||
      summary.has_agency_management_context;
    const hasIndividualManagementContext =
      summary.has_individual_property_context || summary.has_individual_stay_context;
    const hasAgencyContext = summary.has_agency_management_context || summary.agency_count > 0;
    const canCreateAgency =
      propertyOwnerIntent ||
      agentIntent ||
      stayIntent ||
      hasIndividualManagementContext ||
      summary.has_agent_profile;
    return {
      canSeekProperties: features.properties,
      canSeekStays: features.stays,
      canUseSaved: true,
      canUseMessaging: features.internal_messaging,
      canUseViewings: features.properties,
      canUseBookings: features.bookings,
      canUseSavedSearches: true,
      canAccessManageDashboard,
      canManageProperties,
      canManageStays,
      canCreatePropertyListing: canManageProperties,
      canCreateStayListing: canManageStays,
      canAccessAgentTools: summary.has_agent_profile,
      hasAgentProfile: summary.has_agent_profile,
      canAccessAgencyTools: hasAgencyContext,
      canCreateAgency,
      canManageAgency: hasAgencyContext && summary.can_manage_agency,
      hasAgencyContext,
      canAccessVerification: canManageProperties || canManageStays || hasAgencyContext,
      hasIndividualManagementContext,
      hasAgencyManagementContext: summary.has_agency_management_context,
    };
  }
}

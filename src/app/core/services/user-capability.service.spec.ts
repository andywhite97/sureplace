import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfigApiService } from '../api/config-api.service';
import { AuthApiService } from '../auth/auth-api.service';
import { AuthService } from '../auth/auth.service';
import { User } from '../models/api.models';
import { UserCapabilityService } from './user-capability.service';

describe('UserCapabilityService', () => {
  const user = signal<User | null>(null);
  const features = signal({
    properties: true,
    stays: true,
    bookings: true,
    internal_messaging: true,
  });
  const summary = vi.fn();

  const relationship = (overrides = {}) => ({
    has_individual_property_context: false,
    has_individual_stay_context: false,
    has_agent_profile: false,
    has_agency_management_context: false,
    can_manage_agency: false,
    agency_count: 0,
    ...overrides,
  });

  const setUser = (intents: string[] = []) =>
    user.set({
      id: 'u1',
      email: 'nomsa@example.com',
      phone_number: '',
      first_name: 'Nomsa',
      last_name: 'Dlamini',
      avatar: null,
      is_email_verified: true,
      is_phone_verified: false,
      is_staff: false,
      onboarding_intents: intents,
    });

  beforeEach(() => {
    user.set(null);
    features.set({ properties: true, stays: true, bookings: true, internal_messaging: true });
    summary.mockReset().mockReturnValue(of(relationship()));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user, isAuthenticated: computed(() => !!user()) } },
        { provide: AuthApiService, useValue: { capabilities: summary } },
        {
          provide: ConfigApiService,
          useValue: { config: computed(() => ({ features: features() })) },
        },
      ],
    });
  });

  it('keeps a seeker-only account free of management capabilities', () => {
    setUser(['LOOKING_FOR_PROPERTY']);
    const service = TestBed.inject(UserCapabilityService);

    expect(service.capabilities().canSeekProperties).toBe(true);
    expect(service.capabilities().canAccessManageDashboard).toBe(false);
    expect(service.capabilities().canManageProperties).toBe(false);
    expect(service.capabilities().canCreateAgency).toBe(false);
  });

  it('uses listing intentions as the baseline for relevant independent tools', () => {
    setUser(['PROPERTY_OWNER']);
    const service = TestBed.inject(UserCapabilityService);

    expect(service.capabilities().canManageProperties).toBe(true);
    expect(service.capabilities().canManageStays).toBe(false);
    expect(service.capabilities().canAccessVerification).toBe(true);
  });

  it('recomputes immediately when profile intentions are updated', () => {
    setUser(['LOOKING_FOR_PROPERTY']);
    const service = TestBed.inject(UserCapabilityService);
    expect(service.capabilities().canManageStays).toBe(false);

    user.update((value) => ({
      ...value!,
      onboarding_intents: ['LOOKING_FOR_PROPERTY', 'HOSPITALITY_OPERATOR'],
    }));

    expect(service.capabilities().canManageStays).toBe(true);
  });

  it('keeps existing owned resources accessible after an intention is removed', () => {
    summary.mockReturnValue(of(relationship({ has_individual_stay_context: true })));
    setUser([]);
    const service = TestBed.inject(UserCapabilityService);
    service.resolve().subscribe();

    expect(service.capabilities().canManageStays).toBe(true);
    expect(service.capabilities().canAccessManageDashboard).toBe(true);
    expect(service.capabilities().hasIndividualManagementContext).toBe(true);
  });

  it('derives agency administration from the real membership summary', () => {
    summary.mockReturnValue(
      of(
        relationship({
          has_agent_profile: true,
          has_agency_management_context: true,
          can_manage_agency: true,
          agency_count: 1,
        }),
      ),
    );
    setUser([]);
    const service = TestBed.inject(UserCapabilityService);
    service.resolve().subscribe();

    expect(service.capabilities().hasAgentProfile).toBe(true);
    expect(service.capabilities().canAccessAgencyTools).toBe(true);
    expect(service.capabilities().canManageAgency).toBe(true);
    expect(service.capabilities().canManageProperties).toBe(true);
    expect(service.capabilities().canManageStays).toBe(true);
  });

  it('clears relationship state when the session ends', () => {
    summary.mockReturnValue(of(relationship({ has_individual_property_context: true })));
    setUser([]);
    const service = TestBed.inject(UserCapabilityService);
    service.resolve().subscribe();
    expect(service.capabilities().canManageProperties).toBe(true);

    user.set(null);

    expect(service.capabilities().canAccessManageDashboard).toBe(false);
    expect(service.capabilities().hasIndividualManagementContext).toBe(false);
  });
});

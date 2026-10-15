import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserCapabilityService } from './user-capability.service';
import { AgencyNavigationService } from './agency-navigation.service';
import { AuthService } from '../auth/auth.service';

describe('AgencyNavigationService', () => {
  const user = signal({ onboarding_intents: ['PROPERTY_AGENT'] });
  const capabilities = signal<any>({
    canAccessAgencyTools: false,
    canCreateAgency: true,
    canManageAgency: false,
  });
  beforeEach(() => {
    user.set({ onboarding_intents: ['PROPERTY_AGENT'] });
    capabilities.set({
      canAccessAgencyTools: false,
      canCreateAgency: true,
      canManageAgency: false,
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user } },
        {
          provide: UserCapabilityService,
          useValue: { capabilities, refresh: vi.fn(() => of(capabilities())) },
        },
      ],
    });
  });
  it.each(['OWNER', 'ADMIN', 'AGENT'])(
    'uses the backend membership role %s for Team visibility',
    (role) => {
      capabilities.set({
        canAccessAgencyTools: true,
        canCreateAgency: false,
        canManageAgency: role !== 'AGENT',
      });
      const service = TestBed.inject(AgencyNavigationService);
      service.refresh();
      expect(service.links().map((link) => link.label)).toEqual(
        role === 'AGENT' ? ['Agency'] : ['Agency', 'Team'],
      );
    },
  );
  it('does not expose Team to ordinary agency members', () => {
    capabilities.set({
      canAccessAgencyTools: true,
      canCreateAgency: false,
      canManageAgency: false,
    });
    const service = TestBed.inject(AgencyNavigationService);
    service.refresh();
    expect(service.links().map((link) => link.label)).toEqual(['Agency']);
  });
  it.each([
    { intents: ['PROPERTY_AGENT'], visible: true },
    { intents: ['PROPERTY_OWNER'], visible: false },
    { intents: ['HOSPITALITY_OPERATOR'], visible: false },
    { intents: ['LOOKING_FOR_PROPERTY'], visible: false },
    { intents: [], visible: false },
  ])('shows agency creation for $intents only when listing as an agency', ({ intents, visible }) => {
    user.set({ onboarding_intents: intents });
    const service = TestBed.inject(AgencyNavigationService);
    service.refresh();
    expect(service.links().map((link) => link.label)).toEqual(visible ? ['Create an agency'] : []);
    capabilities.set({
      canAccessAgencyTools: false,
      canCreateAgency: false,
      canManageAgency: false,
    });
    expect(service.links()).toEqual([]);
  });
  it('removes agency links when membership capability is cleared', () => {
    capabilities.set({ canAccessAgencyTools: true, canCreateAgency: false, canManageAgency: true });
    const service = TestBed.inject(AgencyNavigationService);
    capabilities.set({
      canAccessAgencyTools: false,
      canCreateAgency: false,
      canManageAgency: false,
    });
    expect(service.links()).toEqual([]);
  });
});

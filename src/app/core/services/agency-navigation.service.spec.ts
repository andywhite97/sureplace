import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserCapabilityService } from './user-capability.service';
import { AgencyNavigationService } from './agency-navigation.service';

describe('AgencyNavigationService', () => {
  const capabilities = signal<any>({
    canAccessAgencyTools: false,
    canCreateAgency: true,
    canManageAgency: false,
  });
  beforeEach(() => {
    capabilities.set({
      canAccessAgencyTools: false,
      canCreateAgency: true,
      canManageAgency: false,
    });
    TestBed.configureTestingModule({
      providers: [
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
  it('offers creation only when listing or agent context makes it relevant', () => {
    const service = TestBed.inject(AgencyNavigationService);
    service.refresh();
    expect(service.links().map((link) => link.label)).toEqual(['Create an agency']);
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

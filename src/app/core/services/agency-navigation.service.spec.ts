import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AgencyManagementApiService } from '../api/manage-api.services';
import { AuthService } from '../auth/auth.service';
import { Agency } from '../models/manage.models';
import { AgencyNavigationService } from './agency-navigation.service';

describe('AgencyNavigationService', () => {
  const user = signal<{ is_email_verified: boolean } | null>(null);
  const mine = vi.fn();
  beforeEach(() => {
    user.set({ is_email_verified: true });
    mine.mockReset().mockReturnValue(of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user, isAuthenticated: computed(() => !!user()) } },
        { provide: AgencyManagementApiService, useValue: { mine } },
      ],
    });
  });
  it.each(['OWNER', 'ADMIN', 'AGENT'])(
    'uses the backend membership role %s for Team visibility',
    (role) => {
      mine.mockReturnValue(of([{ user_role: role } as Agency]));
      const service = TestBed.inject(AgencyNavigationService);
      service.refresh();
      expect(service.links().map((link) => link.label)).toEqual(
        role === 'AGENT' ? ['Agency'] : ['Agency', 'Team'],
      );
    },
  );
  it('does not expose Team to unverified members', () => {
    user.set({ is_email_verified: false });
    mine.mockReturnValue(of([{ user_role: 'OWNER' } as Agency]));
    const service = TestBed.inject(AgencyNavigationService);
    service.refresh();
    expect(service.links().map((link) => link.label)).toEqual(['Agency']);
  });
  it('offers creation only after confirmed empty membership', () => {
    const service = TestBed.inject(AgencyNavigationService);
    service.refresh();
    expect(service.links().map((link) => link.label)).toEqual(['Create an agency']);
    mine.mockReturnValue(throwError(() => new Error('unavailable')));
    service.refresh();
    expect(service.links()).toEqual([]);
  });
  it('ignores stale responses after logout and makes no anonymous request', () => {
    const response = new Subject<Agency[]>();
    mine.mockReturnValue(response);
    const service = TestBed.inject(AgencyNavigationService);
    service.refresh();
    user.set(null);
    service.refresh();
    response.next([{ user_role: 'OWNER' } as Agency]);
    expect(service.links()).toEqual([]);
    expect(mine).toHaveBeenCalledTimes(1);
  });
});

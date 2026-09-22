import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { UserCapabilityService } from '../services/user-capability.service';
import { capabilityGuard } from './auth.guard';

describe('capabilityGuard', () => {
  const auth = { initialize: vi.fn(), isAuthenticated: vi.fn() };
  const capabilities = { resolve: vi.fn(), has: vi.fn() };

  beforeEach(() => {
    auth.initialize.mockReset().mockReturnValue(of(null));
    auth.isAuthenticated.mockReset().mockReturnValue(true);
    capabilities.resolve.mockReset().mockReturnValue(of({}));
    capabilities.has.mockReset().mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: UserCapabilityService, useValue: capabilities },
      ],
    });
  });

  it('allows a route when the central capability is present', () => {
    capabilities.has.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        { data: { capability: 'canManageProperties' } } as any,
        { url: '/account/manage/properties' } as any,
      ),
    ) as any;

    result.subscribe((value: unknown) => expect(value).toBe(true));
    expect(capabilities.has).toHaveBeenCalledWith('canManageProperties');
  });

  it('redirects an irrelevant direct listing URL to preference onboarding', () => {
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        {
          data: { capability: 'canCreateStayListing', capabilityIntent: 'HOSPITALITY_OPERATOR' },
        } as any,
        { url: '/account/manage/stays/new' } as any,
      ),
    ) as any;

    result.subscribe((tree: any) => {
      expect(router.serializeUrl(tree)).toBe('/account/profile?intent=HOSPITALITY_OPERATOR');
    });
  });
});

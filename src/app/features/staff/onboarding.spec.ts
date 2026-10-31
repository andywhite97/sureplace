import { UserCapabilityService } from '../../core/services/user-capability.service';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  ActivatedRoute,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { of, throwError, firstValueFrom, Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { OnboardingApi, Prospect } from '../../core/api/onboarding-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { staffAccessGuard } from '../../core/guards/auth.guard';
import { OnboardingComponent } from './onboarding.component';
import { PrivatePreviewComponent, OnboardingClaimComponent } from './private-preview.component';

const prospect = {
  id: 'lead-1',
  kind: 'STAY',
  business_name: 'Demo lodge',
  status: 'NEW',
  version: 1,
  draft_payload: { description: 'Owner text', stay_type: 'LODGE' },
  images: [],
  audit: [],
  town: 'Mbabane',
  region: 'Hhohho',
} as unknown as Prospect;
describe('Assisted onboarding', () => {
  beforeEach(() => TestBed.configureTestingModule({providers:[{provide:UserCapabilityService,useValue:{refresh:()=>of({})}}]}));
  function staffSetup() {
    const api = {
      list: vi.fn(() => of({ results: [prospect], count: 1, next: null })),
      action: vi.fn(() => of({ ...prospect, status: 'PREVIEW_READY' })),
      update: vi.fn(() => of(prospect)),
      create: vi.fn(() => of(prospect)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OnboardingApi, useValue: api },
        { provide: AuthService, useValue: { user: () => ({ is_superuser: true }) } },
      ],
    });
    return api;
  }
  it('loads the board and restores preview content for editing', () => {
    staffSetup();
    const f = TestBed.createComponent(OnboardingComponent);
    f.componentInstance.select(prospect);
    f.detectChanges();
    expect(f.componentInstance.form.controls.description.value).toBe('Owner text');
    expect(f.nativeElement.textContent).toContain('Demo lodge');
  });
  it('sends the current version with workflow actions', () => {
    const api = staffSetup();
    const f = TestBed.createComponent(OnboardingComponent);
    f.componentInstance.select(prospect);
    f.componentInstance.run('prepare');
    expect(api.action).toHaveBeenCalledWith('lead-1', 'prepare', { version: 1 });
    expect(f.componentInstance.selected()?.status).toBe('PREVIEW_READY');
  });
  it('preserves edits when the backend rejects a stale update', () => {
    const api = staffSetup();
    api.update.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { message: 'Reload before saving' } }),
      ),
    );
    const f = TestBed.createComponent(OnboardingComponent);
    f.componentInstance.select(prospect);
    f.componentInstance.form.controls.description.setValue('New unsaved text');
    f.componentInstance.save();
    expect(f.componentInstance.error()).toContain('Reload');
    expect(f.componentInstance.form.controls.description.value).toBe('New unsaved text');
  });
  it('denies seekers the staff onboarding route', async () => {
    const user = { is_staff: false, staff_permissions: [] };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { initialize: () => of(null), user: () => user } },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      staffAccessGuard(
        {
          data: { staffPermissions: ['core.view_onboardingprospect'] },
        } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
    expect(String(await firstValueFrom(result as Observable<boolean | UrlTree>))).toBe('/account');
  });
  it('requires the specific staff permission', async () => {
    const user = { is_staff: true, staff_permissions: ['stays.review_stay'] };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { initialize: () => of(null), user: () => user } },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      staffAccessGuard(
        {
          data: { staffPermissions: ['core.view_onboardingprospect'] },
        } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
    expect(String(await firstValueFrom(result as Observable<boolean | UrlTree>))).toBe(
      '/staff/no-access',
    );
  });
  it('renders a private preview without booking, enquiry or favourite controls', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { fragment: 'token' } } },
        {
          provide: OnboardingApi,
          useValue: {
            preview: () =>
              of({
                business_name: 'Demo lodge',
                kind: 'STAY',
                version: 1,
                content: { description: 'Owner text' },
                images: [],
                notice: 'Private preview — not yet published',
              }),
          },
        },
      ],
    });
    const f = TestBed.createComponent(PrivatePreviewComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('not yet published');
    expect(f.nativeElement.querySelectorAll('button,a,form').length).toBe(0);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex',
    );
  });
  it('shows a neutral expiry message', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { fragment: 'expired' } } },
        { provide: OnboardingApi, useValue: { preview: () => throwError(() => new Error()) } },
      ],
    });
    const f = TestBed.createComponent(PrivatePreviewComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('unavailable or has expired');
  });
  it('requires explicit rights acceptance before claiming', () => {
    const api = {
      claim: () => of({ business_name: 'Demo lodge', version: 1, content: {} }),
      accept: vi.fn(() => of({ kind: 'STAY', listing_id: 'draft' })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'lead-1' } } } },
        { provide: OnboardingApi, useValue: api },
      ],
    });
    const f = TestBed.createComponent(OnboardingClaimComponent);
    f.detectChanges();
    f.componentInstance.accept();
    expect(api.accept).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('button').disabled).toBe(true);
  });
  it('shows claim conflict without reporting success', () => {
    const api = {
      claim: () => of({ business_name: 'Demo lodge', version: 1, content: {} }),
      accept: () =>
        throwError(
          () => new HttpErrorResponse({ status: 409, error: { message: 'Content changed' } }),
        ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'lead-1' } } } },
        { provide: OnboardingApi, useValue: api },
      ],
    });
    const f = TestBed.createComponent(OnboardingClaimComponent);
    f.componentInstance.rights = true;
    f.componentInstance.accept();
    expect(f.componentInstance.message()).toContain('Content changed');
    expect(f.componentInstance.busy()).toBe(false);
  });
});

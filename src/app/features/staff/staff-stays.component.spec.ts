import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { StaffStayApiService } from '../../core/api/staff-stay-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { StaffStay } from '../../core/models/staff-stay.models';
import { ToastService } from '../../core/services/toast.service';
import { LeafletLoaderService } from '../../shared/map/leaflet-loader.service';
import { StaffStaySelectionComponent, StaffStaysComponent } from './staff-stays.component';
import { installNativeDialogStubs } from './staff-dialog.test-support';

const stay = {
  id: 'stay-1',
  name: 'Review Lodge',
  public_id: 'SP-STAY-1',
  status: 'SUBMITTED',
  status_label: 'Submitted',
  verification_status: 'UNVERIFIED',
  description: 'A comfortable lodge',
  latitude: null,
  longitude: null,
  town: 'Mbabane',
  region: 'Hhohho',
  updated_at: '2026-10-01',
  owner: {
    first_name: 'Andile',
    last_name: 'Host',
    email: 'host@example.com',
    is_email_verified: true,
  },
  images: [],
  amenities: [],
  room_types: [],
  reports: [],
  audit_events: [],
  verification_requests: [],
} as unknown as StaffStay;
const summary = {
  total: 42,
  submitted: 20,
  under_review: 1,
  approved: 20,
  rejected: 1,
  towns: ['Mbabane'],
  hosts: [{ id: 'host-1', name: 'Andile Host' }],
};

async function setup(url = '/staff/stays', permissions = ['stays.review_stay']) {
  const api = {
    list: vi.fn(() =>
      of({ results: [stay], count: 21, next: '?page=2' as string | null, previous: null }),
    ),
    summary: vi.fn(() => of(summary)),
    detail: vi.fn(() => of(stay)),
    moderate: vi.fn(() => of({ ...stay, status: 'PUBLISHED', status_label: 'Published' })),
  };
  const toast = { show: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: 'staff/stays',
          component: StaffStaysComponent,
          children: [{ path: ':id', component: StaffStaySelectionComponent }],
        },
      ]),
      { provide: StaffStayApiService, useValue: api },
      {
        provide: AuthService,
        useValue: { user: signal({ is_superuser: false, staff_permissions: permissions }) },
      },
      { provide: ToastService, useValue: toast },
      { provide: LeafletLoaderService, useValue: { load: () => Promise.resolve(null) } },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  harness.detectChanges();
  const component = harness.routeDebugElement!.componentInstance as StaffStaysComponent;
  return {
    harness,
    component,
    api,
    toast,
    router: TestBed.inject(Router),
    element: harness.routeNativeElement!,
  };
}

describe('Staff stay dashboard', () => {
  beforeEach(installNativeDialogStubs);
  it('keeps mobile filter edits private until applied and discards cancelled edits', async () => {
    const { component, harness, api, router } = await setup('/staff/stays?page=2');
    component.openFilters();
    harness.detectChanges();
    component.filterDraft.status = 'PUBLISHED';
    component.filterDraft.town = 'Mbabane';
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(component.page()).toBe(2);
    component.closeFilters();
    component.openFilters();
    expect(component.filterDraft.status).toBe('SUBMITTED,UNDER_REVIEW');
    expect(component.filterDraft.town).toBe('');
    component.filterDraft.status = 'PUBLISHED';
    component.filterDraft.town = 'Mbabane';
    component.applyMobileFilters();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(component.filtersOpen()).toBe(false);
    expect(component.page()).toBe(1);
    expect(component.filterCount()).toBe(2);
    expect(router.parseUrl(router.url).queryParams).toEqual({
      status: 'PUBLISHED',
      town: 'Mbabane',
    });
    expect(api.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'PUBLISHED', town: 'Mbabane' }),
    );
    component.openFilters();
    component.resetMobileFilters();
    expect(component.query().town).toBe('Mbabane');
    component.applyMobileFilters();
    await harness.fixture.whenStable();
    expect(component.filterCount()).toBe(0);
  });
  it('uses global summary counts and the paginated result count separately', async () => {
    const { component, api, element } = await setup();
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.summary).toHaveBeenCalledTimes(1);
    expect(component.summary()?.total).toBe(42);
    expect(element.textContent).toContain('21 stays found');
    expect(element.querySelector('a[href="/staff/stays/stay-1"]')).toBeTruthy();
  });
  it('restores deep links and keeps the queue when selecting another stay', async () => {
    const { harness, api, component, router } = await setup(
      '/staff/stays/stay-1?town=Mbabane&tab=rooms',
    );
    expect(component.detailId()).toBe('stay-1');
    expect(component.tab()).toBe('rooms');
    expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ town: 'Mbabane' }));
    await router.navigateByUrl('/staff/stays/stay-2?town=Mbabane&tab=rooms');
    harness.detectChanges();
    expect(api.detail).toHaveBeenLastCalledWith('stay-2');
    expect(api.list).toHaveBeenCalledTimes(1);
  });
  it('resets pagination and stores applied search, host and status in the URL', async () => {
    const { component, router, harness, api } = await setup('/staff/stays?page=2');
    component.search = 'Lodge';
    component.status = 'PUBLISHED';
    component.host = 'host-1';
    component.applyFilters();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.parseUrl(router.url).queryParams).toEqual(
      expect.objectContaining({ search: 'Lodge', status: 'PUBLISHED', host: 'host-1' }),
    );
    expect(component.page()).toBe(1);
    expect(api.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Lodge', page: 1 }),
    );
  });
  it('moves between backend pages and clears filters', async () => {
    const { component, harness } = await setup();
    component.changePage(1);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(component.page()).toBe(2);
    expect(component.first()).toBe(21);
    component.clearFilters();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(component.page()).toBe(1);
  });
  it('does not reload queue or detail for a tab change', async () => {
    const { component, api, harness } = await setup('/staff/stays/stay-1');
    component.selectTab('verification');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(component.tab()).toBe('verification');
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.detail).toHaveBeenCalledTimes(1);
  });
  it('handles empty results and recoverable API errors', async () => {
    const { component, api, element, harness } = await setup();
    api.list.mockReturnValue(of({ results: [], count: 0, next: null, previous: null }));
    component.retryQueue();
    harness.detectChanges();
    expect(element.textContent).toContain('No matching stays');
    api.list.mockReturnValue(throwError(() => new Error('Offline')));
    component.retryQueue();
    harness.detectChanges();
    expect(element.querySelector('[role="alert"]')).toBeTruthy();
  });
  it('waits for moderation success before changing detail and refreshing counts', async () => {
    const { component, api, harness } = await setup('/staff/stays/stay-1', [
      'stays.review_stay',
      'stays.approve_stay',
    ]);
    const result = new Subject<StaffStay>();
    api.moderate.mockReturnValue(result);
    component.act({ action: 'approve', reason: '' });
    component.act({ action: 'approve', reason: '' });
    expect(component.stay()?.status).toBe('SUBMITTED');
    expect(api.moderate).toHaveBeenCalledTimes(1);
    result.next({ ...stay, status: 'PUBLISHED', status_label: 'Published' });
    result.complete();
    harness.detectChanges();
    expect(component.stay()?.status).toBe('PUBLISHED');
    expect(api.summary).toHaveBeenCalledTimes(2);
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it('retains the original status and shows backend validation feedback', async () => {
    const { component, api } = await setup('/staff/stays/stay-1');
    api.moderate.mockReturnValue(
      throwError(() => ({
        error: { message: 'Validation failed', errors: { room_types: ['Add an active room.'] } },
      })),
    );
    component.act({ action: 'approve', reason: '' });
    expect(component.stay()?.status).toBe('SUBMITTED');
    expect(component.actionError()).toBe('Add an active room.');
    expect(component.busy()).toBe(false);
  });
  it('recovers when a completed review removes the last remaining result page', async () => {
    const { component, api, harness } = await setup('/staff/stays/stay-1?page=2');
    api.list.mockImplementation((query?: { page: number }) =>
      query?.page === 2
        ? throwError(() => ({ status: 404, error: { message: 'Invalid page.' } }))
        : of({ results: [stay], count: 20, next: null, previous: null }),
    );
    component.act({ action: 'approve', reason: '' });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(component.page()).toBe(1);
    expect(component.stay()?.status).toBe('PUBLISHED');
    expect(component.queueError()).toBe('');
    expect(component.count()).toBe(20);
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { AuthService } from '../../core/auth/auth.service';
import { Agency, ManagementDashboardResponse } from '../../core/models/manage.models';
import { SeoService } from '../../core/services/seo.service';
import { UserCapabilityService } from '../../core/services/user-capability.service';
import { AgencyDashboardComponent } from './agency-dashboard.component';

describe('AgencyDashboardComponent', () => {
  const agency: Agency = {
    id: 'agency-1',
    name: 'Lusito Estates',
    trading_name: '',
    slug: 'lusito-estates',
    logo: null,
    description: '',
    phone: '',
    email: '',
    whatsapp_number: '',
    website: '',
    address: '',
    region: 'Hhohho',
    town: 'Mbabane',
    suburb: '',
    country_code: 'SZ',
    verification_status: 'VERIFIED',
    is_active: true,
    user_role: 'OWNER',
  };

  const dashboard = (
    overrides: Partial<ManagementDashboardResponse> = {},
  ): ManagementDashboardResponse => ({
    mode: 'dashboard',
    contexts: { individual: true, agencies: [agency] },
    context: { kind: 'individual', id: null, name: 'Individual', role: 'OWNER' },
    stats: {
      total_listings: 3,
      published_listings: 2,
      enquiries: 4,
      pending_requests: 2,
      pending_viewings: 1,
      pending_bookings: 1,
    },
    listings: {
      count: 1,
      page: 1,
      page_size: 6,
      total_pages: 1,
      next_page: null,
      previous_page: null,
      results: [
        {
          id: 'property-1',
          kind: 'property',
          public_id: 'SP-1',
          slug: 'family-home',
          title: 'Family Home',
          subtype: 'House',
          status: 'PUBLISHED',
          town: 'Mbabane',
          suburb: 'Sidwashini',
          cover_image: null,
          updated_at: '2026-09-22T10:00:00Z',
          facts: ['3 beds', '2 baths'],
          edit_url: '/account/manage/properties/property-1/edit',
          public_url: '/properties/family-home',
        },
      ],
    },
    ...overrides,
  });

  beforeEach(() => sessionStorage.clear());

  function setup(response: ManagementDashboardResponse, implementation?: ReturnType<typeof vi.fn>) {
    const managementDashboard = implementation || vi.fn(() => of(response));
    const fixture = TestBed.configureTestingModule({
      imports: [AgencyDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AgencyManagementApiService, useValue: { managementDashboard } },
        {
          provide: AuthService,
          useValue: { user: signal({ first_name: 'Nomsa', last_name: 'Dlamini' }) },
        },
        {
          provide: UserCapabilityService,
          useValue: {
            capabilities: signal({
              canCreatePropertyListing: true,
              canCreateStayListing: true,
              canManageProperties: true,
              canManageStays: true,
              canCreateAgency: true,
            }),
          },
        },
        { provide: SeoService, useValue: { privatePage: vi.fn() } },
      ],
    }).createComponent(AgencyDashboardComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, managementDashboard };
  }

  it('shows the real onboarding choice when no management context exists', () => {
    const response = dashboard({
      mode: 'onboarding',
      contexts: { individual: false, agencies: [] },
      context: null,
      stats: null,
      listings: { ...dashboard().listings, count: 0, results: [] },
    });
    const { fixture } = setup(response);

    expect(fixture.nativeElement.textContent).toContain('List independently');
    expect(fixture.nativeElement.textContent).toContain('Create an agency');
    expect(fixture.nativeElement.querySelector('.stats-grid')).toBeNull();
  });

  it('renders exact dashboard metrics and real management listing links', () => {
    const { fixture } = setup(dashboard());
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Welcome back, Nomsa');
    expect(text).toContain('3');
    expect(text).toContain('Total listings');
    expect(text).toContain('4');
    expect(text).toContain('Guest enquiries');
    expect(text).toContain('Family Home');
    expect(
      fixture.nativeElement.querySelector('a[href="/account/manage/properties/property-1/edit"]'),
    ).toBeTruthy();
    expect(text).not.toContain('Total views');
    expect(text).not.toContain('%');
  });

  it('switches to an authorized agency and persists only the session context', () => {
    const agencyResponse = dashboard({
      context: { kind: 'agency', id: agency.id, name: agency.name, role: 'OWNER', agency },
    });
    const request = vi
      .fn()
      .mockReturnValueOnce(of(dashboard()))
      .mockReturnValueOnce(of(agencyResponse));
    const { component } = setup(dashboard(), request);

    component.switchContext(`agency:${agency.id}`);

    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ context: 'agency:agency-1' }),
    );
    expect(component.dashboard()?.context?.kind).toBe('agency');
    expect(sessionStorage.getItem('sureplace.management-context')).toBe('agency:agency-1');
  });

  it('sends search, status, type and ordering to the backend', () => {
    const request = vi.fn(() => of(dashboard()));
    const { component } = setup(dashboard(), request);
    component.query.set('Mbabane');
    component.status.set('PUBLISHED');
    component.type.set('property');
    component.ordering.set('oldest');

    component.applyFilters();

    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'Mbabane',
        status: 'PUBLISHED',
        type: 'property',
        ordering: 'oldest',
        page: '1',
      }),
    );
  });

  it('shows a retry state when the dashboard cannot load', () => {
    const request = vi.fn(() => throwError(() => ({ status: 500 })));
    const { fixture } = setup(dashboard(), request);

    expect(fixture.nativeElement.textContent).toContain(
      "We couldn't load your management dashboard.",
    );
    expect(fixture.nativeElement.querySelector('.page-state button')).toBeTruthy();
  });
});

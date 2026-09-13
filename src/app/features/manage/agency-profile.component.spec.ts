import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ToastService } from '../../core/services/toast.service';
import { AgencyDashboard } from '../../core/models/manage.models';
import { AgencyProfileComponent } from './agency-profile.component';

const dashboard: AgencyDashboard = {
  agency: {
    id: 'agency-1',
    name: 'Andile Realty',
    trading_name: 'Andile Homes',
    slug: 'andile-realty',
    logo: null,
    description: 'Trusted property specialists.',
    phone: '+26876123456',
    email: 'hello@example.com',
    whatsapp_number: '',
    website: 'https://example.com',
    address: '1 Main Street',
    region: 'Manzini',
    town: 'Manzini',
    suburb: 'Central',
    country_code: 'SZ',
    verification_status: 'PENDING',
    is_active: true,
    user_role: 'OWNER',
    team_count: 2,
  },
  role: 'OWNER',
  active_properties: 3,
  draft_properties: 1,
  active_stays: 2,
  team_members: 2,
  pending_invitations: 1,
  verification_status: 'PENDING',
};

describe('AgencyProfileComponent', () => {
  let api: {
    mine: ReturnType<typeof vi.fn>;
    dashboard: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let toast: { show: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    api = {
      mine: vi.fn(() => of([dashboard.agency])),
      dashboard: vi.fn(() => of(dashboard)),
      update: vi.fn(() => of(dashboard.agency)),
    };
    toast = { show: vi.fn() };
    TestBed.configureTestingModule({
      imports: [AgencyProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AgencyManagementApiService, useValue: api },
        { provide: ToastService, useValue: toast },
        {
          provide: ReferenceApiService,
          useValue: {
            data: signal({
              regions: [{ value: 'MANZINI', label: 'Manzini', areas: ['Manzini', 'Matsapha'] }],
              currencies: [],
            }),
            load: () => of(null),
          },
        },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(AgencyProfileComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('renders the identity card, real summary counts and grouped backend-driven location fields', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Andile Realty');
    expect(fixture.nativeElement.textContent).toContain('Pending verification');
    expect(fixture.nativeElement.textContent).toContain('Listings');
    expect(fixture.nativeElement.textContent).toContain('3');
    expect(fixture.nativeElement.textContent).toContain('Stays');
    expect(
      fixture.nativeElement.querySelector('select[formControlName="region"]').textContent,
    ).toContain('Manzini');
    expect(
      fixture.nativeElement.querySelector('select[formControlName="town"]').textContent,
    ).toContain('Matsapha');
  });
  it('restores persisted values on cancel and saves explicit form data', () => {
    const component = create().componentInstance;
    component.form.controls.name.setValue('New name');
    component.cancel();
    expect(component.form.controls.name.value).toBe('Andile Realty');
    component.form.controls.name.setValue('New name');
    component.save(dashboard.agency);
    expect(api.update).toHaveBeenCalledWith(
      'agency-1',
      expect.objectContaining({ name: 'New name' }),
    );
    expect(toast.show).toHaveBeenCalledWith({ kind: 'success', title: 'Agency profile updated' });
  });
  it('shows a recoverable save failure', () => {
    api.update.mockReturnValue(throwError(() => new Error('Failed')));
    const component = create().componentInstance;
    component.form.controls.name.setValue('New name');
    component.save(dashboard.agency);
    expect(component.saveError()).toContain('Could not update');
  });
  it('uploads a permitted logo as multipart and refreshes the identity image', () => {
    const component = create().componentInstance;
    const file = new File(['image'], 'logo.png', { type: 'image/png' });
    api.update.mockReturnValue(of({ ...dashboard.agency, logo: '/logo.png' }));
    component.changeLogo({ 0: file, length: 1, item: () => file } as unknown as FileList);
    const formData = api.update.mock.calls[0][1] as FormData;
    expect(formData.get('logo')).toBe(file);
    expect(component.logoPreview()).toBe('/logo.png');
  });
  it('renders read-only for an agent while retaining profile data', () => {
    api.dashboard.mockReturnValue(
      of({ ...dashboard, role: 'AGENT', agency: { ...dashboard.agency, user_role: 'AGENT' } }),
    );
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('view this profile, but not edit it');
    expect(fixture.nativeElement.querySelector('.logo-action')).toBeNull();
  });
});

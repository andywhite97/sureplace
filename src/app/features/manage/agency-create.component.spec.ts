import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { AgencyNavigationService } from '../../core/services/agency-navigation.service';
import { ToastService } from '../../core/services/toast.service';
import { AgencyCreateComponent } from './agency-create.component';

describe('AgencyCreateComponent', () => {
  let api: { create: ReturnType<typeof vi.fn> };
  let navigation: { refresh: ReturnType<typeof vi.fn> };
  let toast: { show: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { create: vi.fn(() => of({ id: 'agency-1', name: 'Andile Realty' })) };
    navigation = { refresh: vi.fn() };
    toast = { show: vi.fn() };
    TestBed.configureTestingModule({
      imports: [AgencyCreateComponent],
      providers: [
        provideRouter([]),
        { provide: AgencyManagementApiService, useValue: api },
        { provide: AgencyNavigationService, useValue: navigation },
        { provide: ToastService, useValue: toast },
        {
          provide: ReferenceApiService,
          useValue: {
            data: signal({ regions: [{ value: 'MANZINI', label: 'Manzini', areas: ['Manzini', 'Matsapha'] }] }),
            load: () => of(null),
          },
        },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(AgencyCreateComponent);
    fixture.detectChanges();
    return fixture;
  }
  function complete(component: AgencyCreateComponent) {
    component.form.setValue({
      name: 'Andile Realty', trading_name: 'Andile Homes', description: 'Trusted local specialists.',
      email: 'hello@example.com', phone: '+26876123456', whatsapp_number: '', website: '',
      region: 'Manzini', town: 'Matsapha', suburb: 'Ngwane Park', address: '1 Main Road',
    });
  }

  it('validates details, preserves them between steps, and filters towns from backend reference data', () => {
    const component = create().componentInstance;
    component.next();
    expect(component.error()).toContain('highlighted');
    component.form.controls.name.setValue('Andile Realty');
    component.form.controls.description.setValue('Trusted local specialists.');
    component.next();
    expect(component.step()).toBe(1);
    expect(component.form.controls.name.value).toBe('Andile Realty');
    component.form.controls.region.setValue('Manzini');
    expect(component.towns()).toEqual(['Manzini', 'Matsapha']);
  });

  it('shows review ownership and verification messaging, and edit keeps form state', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    complete(component);
    component.goTo(3);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Starts as unverified');
    expect(fixture.nativeElement.textContent).toContain('You will become the agency owner.');
    component.goTo(1);
    expect(component.form.controls.email.value).toBe('hello@example.com');
  });

  it('sends one multipart create request, refreshes navigation, and enters the success state', () => {
    const component = create().componentInstance;
    complete(component);
    component.goTo(3);
    component.submit();
    component.submit();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(component.step()).toBe(4);
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
    expect(toast.show).toHaveBeenCalled();
    const data = api.create.mock.calls[0][0] as FormData;
    expect(data.get('name')).toBe('Andile Realty');
  });

  it('keeps the review state after a generic create error', () => {
    api.create.mockReturnValue(throwError(() => new Error('Network error')));
    const component = create().componentInstance;
    complete(component);
    component.goTo(3);
    component.submit();
    expect(component.step()).toBe(3);
    expect(component.error()).toContain("Couldn't create");
  });

  it('prevents duplicate requests while creation is pending', () => {
    const pending = new Subject<unknown>();
    api.create.mockReturnValue(pending);
    const component = create().componentInstance;
    complete(component);
    component.goTo(3);
    component.submit();
    component.submit();
    expect(api.create).toHaveBeenCalledTimes(1);
  });
});

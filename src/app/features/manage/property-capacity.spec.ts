import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PropertyEntitlementsApiService } from '../../core/api/property-entitlements-api.service';
import { PropertyManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { PropertyManagementListComponent } from './property-management-list.component';
import { PropertyFormComponent } from './property-form.component';

describe('Property capacity experience', () => {
  let entitlements: any;
  let api: any;
  const usage = { current_plan: { display_name: 'Configured Agency' }, active_listing_count: 4,
    listing_limit: 5, base_listing_allowance: 5, remaining_publication_capacity: 1,
    can_publish_property: true, usage_percent: 80, activated_addons: [] };
  beforeEach(() => {
    entitlements = { summary: vi.fn(() => of(usage)) };
    api = { mine: vi.fn(() => of({ results: [] })), submit: vi.fn(() => of({ id: 'property', images: [], status: 'SUBMITTED' })) };
    TestBed.configureTestingModule({ imports: [PropertyManagementListComponent, PropertyFormComponent], providers: [
      provideRouter([]),
      { provide: PropertyEntitlementsApiService, useValue: entitlements },
      { provide: PropertyManagementApiService, useValue: api },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ agency: 'agency-id' }), paramMap: convertToParamMap({}) } } },
      { provide: ReferenceApiService, useValue: { data: signal({ regions: [], property_types: [], currencies: [], property_amenities: [] }) } },
    ] });
  });
  it('uses backend usage, progress and agency scope', () => {
    const fixture = TestBed.createComponent(PropertyManagementListComponent); fixture.detectChanges();
    expect(entitlements.summary).toHaveBeenCalledWith('agency-id');
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Configured Agency');
    expect(element.textContent).toContain('Active Listings: 4 of 5');
    expect(element.querySelector('progress')?.value).toBe(80);
    expect(element.textContent).toContain('1 listing slots remaining');
  });
  it('blocks submission when full, while allowing a listing-bound extra allowance', () => {
    const component = TestBed.createComponent(PropertyManagementListComponent).componentInstance;
    entitlements.summary.mockReturnValue(of({ ...usage, remaining_publication_capacity: 0, can_publish_property: false }));
    component.submit({ id: 'property' } as any);
    expect(api.submit).not.toHaveBeenCalled();
    expect(entitlements.summary).toHaveBeenCalledWith('agency-id', 'property');
    entitlements.summary.mockReturnValue(of({ ...usage, remaining_publication_capacity: 0, can_publish_property: true }));
    component.submit({ id: 'property' } as any);
    expect(api.submit).toHaveBeenCalledWith('property');
  });
  it('preserves form data and the saved draft when full', async () => {
    const component = TestBed.createComponent(PropertyFormComponent).componentInstance;
    component.form.patchValue({ title: 'My saved home' }, { emitEvent: false });
    component.listing.set({ id: 'property', status: 'DRAFT', images: [] } as any);
    const original = component.form.getRawValue();
    vi.spyOn(component as any, 'validateAll').mockReturnValue(true);
    const save = vi.spyOn(component as any, 'persistDraft').mockResolvedValue(true);
    vi.spyOn(component as any, 'uploadQueuedImages').mockResolvedValue(true);
    vi.spyOn(component as any, 'saveAvailability').mockResolvedValue(true);
    entitlements.summary.mockReturnValue(of({ ...usage, remaining_publication_capacity: 0, can_publish_property: false }));
    await component.submit();
    expect(save).toHaveBeenCalled();
    expect(component.form.getRawValue()).toEqual(original);
    expect(component.capacityFull()).toBe(true);
    expect(component.error()).toContain('Your draft is saved');
    expect(api.submit).not.toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
  });
  it('does not submit if capacity cannot be checked', () => {
    const component = TestBed.createComponent(PropertyManagementListComponent).componentInstance;
    entitlements.summary.mockReturnValue(throwError(() => new Error('Offline')));
    component.submit({ id: 'property' } as any);
    expect(api.submit).not.toHaveBeenCalled();
  });
});

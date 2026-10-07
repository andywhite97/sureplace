import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { PropertyManagementApiService } from '../../core/api/manage-api.services';
import { PropertyManagementListComponent } from './property-management-list.component';

describe('Property availability controls', () => {
  const property: any = { id: 'home', title: 'Home', public_id: 'SP-1', status: 'PUBLISHED',
    availability_status: 'AVAILABLE', town: 'Mbabane', images: [], price: '1000', currency: 'SZL', listing_type: 'RENT' };
  let api: any;
  beforeEach(() => {
    api = { mine: vi.fn(() => of({ results: [property] })),
      confirmAvailability: vi.fn(() => of({ ...property, availability_status: 'AVAILABLE' })),
      markUnavailable: vi.fn(() => of({ ...property, availability_status: 'UNAVAILABLE' })) };
    TestBed.configureTestingModule({ imports: [PropertyManagementListComponent], providers: [
      provideRouter([]), { provide: PropertyManagementApiService, useValue: api },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
    ] });
  });
  it('exposes availability actions without opening the more-actions menu and updates the status', () => {
    const fixture = TestBed.createComponent(PropertyManagementListComponent);
    fixture.detectChanges();
    const actions = [...fixture.nativeElement.querySelectorAll('.actions > button')] as HTMLButtonElement[];
    expect(actions[0].textContent).toContain('Still available');
    expect(actions[1].textContent).toContain('Mark unavailable');
    actions[1].click();
    fixture.detectChanges();
    expect(api.markUnavailable).toHaveBeenCalledWith('home');
    expect(fixture.componentInstance.rows()[0].availability_status).toBe('UNAVAILABLE');
    const available = fixture.nativeElement.querySelector('.actions > button') as HTMLButtonElement;
    expect(available.textContent).toContain('Mark available');
    available.click();
    expect(api.confirmAvailability).toHaveBeenCalledWith('home');
    expect(fixture.componentInstance.rows()[0].availability_status).toBe('AVAILABLE');
  });
  it('prevents repeated confirmation requests while a request is pending', () => {
    const fixture = TestBed.createComponent(PropertyManagementListComponent);
    const pending = new Subject<any>();
    api.confirmAvailability.mockReturnValue(pending);
    fixture.componentInstance.confirm(property);
    fixture.componentInstance.confirm(property);
    expect(api.confirmAvailability).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.availabilityBusy()).toContain('home');
    pending.next(property);
    pending.complete();
    expect(fixture.componentInstance.availabilityBusy()).toEqual([]);
  });
});

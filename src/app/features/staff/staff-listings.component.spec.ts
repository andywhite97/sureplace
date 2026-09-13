import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { StaffApiService } from '../../core/api/staff-api.service';
import { StaffListingsComponent } from './staff-listings.component';

describe('Staff listing search navigation', () => {
  it('applies top-bar search and updates it when the same queue route is reused', () => {
    const params = new BehaviorSubject(convertToParamMap({ search: 'SP-123', status: '' }));
    const properties = vi.fn(() => of({ results: [] }));
    TestBed.configureTestingModule({
      imports: [StaffListingsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
        { provide: StaffApiService, useValue: { properties } },
      ],
    });
    const f = TestBed.createComponent(StaffListingsComponent);
    f.detectChanges();
    expect(properties).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'SP-123', status: '' }),
    );
    params.next(convertToParamMap({ search: 'Mbabane', status: 'CHANGES_REQUESTED' }));
    f.detectChanges();
    expect(properties).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Mbabane', status: 'CHANGES_REQUESTED' }),
    );
    expect(f.componentInstance.search()).toBe('Mbabane');
  });
});

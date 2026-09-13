import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { StayManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { StayFormComponent } from './stay-form.component';

const room = {
  id: 'room',
  name: 'Suite',
  is_active: true,
  total_capacity: 2,
  quantity: 3,
  base_price: '1500',
  currency: 'SZL',
  images: [{ id: 'image', image: '/room.jpg', is_cover: true, sort_order: 0 }],
};
const draft: any = {
  id: 'stay',
  name: 'Lodge',
  description: 'A lodge',
  stay_type: 'LODGE',
  region: 'Hhohho',
  town: 'Mbabane',
  latitude: -26,
  longitude: 31,
  phone: '',
  email: 'host@example.com',
  amenities: [],
  images: [{ id: 'stay-photo', image: '/stay.jpg', sort_order: 0 }],
  room_types: [room],
  status: 'DRAFT',
};

describe('Stay final submission', () => {
  let api: any;
  let navigate: any;
  beforeEach(() => {
    api = {
      detail: vi.fn(() => of(draft)),
      update: vi.fn(() => of({ id: 'stay', status: 'DRAFT' })),
      submit: vi.fn(() => of({ ...draft, status: 'UNDER_REVIEW' })),
    };
    TestBed.configureTestingModule({
      imports: [StayFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'stay' }) } },
        },
        { provide: StayManagementApiService, useValue: api },
        {
          provide: ReferenceApiService,
          useValue: { data: signal({ regions: [], stay_types: [], stay_amenities: [] }) },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  function create() {
    const f = TestBed.createComponent(StayFormComponent);
    f.componentInstance.step.set(8);
    f.componentInstance.form.controls.confirmed.setValue(true, { emitEvent: false });
    return f;
  }
  it('hydrates rooms after a write response and submits even when local rooms were stale', () => {
    const f = create();
    const c = f.componentInstance;
    c.stay.set({ ...draft, room_types: [] });
    c.submit();
    expect(api.detail).toHaveBeenCalledTimes(2);
    expect(api.submit).toHaveBeenCalledWith('stay');
    expect(c.step()).toBe(8);
    expect(c.roomTypes()).toEqual([room]);
    expect(navigate).toHaveBeenCalledWith(['/account/manage/stays', 'stay', 'submitted']);
  });
  it('holds the pending state across save, refresh and submit and rejects duplicate clicks', () => {
    const response = new Subject<any>();
    api.update.mockReturnValue(response);
    const c = create().componentInstance;
    c.submit();
    c.submit();
    expect(c.submitting()).toBe(true);
    expect(api.update).toHaveBeenCalledTimes(1);
    response.next({ id: 'stay' });
    response.complete();
    expect(c.submitting()).toBe(false);
    expect(api.submit).toHaveBeenCalledTimes(1);
  });
  it('routes only a structured room blocker to Rooms', () => {
    api.submit.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { code: 'room_type_required', errors: { room_types: ['Add an active room.'] } },
          }),
      ),
    );
    const c = create().componentInstance;
    c.submit();
    expect(c.step()).toBe(6);
    expect(c.error()).toContain('Add an active room.');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('keeps generic failures on Submit and allows retry', () => {
    api.submit.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    const c = create().componentInstance;
    c.submit();
    expect(c.step()).toBe(8);
    expect(c.error()).toContain('Please try again');
    expect(c.submitting()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    c.submit();
    expect(navigate).toHaveBeenCalled();
  });
  it('keeps detail refresh failures on Submit without sending submission', () => {
    const c = create().componentInstance;
    api.detail.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    c.submit();
    expect(c.step()).toBe(8);
    expect(api.submit).not.toHaveBeenCalled();
  });
  it('prevents saves or step navigation after successful submission', () => {
    const c = create().componentInstance;
    c.submit();
    c.go(6);
    c.continue();
    expect(c.step()).toBe(8);
    expect(api.update).toHaveBeenCalledTimes(1);
  });
  it('routes pending stays away before calculating an incomplete draft step', () => {
    api.detail.mockReturnValue(of({ ...draft, status: 'UNDER_REVIEW', room_types: [] }));
    TestBed.createComponent(StayFormComponent);
    expect(navigate).toHaveBeenCalledWith(['/account/manage/stays', 'stay', 'submitted']);
  });
  it('shows persisted room covers on Review', () => {
    const f = create();
    f.componentInstance.step.set(7);
    f.detectChanges();
    expect(f.componentInstance.roomCover(room as any)).toBe('/room.jpg');
    expect(f.nativeElement.textContent).toContain('Rooms (1)');
    expect(f.nativeElement.querySelector('.review-room-row sp-image')).toBeTruthy();
  });
  it('waits for an in-flight draft save and its detail refresh before allowing submission', () => {
    const saved = new Subject<any>();
    api.update.mockReturnValueOnce(saved);
    const c = create().componentInstance;
    c.step.set(6);
    c.continue();
    expect(c.busy()).toBe(true);
    c.submit();
    expect(api.submit).not.toHaveBeenCalled();
    saved.next({ id: 'stay' });
    saved.complete();
    expect(c.roomTypes()).toEqual([room]);
    expect(c.busy()).toBe(false);
    c.step.set(8);
    c.submit();
    expect(navigate).toHaveBeenCalledWith(['/account/manage/stays', 'stay', 'submitted']);
  });
  it('keeps the Rooms step open while room images are uploading', () => {
    const c = create().componentInstance;
    c.step.set(6);
    c.roomBusy.set(true);
    c.continue();
    c.go(7);
    c.back();
    expect(c.step()).toBe(6);
    expect(api.update).not.toHaveBeenCalled();
  });
});

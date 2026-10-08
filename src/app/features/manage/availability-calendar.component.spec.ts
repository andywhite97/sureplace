import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import {
  ManagerBookingsApiService,
  RoomManagementApiService,
  StayManagementApiService,
} from '../../core/api/manage-api.services';
import { Booking } from '../../core/models/account.models';
import { AvailabilityCalendarComponent } from './availability-calendar.component';

describe('AvailabilityCalendarComponent', () => {
  const roomApi = { calendar: vi.fn(), bulkAvailability: vi.fn() };
  beforeEach(() => {
    roomApi.calendar.mockReset().mockReturnValue(of([]));
    roomApi.bulkAvailability.mockReset().mockReturnValue(of({ updated: 1 }));
    TestBed.configureTestingModule({
      imports: [AvailabilityCalendarComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'stay' }) } },
        },
        { provide: StayManagementApiService, useValue: { rooms: () => of([{ id: 'room' }]) } },
        { provide: RoomManagementApiService, useValue: roomApi },
        { provide: ManagerBookingsApiService, useValue: { list: () => of({ results: [] }) } },
      ],
    });
  });
  it('includes active holds and confirmed nights while excluding checkout and expired holds', () => {
    const c = TestBed.createComponent(AvailabilityCalendarComponent).componentInstance;
    const base = { room_type: 'room', check_in: '2999-01-01', check_out: '2999-01-03' };
    c.bookings.set([
      { ...base, id: 'confirmed', status: 'CONFIRMED' },
      { ...base, id: 'hold', status: 'PENDING', expires_at: '2999-01-01T00:00:00Z' },
      { ...base, id: 'expired', status: 'PENDING', expires_at: '2000-01-01T00:00:00Z' },
    ] as Booking[]);
    expect(c.at('room', '2999-01-02').map((b) => b.id)).toEqual(['confirmed', 'hold']);
    expect(c.at('room', '2999-01-03')).toEqual([]);
    expect(c.at('other-room', '2999-01-02')).toEqual([]);
  });
  it('requires one room for bulk edits and limits the calendar range', () => {
    const c = TestBed.createComponent(AvailabilityCalendarComponent).componentInstance;
    c.saveBulk();
    expect(roomApi.bulkAvailability).not.toHaveBeenCalled();
    c.range.patchValue({ start: '2999-01-01', end: '2999-03-01' });
    c.loadCalendar();
    expect(c.error()).toContain('32 days');
    c.range.patchValue({ room: 'room', end: '2999-01-02' });
    c.saveBulk();
    expect(roomApi.bulkAvailability).toHaveBeenCalledTimes(1);
  });
});

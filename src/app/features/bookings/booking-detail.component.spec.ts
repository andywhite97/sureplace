import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BookingsApiService } from '../../core/api/account-api.services';
import { ManagerBookingsApiService } from '../../core/api/manage-api.services';
import { Booking } from '../../core/models/account.models';
import { BookingDetailComponent } from './booking-detail.component';

describe('BookingDetailComponent', () => {
  const guest = { detail: vi.fn(), cancel: vi.fn() };
  const manager = { detail: vi.fn(), action: vi.fn() };
  const route = {
    snapshot: { data: { manager: true }, paramMap: convertToParamMap({ id: 'booking' }) },
  };
  beforeEach(() => {
    guest.detail.mockReset().mockReturnValue(of({ id: 'booking', status: 'PENDING' }));
    guest.cancel.mockReset().mockReturnValue(of({ id: 'booking', status: 'CANCELLED' }));
    manager.detail.mockReset().mockReturnValue(of({ id: 'booking', status: 'PENDING' }));
    manager.action.mockReset().mockReturnValue(of({ id: 'booking', status: 'DECLINED' }));
    route.snapshot.data.manager = true;
    TestBed.configureTestingModule({
      imports: [BookingDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: BookingsApiService, useValue: guest },
        { provide: ManagerBookingsApiService, useValue: manager },
      ],
    });
  });
  it('requires a decline or operator cancellation reason and sends the audit note', () => {
    const c = TestBed.createComponent(BookingDetailComponent).componentInstance;
    c.action.set('decline');
    c.perform();
    expect(manager.action).not.toHaveBeenCalled();
    c.form.setValue({ reason: 'NO_AVAILABILITY', note: 'Maintenance closure' });
    c.perform();
    expect(manager.action).toHaveBeenCalledWith('booking', 'decline', {
      reason: 'NO_AVAILABILITY',
      note: 'Maintenance closure',
    });
    expect(c.booking()?.status).toBe('DECLINED');
    c.action.set('cancel');
    c.form.reset();
    c.perform();
    expect(manager.action).toHaveBeenCalledTimes(1);
  });
  it('loads the guest-scoped detail and permits cancellation without a reason', () => {
    route.snapshot.data.manager = false;
    const c = TestBed.createComponent(BookingDetailComponent).componentInstance;
    c.perform();
    expect(guest.detail).toHaveBeenCalledWith('booking');
    expect(guest.cancel).toHaveBeenCalledWith('booking', '');
    expect(manager.action).not.toHaveBeenCalled();
  });
  it('hides elapsed holds, past guest cancellations and future completion', () => {
    const c = TestBed.createComponent(BookingDetailComponent).componentInstance;
    expect(c.active({ status: 'PENDING', expires_at: '2000-01-01T00:00:00Z' } as Booking)).toBe(
      false,
    );
    expect(c.canComplete({ status: 'CONFIRMED', check_out: '2999-01-01' } as Booking)).toBe(false);
    c.manager = false;
    expect(c.canCancel({ status: 'CONFIRMED', check_out: '2000-01-01' } as Booking)).toBe(false);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagerBookingsApiService } from '../../core/api/manage-api.services';
import { Booking } from '../../core/models/account.models';
import { ToastService } from '../../core/services/toast.service';
import { ManagerBookingsComponent } from './manager-bookings.component';

describe('ManagerBookingsComponent', () => {
  const api = { list: vi.fn(), action: vi.fn() };
  beforeEach(() => {
    api.list.mockReset().mockReturnValue(of({ results: [] }));
    TestBed.configureTestingModule({
      imports: [ManagerBookingsComponent],
      providers: [
        provideRouter([]),
        { provide: ManagerBookingsApiService, useValue: api },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    });
  });

  it('only offers completion after check-out and blocks expired confirmations', () => {
    const c = TestBed.createComponent(ManagerBookingsComponent).componentInstance;
    expect(c.actions({ status: 'CONFIRMED', check_out: '2999-01-01' } as Booking)).toEqual([
      'cancel',
    ]);
    expect(c.actions({ status: 'CONFIRMED', check_out: '2000-01-01' } as Booking)).toEqual([
      'cancel',
      'complete',
    ]);
    expect(c.actions({ status: 'PENDING', expires_at: '2000-01-01T00:00:00Z' } as Booking)).toEqual(
      ['cancel'],
    );
    expect(c.actions({ status: 'PENDING', expires_at: '2999-01-01T00:00:00Z' } as Booking)).toEqual(
      ['confirm', 'decline', 'cancel'],
    );
  });

  it('clears a failed-load error when retrying successfully', () => {
    api.list.mockReturnValueOnce(throwError(() => new Error('offline')));
    const c = TestBed.createComponent(ManagerBookingsComponent).componentInstance;
    expect(c.error()).toBeTruthy();
    c.load();
    expect(c.error()).toBe('');
    expect(c.loading()).toBe(false);
  });

  it('derives arrivals, departures and pending counts from real rows and combines list filters', () => {
    const c = TestBed.createComponent(ManagerBookingsComponent).componentInstance;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Mbabane',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const today = ['year', 'month', 'day']
      .map((k) => parts.find((p) => p.type === k)?.value)
      .join('-');
    const base = {
      stay: 'stay',
      stay_name: 'Andy House',
      room_type: 'room',
      room_name: 'King',
      guest_name: 'Andile',
      guest_email: 'guest@example.com',
      check_in: today,
      check_out: '2999-01-02',
    };
    c.rows.set([
      { ...base, id: 'arrival', reference: 'REF-A', status: 'CONFIRMED' },
      {
        ...base,
        id: 'departure',
        reference: 'REF-D',
        status: 'CONFIRMED',
        check_in: '2000-01-01',
        check_out: today,
      },
      {
        ...base,
        id: 'hold',
        reference: 'REF-H',
        status: 'PENDING',
        expires_at: '2999-01-01T00:00:00Z',
      },
      {
        ...base,
        id: 'expired',
        reference: 'REF-E',
        status: 'PENDING',
        expires_at: '2000-01-01T00:00:00Z',
      },
    ] as Booking[]);
    expect(c.metrics()).toEqual({ pending: 1, arrivals: 1, departures: 1, upcoming: 1 });
    c.search.set('ref-a');
    c.filter.set('CONFIRMED');
    c.stayFilter.set('stay');
    c.roomFilter.set('room');
    expect(c.filtered().map((b) => b.id)).toEqual(['arrival']);
    c.start.set('2999-01-03');
    expect(c.filtered()).toEqual([]);
  });
});

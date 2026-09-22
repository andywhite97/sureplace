import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BookingsApiService } from '../../core/api/account-api.services';
import { Booking } from '../../core/models/account.models';
import { ToastService } from '../../core/services/toast.service';
import { BookingsComponent } from './bookings.component';

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  reference: 'SP-BKG-001',
  stay: 's1',
  stay_name: 'Matsapha Serviced Studios',
  stay_slug: 'matsapha-serviced-studios',
  stay_town: 'Matsapha',
  stay_suburb: '',
  stay_image: null,
  room_type: 'r1',
  room_name: 'Deluxe Room',
  conversation: 'c1',
  check_in: '2026-09-22',
  check_out: '2026-09-26',
  adults: 1,
  children: 0,
  rooms: 1,
  nightly_pricing: [],
  nightly_subtotal: '4000.00',
  taxes: '400.00',
  fees: '165.00',
  total: '4565.00',
  currency: 'SZL',
  status: 'PENDING',
  payment_status: 'UNPAID',
  guest_name: 'Andile',
  guest_email: 'andile@example.com',
  guest_phone: '',
  special_requests: '',
  expires_at: null,
  created_at: '2026-09-20T12:00:00Z',
  updated_at: '2026-09-20T12:00:00Z',
  ...overrides,
});

describe('BookingsComponent', () => {
  const rows = [
    booking(),
    booking({ id: 'b2', reference: 'SP-BKG-002', status: 'CONFIRMED', stay_name: 'Royal Villas Mbabane' }),
    booking({ id: 'b3', reference: 'SP-BKG-003', status: 'COMPLETED', stay_name: 'A very long completed stay name that remains readable on desktop' }),
    booking({ id: 'b4', reference: 'SP-BKG-004', status: 'CANCELLED', stay_name: 'Cancelled Stay' }),
  ];
  const api = { list: vi.fn(), cancel: vi.fn() };
  const toast = { show: vi.fn() };

  beforeEach(() => {
    api.list.mockReset().mockReturnValue(of({ count: rows.length, next: null, previous: null, results: rows }));
    api.cancel.mockReset();
    toast.show.mockReset();
    TestBed.configureTestingModule({
      imports: [BookingsComponent],
      providers: [
        provideRouter([]),
        { provide: BookingsApiService, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(BookingsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('derives summary and tab counts from the loaded booking response', () => {
    const fixture = create();
    const summary = [...fixture.nativeElement.querySelectorAll('.desktop-summary-strip strong')].map(
      (node: HTMLElement) => node.textContent?.trim(),
    );
    expect(summary).toEqual(['2', '1', '1', '4']);
    expect(fixture.nativeElement.querySelector('.booking-tabs').textContent).toContain('Cancelled (1)');
  });

  it('renders pending and confirmed bookings, including the branded missing-image fallback', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Matsapha Serviced Studios');
    expect(fixture.nativeElement.textContent).toContain('Royal Villas Mbabane');
    expect(fixture.nativeElement.querySelector('.booking-image sp-image')).toBeTruthy();
  });

  it('keeps past and cancelled bookings in their existing lifecycle groups', () => {
    const fixture = create();
    fixture.componentInstance.filter.set('past');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A very long completed stay name');
    fixture.componentInstance.filter.set('cancelled');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cancelled Stay');
    expect(fixture.nativeElement.querySelector('.cancel-action')).toBeNull();
  });

  it('preserves cancellation and reports success', () => {
    const updated = booking({ status: 'CANCELLED' });
    api.cancel.mockReturnValue(of(updated));
    const fixture = create();
    fixture.componentInstance.cancel(rows[0]);
    expect(api.cancel).toHaveBeenCalledWith('b1');
    expect(toast.show).toHaveBeenCalledWith('Booking cancelled.', 'success');
  });
});

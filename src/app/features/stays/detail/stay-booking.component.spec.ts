import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { StayBookingComponent } from './stay-booking.component';
import { StaysApiService } from '../../../core/api/stays-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { RoomTypeSummary, StayDetail } from '../../../core/models/listing.models';
describe('StayBookingComponent', () => {
  const stay = { id: 's1', slug: 'royal-villas', name: 'Royal Villas' } as StayDetail;
  const room = { id: 'r1', name: 'Garden Room', currency: 'SZL' } as RoomTypeSummary;
  const availability = {
    available: true,
    room_type_id: 'r1',
    rooms_available: 2,
    nightly_prices: [{ date: '2026-10-12', price: '850.00' }],
    total: '850.00',
  };
  const criteria = {
    check_in: '2026-10-12',
    check_out: '2026-10-13',
    adults: 2,
    children: 0,
    rooms: 1,
  };
  const user = signal<any>({
    first_name: 'Sihle',
    last_name: 'Dlamini',
    email: 'sihle@example.com',
    phone_number: '+26876000000',
  });
  const auth = { user, isAuthenticated: signal(true) };
  const api = { createBooking: vi.fn() };
  beforeEach(() => {
    api.createBooking.mockReset();
    auth.isAuthenticated.set(true);
    TestBed.configureTestingModule({
      imports: [StayBookingComponent],
      providers: [
        provideRouter([]),
        { provide: StaysApiService, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    });
  });
  function fixture() {
    const f = TestBed.createComponent(StayBookingComponent);
    f.componentRef.setInput('stay', stay);
    f.componentRef.setInput('room', room);
    f.componentRef.setInput('availability', availability);
    f.componentRef.setInput('criteria', criteria);
    f.detectChanges();
    return f;
  }
  it('prefills authenticated guest details', () => {
    expect(fixture().componentInstance.form.value).toMatchObject({
      guest_name: 'Sihle Dlamini',
      guest_email: 'sihle@example.com',
      guest_phone: '+26876000000',
    });
  });
  it('prevents double submission and sends one intentional request', () => {
    const pending = new Subject<any>();
    api.createBooking.mockReturnValue(pending);
    const c = fixture().componentInstance;
    c.submit();
    c.submit();
    expect(api.createBooking).toHaveBeenCalledTimes(1);
  });
  it('reuses the idempotency key when retrying the same failed submission', () => {
    api.createBooking
      .mockReturnValueOnce(throwError(() => ({ error: { message: 'Temporary error' } })))
      .mockReturnValueOnce(of(null));
    const c = fixture().componentInstance;
    c.submit();
    c.submit();
    expect(api.createBooking.mock.calls[0][2]).toBe(api.createBooking.mock.calls[1][2]);
  });
  it('uses pending success wording', () => {
    api.createBooking.mockReturnValue(
      of({
        reference: 'SP-BKG-1',
        stay_name: 'Royal Villas',
        room_name: 'Garden Room',
        check_in: '2026-10-12',
        check_out: '2026-10-13',
        total: '850.00',
        currency: 'SZL',
        status: 'PENDING',
        conversation: 'c1',
      }),
    );
    const f = fixture();
    f.componentInstance.submit();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Booking request sent');
    expect(f.nativeElement.textContent).not.toContain('Booking confirmed');
  });
  it('redirects anonymous guests with booking criteria preserved', () => {
    auth.isAuthenticated.set(false);
    const f = fixture(),
      nav = vi.spyOn(TestBed.inject(Router), 'navigate');
    f.componentInstance.requestBooking();
    expect(nav).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: expect.stringContaining('check_in=2026-10-12') },
    });
  });
});

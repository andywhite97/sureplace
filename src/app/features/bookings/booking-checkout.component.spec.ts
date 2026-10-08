import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { BookingCheckoutComponent } from './booking-checkout.component';
import { BookingCheckoutStateService } from '../../core/services/booking-checkout-state.service';
import { StaysApiService } from '../../core/api/stays-api.service';
import { BookingsApiService } from '../../core/api/account-api.services';
import { AuthService } from '../../core/auth/auth.service';
import { StayDetail } from '../../core/models/listing.models';

describe('BookingCheckoutComponent', () => {
  const user = {
    first_name: 'Andile',
    last_name: 'Hlophe',
    email: 'andile@example.com',
    phone_number: '+26876000000',
  };
  const auth = {
    user: signal<typeof user | null>(user),
    isAuthenticated: signal(true),
    initialize: vi.fn(() => of(user)),
  };
  const quote = {
    available: true,
    room_type_id: 'r1',
    rooms_available: 2,
    nightly_prices: [
      { date: '2999-10-12', price: '900.00' },
      { date: '2999-10-13', price: '1100.00' },
    ],
    total: '2000.00',
  };
  const stay = {
    id: 's1',
    slug: 'andy-guest-house',
    name: 'Andy Guest House',
    booking_mode: 'REQUEST_TO_BOOK',
    town: 'Mbabane',
    images: [],
    room_types: [{ id: 'r1', name: 'Deluxe', base_price: '900', currency: 'SZL', minimum_stay: 1 }],
    cancellation_policy: 'Contact the property to cancel.',
  } as unknown as StayDetail;
  const api = { detail: vi.fn(), availability: vi.fn(), createBooking: vi.fn() };
  beforeEach(() => {
    sessionStorage.clear();
    auth.user.set(user);
    auth.isAuthenticated.set(true);
    auth.initialize.mockReturnValue(of(user));
    api.detail.mockReset().mockReturnValue(of(stay));
    api.availability.mockReset().mockReturnValue(of({ room_types: [quote] }));
    api.createBooking.mockReset();
    TestBed.configureTestingModule({
      imports: [BookingCheckoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ slug: stay.slug }),
              queryParamMap: convertToParamMap({
                room: 'r1',
                check_in: '2999-10-12',
                check_out: '2999-10-14',
                adults: '2',
                children: '0',
                rooms: '1',
              }),
            },
          },
        },
        { provide: AuthService, useValue: auth },
        { provide: StaysApiService, useValue: api },
        {
          provide: BookingsApiService,
          useValue: { detail: vi.fn(), byIntent: vi.fn(() => of({ results: [] })) },
        },
      ],
    });
  });
  async function fixture() {
    const f = TestBed.createComponent(BookingCheckoutComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return f;
  }
  it('prefills guest details, keeps account email readonly, and gates submission on consent', async () => {
    const f = await fixture(),
      c = f.componentInstance;
    expect(c.form.controls.first_name.value).toBe('Andile');
    expect(f.nativeElement.querySelector('input[type=email]').readOnly).toBe(true);
    c.review();
    c.submit();
    expect(api.createBooking).not.toHaveBeenCalled();
  });
  it('prevents duplicate submissions and preserves idempotency on network retry', async () => {
    const f = await fixture(),
      c = f.componentInstance,
      pending = new Subject<never>();
    c.review();
    c.form.controls.accepted.setValue(true);
    api.createBooking.mockReturnValueOnce(pending);
    c.submit();
    c.submit();
    expect(api.createBooking).toHaveBeenCalledTimes(1);
    pending.error(new Error('network'));
    const key = api.createBooking.mock.calls[0][2];
    api.createBooking.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Temporary failure' } })),
    );
    c.submit();
    expect(api.createBooking.mock.calls[1][2]).toBe(key);
  });
  it('invalidates pricing and consent when guest counts change', async () => {
    const c = (await fixture()).componentInstance;
    c.form.controls.accepted.setValue(true);
    c.form.controls.adults.setValue(3);
    c.countsChanged();
    expect(c.quote()).toBeNull();
    expect(c.form.controls.accepted.value).toBe(false);
    c.refresh();
    expect(api.availability.mock.calls.at(-1)?.[1].adults).toBe(3);
  });
  it('requires acknowledgement of a changed server price before retrying', async () => {
    const c = (await fixture()).componentInstance;
    c.review();
    c.form.controls.accepted.setValue(true);
    api.createBooking.mockReturnValue(
      throwError(() => ({
        error: {
          code: 'price_changed',
          new_total: '2200.00',
          nightly_prices: quote.nightly_prices,
        },
      })),
    );
    c.submit();
    expect(c.changedPrice()?.old).toBe('2000.00');
    expect(c.form.controls.accepted.value).toBe(false);
    c.submit();
    expect(api.createBooking).toHaveBeenCalledTimes(1);
    c.acceptPrice();
    expect(c.quote()?.total).toBe('2200.00');
  });
  it('shows pending success copy and preserves the booking identifier on refresh', async () => {
    const f = await fixture(),
      c = f.componentInstance;
    c.review();
    c.form.controls.accepted.setValue(true);
    api.createBooking.mockReturnValue(
      of({
        id: 'b1',
        reference: 'SP-BKG-1',
        status: 'PENDING',
        stay_name: 'Andy Guest House',
        check_in: '2999-10-12',
        check_out: '2999-10-14',
        room_name: 'Deluxe',
        rooms: 1,
        adults: 2,
        children: 0,
        total: '2000.00',
        currency: 'SZL',
        conversation: 'c1',
        expires_at: '2999-10-12T18:30:00Z',
      }),
    );
    c.submit();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Booking request sent');
    expect(f.nativeElement.textContent).not.toContain('Booking confirmed!');
    expect(TestBed.inject(BookingCheckoutStateService).state()?.booking_id).toBe('b1');
  });
  it('shows an authentication gate with a direct checkout return URL', async () => {
    auth.isAuthenticated.set(false);
    auth.user.set(null);
    const f = await fixture();
    expect(f.nativeElement.textContent).toContain('Almost there');
    const href = f.nativeElement.querySelector('a[href^="/login"]').getAttribute('href');
    expect(href).toContain('returnUrl=');
    expect(decodeURIComponent(href)).toContain('/stays/andy-guest-house/book');
  });
});

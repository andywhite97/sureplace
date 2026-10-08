import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BookingCheckoutStateService } from './booking-checkout-state.service';

describe('BookingCheckoutStateService', () => {
  const selection = {
    stay_id: 'stay',
    stay_slug: 'andy-house',
    room_type: 'room',
    check_in: '2999-01-01',
    check_out: '2999-01-03',
    adults: 2,
    children: 0,
    rooms: 1,
  };
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
  });
  it('recovers the same submission token and receipt after refresh without storing guest data', () => {
    const first = TestBed.inject(BookingCheckoutStateService);
    const intent = first.select({
      ...selection,
      guest_email: 'private@example.com',
      special_requests: 'private',
    } as typeof selection);
    first.completed('booking');
    const saved = sessionStorage.getItem('sureplace.booking-intent.v1')!;
    expect(saved).not.toContain('private');
    first.state.set(null);
    first.restore();
    expect(first.state()).toEqual({
      ...selection,
      idempotency_key: intent.idempotency_key,
      booking_id: 'booking',
    });
    expect(first.select(selection).idempotency_key).toBe(intent.idempotency_key);
    expect(first.select(selection, true).idempotency_key).not.toBe(intent.idempotency_key);
  });
  it('drops unknown stored fields and clears the intent on logout', () => {
    const service = TestBed.inject(BookingCheckoutStateService);
    sessionStorage.setItem(
      'sureplace.booking-intent.v1',
      JSON.stringify({ ...selection, idempotency_key: 'key', guest_phone: 'private' }),
    );
    service.restore();
    expect(service.state()).not.toHaveProperty('guest_phone');
    service.clear();
    expect(service.state()).toBeNull();
    expect(sessionStorage.getItem('sureplace.booking-intent.v1')).toBeNull();
  });
  it('works without browser storage during server rendering', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const service = TestBed.inject(BookingCheckoutStateService);
    service.restore();
    service.select(selection);
    expect(service.url()).toContain('/stays/andy-house/book?');
    expect(sessionStorage.length).toBe(0);
  });
});

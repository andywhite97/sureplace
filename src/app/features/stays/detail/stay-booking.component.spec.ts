import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { StayBookingComponent } from './stay-booking.component';
import { RoomTypeSummary, StayDetail } from '../../../core/models/listing.models';
import { BookingCheckoutStateService } from '../../../core/services/booking-checkout-state.service';
describe('StayBookingComponent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [StayBookingComponent],
      providers: [provideRouter([])],
    });
  });
  function fixture() {
    const f = TestBed.createComponent(StayBookingComponent);
    f.componentRef.setInput('stay', {
      id: 's1',
      slug: 'royal-villas',
      room_types: [{ id: 'r1', base_price: '900', currency: 'SZL' }],
    } as StayDetail);
    f.componentRef.setInput('room', {
      id: 'r1',
      name: 'Deluxe',
      base_price: '900',
      currency: 'SZL',
    } as RoomTypeSummary);
    f.componentRef.setInput('criteria', {
      check_in: '2999-10-12',
      check_out: '2999-10-14',
      adults: 2,
      children: 0,
      rooms: 1,
    });
    f.componentRef.setInput('availability', {
      available: true,
      total: '2000.00',
      room_type_id: 'r1',
      rooms_available: 2,
      nightly_prices: [],
    });
    f.detectChanges();
    return f;
  }
  it('shows base context alongside the server total, including custom prices', () => {
    const f = fixture();
    expect(f.nativeElement.textContent).toContain('E900');
    expect(f.nativeElement.textContent).toContain('E2,000');
  });
  it('saves selection and goes straight to checkout before requiring authentication', () => {
    const f = fixture(),
      router = TestBed.inject(Router),
      nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    f.componentInstance.continueBooking();
    const s = TestBed.inject(BookingCheckoutStateService).state();
    expect(s?.room_type).toBe('r1');
    expect(nav).toHaveBeenCalledWith(expect.stringContaining('/stays/royal-villas/book?'));
    expect(nav).toHaveBeenCalledWith(expect.stringContaining('room=r1'));
  });
  it('does not continue with unavailable inventory', () => {
    const f = fixture(),
      nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    f.componentRef.setInput('availability', { available: false });
    f.componentInstance.continueBooking();
    expect(nav).not.toHaveBeenCalled();
  });
});

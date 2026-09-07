import { convertToParamMap } from '@angular/router';
import { StayQueryService } from './stay-query.service';

describe('StayQueryService', () => {
  const service = new StayQueryService();
  it('restores filters, guests, ordering, page and bounds from the URL', () => {
    const state = service.parse(
      convertToParamMap({
        town: 'Ezulwini',
        stay_type: 'GUEST_HOUSE',
        check_in: '2026-10-12',
        check_out: '2026-10-14',
        adults: '2',
        children: '1',
        rooms: '2',
        min_price: '500',
        max_price: '1500',
        amenities: 'wifi,pool',
        verification_status: 'VERIFIED',
        ordering: 'price_asc',
        page: '3',
        view: 'map',
        north: '-26',
        south: '-27',
        east: '32',
        west: '31',
      }),
    );
    expect(state).toMatchObject({
      town: 'Ezulwini',
      stay_type: 'GUEST_HOUSE',
      adults: 2,
      children: 1,
      rooms: 2,
      ordering: 'price_asc',
      page: 3,
      view: 'map',
      north: '-26',
    });
    expect(state.amenities).toEqual(['wifi', 'pool']);
  });
  it('serializes stable navigation parameters and omits defaults', () => {
    expect(
      service.serialize({
        town: 'Mbabane',
        ordering: 'newest',
        view: 'list',
        page: 1,
        amenities: ['a', 'b'],
      }),
    ).toEqual({ town: 'Mbabane', amenities: 'a,b' });
  });
  it('accepts a future valid date range', () =>
    expect(service.validateDates('2026-10-12', '2026-10-14', '2026-09-07')).toEqual({
      valid: true,
      complete: true,
      message: null,
    }));
  it('rejects same-day and reversed check-out', () => {
    expect(service.validateDates('2026-10-12', '2026-10-12', '2026-09-07').valid).toBe(false);
    expect(service.validateDates('2026-10-12', '2026-10-11', '2026-09-07').valid).toBe(false);
  });
  it('rejects past check-in', () =>
    expect(service.validateDates('2026-09-06', '2026-09-08', '2026-09-07').message).toContain(
      'past',
    ));
  it('keeps one-sided dates pending and omits availability parameters from API calls', () => {
    expect(service.validateDates('2026-10-12', undefined, '2026-09-07').complete).toBe(false);
    expect(
      service.apiParams({
        town: 'Ezulwini',
        check_in: '2026-10-12',
        adults: 2,
        children: 0,
        rooms: 1,
      }),
    ).toEqual({ town: 'Ezulwini' });
  });
  it('enforces guest minimums while parsing', () => {
    const state = service.parse(convertToParamMap({ adults: '0', children: '-2', rooms: '0' }));
    expect([state.adults, state.children, state.rooms]).toEqual([1, 0, 1]);
  });
  it('sends a complete availability query without datetime conversion', () => {
    expect(
      service.apiParams({
        check_in: '2026-10-12',
        check_out: '2026-10-14',
        adults: 2,
        children: 0,
        rooms: 1,
      }),
    ).toMatchObject({
      check_in: '2026-10-12',
      check_out: '2026-10-14',
      adults: '2',
      children: '0',
      rooms: '1',
    });
  });
  it('removes all geographic bounds together', () =>
    expect(
      service.withoutBounds({ town: 'Manzini', north: '1', south: '0', east: '2', west: '1' }),
    ).toEqual({ town: 'Manzini' }));
});

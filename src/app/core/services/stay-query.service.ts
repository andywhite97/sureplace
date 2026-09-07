import { Injectable } from '@angular/core';
import { ParamMap, Params } from '@angular/router';
import {
  StayDateValidation,
  StayOrdering,
  StaySearchParams,
  StayView,
} from '../models/stay-search.models';

const textKeys = [
  'stay_type',
  'region',
  'town',
  'suburb',
  'search',
  'min_price',
  'max_price',
  'verification_status',
  'north',
  'south',
  'east',
  'west',
] as const;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

@Injectable({ providedIn: 'root' })
export class StayQueryService {
  parse(map: ParamMap): StaySearchParams {
    const out: StaySearchParams = {
      ordering: (map.get('ordering') as StayOrdering) || 'newest',
      view: (map.get('view') as StayView) || 'list',
      page: Math.max(1, Number(map.get('page')) || 1),
    };
    for (const key of textKeys) {
      const value = map.get(key);
      if (value) (out as Record<string, unknown>)[key] = value;
    }
    for (const key of ['featured'] as const) if (map.get(key) === 'true') out[key] = true;
    const amenities = map
      .getAll('amenities')
      .flatMap((x) => x.split(','))
      .filter(Boolean);
    if (amenities.length) out.amenities = amenities;
    const checkIn = map.get('check_in'),
      checkOut = map.get('check_out');
    if (checkIn && isoDate.test(checkIn)) out.check_in = checkIn;
    if (checkOut && isoDate.test(checkOut)) out.check_out = checkOut;
    for (const key of ['adults', 'children', 'rooms'] as const) {
      const value = Number(map.get(key));
      if (Number.isInteger(value))
        out[key] = key === 'children' ? Math.max(0, value) : Math.max(1, value);
    }
    return out;
  }
  serialize(value: StaySearchParams): Params {
    const out: Params = {};
    for (const [key, item] of Object.entries(value)) {
      if (
        item === undefined ||
        item === '' ||
        item === false ||
        (key === 'page' && item === 1) ||
        (key === 'ordering' && item === 'newest') ||
        (key === 'view' && item === 'list')
      )
        continue;
      out[key] = Array.isArray(item) ? item.join(',') : item;
    }
    return out;
  }
  apiParams(value: StaySearchParams): Record<string, string | string[]> {
    const api: Record<string, string | string[]> = {};
    const dates = this.validateDates(value.check_in, value.check_out);
    for (const [key, item] of Object.entries(value)) {
      if (key === 'view' || item === undefined || item === '' || item === false) continue;
      if (['check_in', 'check_out', 'adults', 'children', 'rooms'].includes(key) && !dates.complete)
        continue;
      api[key] = Array.isArray(item) ? item.map(String) : String(item);
    }
    return api;
  }
  validateDates(checkIn?: string, checkOut?: string, today = this.today()): StayDateValidation {
    if (!checkIn && !checkOut) return { valid: true, complete: false, message: null };
    if (!checkIn || !checkOut)
      return { valid: false, complete: false, message: 'Choose both check-in and check-out.' };
    if (!isoDate.test(checkIn) || !isoDate.test(checkOut))
      return { valid: false, complete: false, message: 'Choose valid dates.' };
    if (checkIn < today)
      return { valid: false, complete: false, message: 'Check-in cannot be in the past.' };
    if (checkOut <= checkIn)
      return { valid: false, complete: false, message: 'Check-out must be after check-in.' };
    return { valid: true, complete: true, message: null };
  }
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  withoutBounds(value: StaySearchParams): StaySearchParams {
    const { north, south, east, west, ...rest } = value;
    return rest;
  }
}

import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import type { BookingCriteria } from '../../features/stays/detail/stay-booking.component';
import { RoomAvailabilityResult } from '../models/listing.models';

export interface BookingCheckoutState extends BookingCriteria {
  stay_id: string;
  stay_slug: string;
  room_type: string;
  idempotency_key: string;
  booking_id?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingCheckoutStateService {
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private storageKey = 'sureplace.booking-intent.v1';
  readonly state = signal<BookingCheckoutState | null>(null);
  readonly pricing = signal<RoomAvailabilityResult | null>(null);
  restore() {
    if (!this.browser) return;
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem(this.storageKey) || 'null');
      if (raw && typeof raw === 'object') {
        const s = raw as Partial<BookingCheckoutState>;
        if (
          typeof s.stay_id === 'string' &&
          typeof s.stay_slug === 'string' &&
          typeof s.room_type === 'string' &&
          typeof s.idempotency_key === 'string' &&
          typeof s.check_in === 'string' &&
          typeof s.check_out === 'string' &&
          Number.isInteger(s.adults) &&
          Number.isInteger(s.children) &&
          Number.isInteger(s.rooms)
        )
          this.state.set({
            ...this.selection(s as BookingCheckoutState),
            idempotency_key: s.idempotency_key,
            ...(typeof s.booking_id === 'string' ? { booking_id: s.booking_id } : {}),
          });
      }
    } catch {
      /* Storage can be disabled; the checkout URL still carries selection. */
    }
  }
  select(
    selection: Omit<BookingCheckoutState, 'idempotency_key' | 'booking_id'>,
    newAttempt = false,
  ) {
    selection = this.selection(selection);
    const current = this.state();
    const same =
      current &&
      !newAttempt &&
      Object.entries(selection).every(([k, v]) => current[k as keyof BookingCheckoutState] === v);
    const state = same
      ? current
      : {
          ...selection,
          idempotency_key:
            globalThis.crypto?.randomUUID?.() || `booking-${Date.now()}-${Math.random()}`,
        };
    if (!same) this.pricing.set(null);
    this.save(state);
    return state;
  }
  completed(id: string) {
    const s = this.state();
    if (s) this.save({ ...s, booking_id: id });
  }
  clear() {
    this.state.set(null);
    this.pricing.set(null);
    if (this.browser)
      try {
        sessionStorage.removeItem(this.storageKey);
      } catch {
        /* Storage is optional. */
      }
  }
  url(s = this.state()) {
    if (!s) return '/stays';
    const params = new URLSearchParams({
      check_in: s.check_in,
      check_out: s.check_out,
      adults: String(s.adults),
      children: String(s.children),
      rooms: String(s.rooms),
      room: s.room_type,
    });
    return `/stays/${encodeURIComponent(s.stay_slug)}/book?${params}`;
  }
  private save(s: BookingCheckoutState) {
    this.state.set(s);
    if (this.browser)
      try {
        sessionStorage.setItem(this.storageKey, JSON.stringify(s));
      } catch {
        /* URL fallback. */
      }
  }
  private selection(s: Omit<BookingCheckoutState, 'idempotency_key' | 'booking_id'>) {
    return {
      stay_id: s.stay_id,
      stay_slug: s.stay_slug,
      room_type: s.room_type,
      check_in: s.check_in,
      check_out: s.check_out,
      adults: s.adults,
      children: s.children,
      rooms: s.rooms,
    };
  }
}

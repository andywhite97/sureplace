import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin, of } from 'rxjs';
import {
  ManagerBookingsApiService,
  RoomManagementApiService,
  StayManagementApiService,
} from '../../core/api/manage-api.services';
import { Booking } from '../../core/models/account.models';
import { RoomAvailabilityDay } from '../../core/models/manage.models';
import { RoomTypeSummary } from '../../core/models/listing.models';
@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, ReactiveFormsModule],
  templateUrl: './availability-calendar.component.html',
  styleUrls: ['../bookings/booking-ui.scss', './booking-calendar.scss'],
})
export class AvailabilityCalendarComponent {
  private stayApi = inject(StayManagementApiService);
  private roomApi = inject(RoomManagementApiService);
  private bookingApi = inject(ManagerBookingsApiService);
  private fb = inject(FormBuilder);
  stayId = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';
  stays = signal<Array<{ id: string; name: string }>>([]);
  rooms = signal<RoomTypeSummary[]>([]);
  bookings = signal<Booking[]>([]);
  calendar = signal<Record<string, RoomAvailabilityDay[]>>({});
  days = signal<string[]>([]);
  preview = signal<Booking | null>(null);
  busy = signal(false);
  loading = signal(true);
  error = signal('');
  message = signal('');
  range = this.fb.nonNullable.group({
    room: [''],
    start: [this.iso(new Date())],
    end: [this.iso(new Date(Date.now() + 86400000 * 6))],
  });
  bulk = this.fb.nonNullable.group({
    start_date: [this.iso(new Date()), Validators.required],
    end_date: [this.iso(new Date()), Validators.required],
    available_units: [1, Validators.min(0)],
    custom_price: [''],
    minimum_stay_override: [1, Validators.min(1)],
    is_blocked: [false],
  });
  constructor() {
    if (this.stayId) this.loadRooms();
    else
      this.stayApi.allManaged().subscribe({
        next: (p) => {
          this.stays.set(p.results.map((s) => ({ id: s.id, name: s.name })));
          if (p.results[0]) this.selectStay(p.results[0].id);
          else this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Managed stays could not be loaded.');
        },
      });
  }
  selectStay(id: string) {
    this.stayId = id;
    this.preview.set(null);
    this.loadRooms();
  }
  loadRooms() {
    this.loading.set(true);
    this.stayApi.rooms(this.stayId).subscribe({
      next: (r) => {
        this.rooms.set(r);
        this.range.controls.room.setValue('');
        this.loadCalendar();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Rooms could not be loaded.');
      },
    });
  }
  visibleRooms() {
    const id = this.range.controls.room.value;
    return this.rooms().filter((r) => !id || r.id === id);
  }
  loadCalendar() {
    const v = this.range.getRawValue();
    const length = (Date.parse(v.end) - Date.parse(v.start)) / 86400000;
    if (!Number.isInteger(length) || length < 0 || length > 31) {
      this.error.set('Choose a calendar range of up to 32 days.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.days.set(
      Array.from({ length: length + 1 }, (_, i) =>
        new Date(Date.parse(v.start) + i * 86400000).toISOString().slice(0, 10),
      ),
    );
    const rooms = this.visibleRooms();
    forkJoin({
      bookings: this.bookingApi.list(this.stayId),
      calendars: rooms.length
        ? forkJoin(rooms.map((r) => this.roomApi.calendar(r.id, v.start, v.end)))
        : of([]),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => {
          this.bookings.set(r.bookings.results);
          this.calendar.set(Object.fromEntries(rooms.map((room, i) => [room.id, r.calendars[i]])));
        },
        error: () => this.error.set('Booking calendar could not be loaded.'),
      });
  }
  day(room: string, date: string) {
    return this.calendar()[room]?.find((d) => d.date === date);
  }
  at(room: string, date: string) {
    return this.bookings().filter(
      (b) =>
        b.room_type === room &&
        b.check_in <= date &&
        b.check_out > date &&
        (b.status === 'CONFIRMED' ||
          (b.status === 'PENDING' && (!b.expires_at || Date.parse(b.expires_at) > Date.now()))),
    );
  }
  saveBulk() {
    const room = this.range.controls.room.value,
      v = this.bulk.getRawValue();
    if (!room || this.bulk.invalid || v.end_date < v.start_date) {
      this.error.set('Select one room and a valid date range for bulk changes.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.roomApi
      .bulkAvailability(room, {
        start_date: v.start_date,
        end_date: v.end_date,
        available_units: v.available_units,
        custom_price: v.custom_price || undefined,
        minimum_stay_override: v.minimum_stay_override,
        is_blocked: v.is_blocked,
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (r) => {
          this.message.set(`${r.updated} dates updated.`);
          this.loadCalendar();
        },
        error: (e) => this.error.set(e.error?.message || 'Availability could not be updated.'),
      });
  }
  private iso(d: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Mbabane',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    return ['year', 'month', 'day'].map((k) => parts.find((p) => p.type === k)?.value).join('-');
  }
}

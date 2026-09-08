import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RoomManagementApiService, StayManagementApiService } from '../../core/api/manage-api.services';
import { RoomAvailabilityDay } from '../../core/models/manage.models';
import { RoomTypeSummary } from '../../core/models/listing.models';
import { formatMoney } from '../../shared/listing/price-format';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<section class="page"><header><a routerLink="/account/manage/stays">Back</a><h1>Availability calendar</h1></header>
    <form class="controls" [formGroup]="range" (ngSubmit)="loadCalendar()"><label>Room<select formControlName="room">@for (r of rooms(); track r.id) { <option [value]="r.id">{{ r.name }}</option> }</select></label><label>Start<input type="date" formControlName="start" /></label><label>End<input type="date" formControlName="end" /></label><button>Load</button></form>
    @if (calendar().length) { <div class="calendar">@for (d of calendar(); track d.date) { <article [class.blocked]="d.blocked"><strong>{{ label(d.date) }}</strong><span>{{ d.available_units }} available</span><span>{{ d.reserved_units }} reserved</span><span>{{ formatMoney(d.effective_price, selectedCurrency()) }}</span>@if (d.blocked) { <b>Blocked</b> }</article> }</div> }
    <form class="bulk" [formGroup]="bulk" (ngSubmit)="saveBulk()"><h2>Bulk update</h2><div class="pair"><label>Start date<input type="date" formControlName="start_date" /></label><label>End date<input type="date" formControlName="end_date" /></label></div><div class="pair"><label>Available units<input type="number" min="0" formControlName="available_units" /></label><label>Custom price<input type="number" min="0" formControlName="custom_price" /></label></div><label>Minimum stay override<input type="number" min="1" formControlName="minimum_stay_override" /></label><label class="check"><input type="checkbox" formControlName="is_blocked" /> Block these dates</label>@if (message()) { <p role="status">{{ message() }}</p> }@if (error()) { <p class="error" role="alert">{{ error() }}</p> }<button [disabled]="busy()">Update Availability</button></form>
  </section>`,
  styles: [
    `.page{display:grid;gap:1rem}header,.controls{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end}.calendar{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:.5rem}article{display:grid;gap:.2rem;padding:.7rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.blocked{background:#fde8e8}.bulk{display:grid;gap:.7rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.pair{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}label{display:grid;gap:.25rem}.check{display:flex;align-items:center}input,select{padding:.58rem;border:1px solid var(--line);border-radius:var(--radius-sm)}button,a{padding:.55rem .75rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;color:var(--midnight);text-decoration:none;font-weight:800}button[type=submit],.bulk button{background:var(--teal);color:#fff}.error{color:#9b2525}@media(max-width:760px){.pair{grid-template-columns:1fr}.controls{display:grid}}`,
  ],
})
export class AvailabilityCalendarComponent {
  private stayApi = inject(StayManagementApiService);
  private roomApi = inject(RoomManagementApiService);
  private fb = inject(FormBuilder);
  stayId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  rooms = signal<RoomTypeSummary[]>([]);
  calendar = signal<RoomAvailabilityDay[]>([]);
  busy = signal(false);
  error = signal('');
  message = signal('');
  range = this.fb.nonNullable.group({ room: [''], start: [this.iso(new Date())], end: [this.iso(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30))] });
  bulk = this.fb.nonNullable.group({ start_date: [this.iso(new Date()), Validators.required], end_date: [this.iso(new Date()), Validators.required], available_units: [1, Validators.min(0)], custom_price: [''], minimum_stay_override: [1, Validators.min(1)], is_blocked: [false] });
  selectedCurrency = computed(() => this.rooms().find((r) => r.id === this.range.controls.room.value)?.currency || 'SZL');
  readonly formatMoney = formatMoney;
  constructor() { this.stayApi.rooms(this.stayId).subscribe((r) => { this.rooms.set(r); if (r[0]) this.range.controls.room.setValue(r[0].id); this.loadCalendar(); }); }
  loadCalendar() { const v = this.range.getRawValue(); if (!v.room) return; this.roomApi.calendar(v.room, v.start, v.end).subscribe((d) => this.calendar.set(d)); }
  saveBulk() { const room = this.range.controls.room.value, v = this.bulk.getRawValue(); if (!room || v.end_date < v.start_date) { this.error.set('Choose a valid date range.'); return; } this.busy.set(true); this.error.set(''); this.roomApi.bulkAvailability(room, { start_date: v.start_date, end_date: v.end_date, available_units: v.available_units, custom_price: v.custom_price || undefined, minimum_stay_override: v.minimum_stay_override, is_blocked: v.is_blocked }).pipe(finalize(() => this.busy.set(false))).subscribe({ next: (r) => { this.message.set(`${r.updated} dates updated.`); this.loadCalendar(); }, error: (e) => this.error.set(e?.error?.message || 'Availability could not be updated.') }); }
  label(v: string) { return new Intl.DateTimeFormat('en-SZ', { day: 'numeric', month: 'short' }).format(new Date(v + 'T00:00:00Z')); }
  private iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
}

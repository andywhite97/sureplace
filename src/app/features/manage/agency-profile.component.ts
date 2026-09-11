import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { ToastService } from '../../core/services/toast.service';
import { Agency } from '../../core/models/manage.models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<section class="page"><h1>Agency profile</h1>@if(agency(); as a){<form [formGroup]="form" (ngSubmit)="save(a)"><label>Name<input formControlName="name" /></label><label>Trading name<input formControlName="trading_name" /></label><label>Description<textarea formControlName="description"></textarea></label><label>Email<input type="email" formControlName="email" /></label><label>Phone<input formControlName="phone" /></label><label>WhatsApp<input formControlName="whatsapp_number" /></label><label>Website<input formControlName="website" /></label><label>Region<input formControlName="region" /></label><label>Town<input formControlName="town" /></label><label>Suburb<input formControlName="suburb" /></label><label>Address<textarea formControlName="address"></textarea></label><button [disabled]="form.invalid||busy()">Save profile</button></form>}@else{<p>No agency found.</p>}</section>`,
  styles: [` .page,form{display:grid;gap:1rem}label{display:grid;gap:.35rem;font-weight:800}input,textarea{border:1px solid var(--line);border-radius:var(--radius-sm);padding:.65rem}button{justify-self:start;border:0;border-radius:var(--radius-sm);background:var(--teal);color:#fff;font-weight:850;padding:.75rem 1rem}`],
})
export class AgencyProfileComponent {
  private api = inject(AgencyManagementApiService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  busy = signal(false);
  agency = signal<Agency | null>(null);
  form = this.fb.nonNullable.group({
    name: ['', Validators.required], trading_name: [''], description: [''], email: ['', Validators.email], phone: [''], whatsapp_number: [''], website: [''], region: [''], town: [''], suburb: [''], address: [''],
  });
  constructor() {
    this.api.mine().pipe(switchMap((items) => this.api.detail(items[0]?.id || ''))).subscribe({ next: (a) => { this.agency.set(a); this.form.patchValue(a); }, error: () => this.agency.set(null) });
  }
  save(a: Agency) {
    this.busy.set(true);
    this.api.update(a.id, this.form.getRawValue()).pipe(finalize(() => this.busy.set(false))).subscribe((agency) => {
      this.agency.set(agency);
      this.toast.show({ kind: 'success', title: 'Agency profile updated' });
    });
  }
}

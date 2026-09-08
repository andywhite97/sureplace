import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { VerificationApiService } from '../../core/api/manage-api.services';
import { VerificationRequestCreate, VerificationRequestSummary, VerificationTypeInfo } from '../../core/models/manage.models';
import { ManageStatusComponent } from './manage-ui';

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ManageStatusComponent],
  template: `<section class="page"><h1>Verification</h1><section class="types">@for (t of types(); track t.type) { <article><strong>{{ t.label }}</strong><p>{{ t.description }}</p><small>{{ t.disclaimer }}</small></article> }</section>
    <form [formGroup]="form" (ngSubmit)="create()"><h2>Start verification</h2><label>Verification type<select formControlName="verification_type" (change)="selectedType.set($any($event.target).value)">@for (t of types(); track t.type) { <option [value]="t.type">{{ t.label }}</option> }</select></label>@if (entityField(); as field) { <label>{{ entityLabel() }} ID<input formControlName="entity_id" /></label> }<button type="submit" [disabled]="busy() || form.invalid || (entityField() && !form.controls.entity_id.value)">Create draft</button></form>
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    @if (loading()) { <div class="skeleton"></div> } @else if (!requests().length) { <div class="state"><h2>No verification requests yet.</h2><p>Create a draft request to upload supporting documents.</p></div> } @else { <div class="list">@for (r of requests(); track r.id) { <article><div><strong>{{ label(r.verification_type) }}</strong><p>Created {{ r.created_at | date: 'mediumDate' }}</p>@if (r.reviewer_notes) { <p>{{ r.reviewer_notes }}</p> }</div><aside><sp-manage-status [status]="r.status" />@if (r.status === 'DRAFT') { <label>Upload verification document<input type="file" accept=".pdf,image/png,image/jpeg" (change)="upload(r, $any($event.target).files)" /></label><button (click)="submit(r)">Submit</button> }</aside></article> }</div> }</section>`,
  styles: [
    `.page{display:grid;gap:1rem}.types,.list{display:grid;gap:.8rem}.types{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}article,form{display:grid;gap:.45rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}form{max-width:640px}label{display:grid;gap:.25rem}input,select{padding:.62rem;border:1px solid var(--line);border-radius:var(--radius-sm)}p,small{margin:0;color:var(--slate)}aside{display:grid;gap:.5rem}button{padding:.55rem .75rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;font-weight:800}button[type=submit]{background:var(--teal);color:#fff}input{max-width:100%}.error{color:#9b2525}.state{display:grid;place-items:center;text-align:center;padding:3rem 1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}.skeleton{height:150px;background:var(--mist);border-radius:var(--radius-sm)}`,
  ],
})
export class VerificationComponent {
  private api = inject(VerificationApiService);
  private fb = inject(FormBuilder);
  requests = signal<VerificationRequestSummary[]>([]);
  types = signal<VerificationTypeInfo[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  selectedType = signal('IDENTITY');
  entityField = computed(() => ({ AGENT: 'agent_profile', AGENCY: 'agency', PROPERTY: 'property', STAY: 'stay' }[this.selectedType()] || null));
  entityLabel = computed(() => this.label(this.selectedType()).replace('Verification', '').trim() || 'Entity');
  form = this.fb.nonNullable.group({ verification_type: ['IDENTITY', Validators.required], entity_id: [''] });
  constructor() {
    forkJoin({ r: this.api.list(), t: this.api.types() }).pipe(finalize(() => this.loading.set(false))).subscribe(({ r, t }) => {
      this.requests.set(r.results);
      this.types.set(t);
      const first = t[0]?.type || 'IDENTITY';
      this.selectedType.set(first);
      this.form.controls.verification_type.setValue(first);
    });
  }
  label(v: string) { return v.toLowerCase().split('_').map((x) => x[0].toUpperCase() + x.slice(1)).join(' '); }
  create() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue(), field = this.entityField();
    const body: VerificationRequestCreate = { verification_type: value.verification_type };
    if (field) body[field as keyof VerificationRequestCreate] = value.entity_id;
    this.busy.set(true); this.error.set('');
    this.api.create(body).pipe(finalize(() => this.busy.set(false))).subscribe({ next: (request) => { this.requests.update((items) => [request, ...items]); this.form.controls.entity_id.setValue(''); }, error: (e) => this.error.set(e?.error?.detail || e?.error?.message || 'Verification request could not be created.') });
  }
  upload(r: VerificationRequestSummary, files: FileList | null) { if (!files?.[0]) return; const data = new FormData(); data.set('document_type', r.verification_type); data.set('file', files[0]); this.api.uploadDocument(r.id, data).subscribe(); }
  submit(r: VerificationRequestSummary) { this.api.submit(r.id).subscribe((x) => this.requests.update((xs) => xs.map((v) => v.id === r.id ? x : v))); }
}

import { Component, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { StayManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ManagedStay, StayWriteRequest } from '../../core/models/manage.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { LocationPickerComponent } from './location-picker.component';
import { ManageStatusComponent, QualityScoreComponent } from './manage-ui';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SmartImageComponent, LocationPickerComponent, ManageStatusComponent, QualityScoreComponent],
  template: `<section class="page"><header><a routerLink="/account/manage/stays">Back</a><h1>{{ id ? 'Edit stay' : 'Add stay' }}</h1>@if (stay()) { <sp-manage-status [status]="stay()!.status" /> }</header>
    <nav class="steps" aria-label="Stay form steps">@for (s of steps; track s; let i = $index) { <button type="button" [class.active]="step()===i" (click)="step.set(i)">{{ s }}</button> }</nav>
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    <form [formGroup]="form" (ngSubmit)="save(false)">
      @if (step() === 0) { <section><label>Name<input formControlName="name" /></label><label>Stay type<select formControlName="stay_type">@for (t of ref.data().stay_types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }</select></label><label>Description<textarea rows="5" formControlName="description"></textarea></label><label>Phone<input formControlName="phone" /></label><label>Email<input type="email" formControlName="email" /></label><label>WhatsApp<input formControlName="whatsapp_number" /></label><label>Website<input formControlName="website" /></label></section> }
      @if (step() === 1) { <section><label>Region<select formControlName="region"><option value="">Choose region</option>@for (r of ref.data().regions; track r.value) { <option [value]="r.label">{{ r.label }}</option> }</select></label><label>Town<input formControlName="town" /></label><label>Suburb<input formControlName="suburb" /></label><label>Address<input formControlName="address" /></label><sp-location-picker [latitude]="coordinate('latitude')" [longitude]="coordinate('longitude')" (locationChange)="setLocation($event)" /><div class="pair"><label>Latitude<input type="number" step="0.000001" formControlName="latitude" /></label><label>Longitude<input type="number" step="0.000001" formControlName="longitude" /></label></div></section> }
      @if (step() === 2) { <section><fieldset><legend>Stay amenities</legend>@for (a of ref.data().stay_amenities || []; track a.id) { <label class="check"><input type="checkbox" [checked]="hasAmenity(a.id)" (change)="toggleAmenity(a.id, $any($event.target).checked)" /> {{ a.name }}</label> }</fieldset></section> }
      @if (step() === 3) { <section><div class="pair"><label>Check-in time<input type="time" formControlName="check_in_time" /></label><label>Check-out time<input type="time" formControlName="check_out_time" /></label></div></section> }
      @if (step() === 4) { <section><label>Upload stay photos<input type="file" multiple accept="image/png,image/jpeg" (change)="upload($any($event.target).files)" /></label>@if (!stay()) { <p class="hint">Save the draft before uploading photos.</p> }<div class="photos">@for (img of orderedImages(); track img.id; let i = $index) { <figure><sp-image [src]="img.image" [alt]="img.caption || stay()?.name || 'Stay photo'" ratio="4 / 3" /><figcaption>{{ img.is_cover ? 'Cover' : 'Photo' }} &middot; {{ img.sort_order }}</figcaption><div class="photo-actions"><button type="button" [disabled]="i===0 || busy()" (click)="moveImage(img.id, -1)">Move up</button><button type="button" [disabled]="i===orderedImages().length-1 || busy()" (click)="moveImage(img.id, 1)">Move down</button><button type="button" [disabled]="img.is_cover || busy()" (click)="setCover(img.id)">Set cover</button><button type="button" [disabled]="busy()" (click)="deleteImage(img.id)">Delete</button></div></figure> }</div></section> }
      @if (step() === 5) { <section>@if (stay()) { <a [routerLink]="['/account/manage/stays', stay()!.id, 'rooms']">Manage Rooms</a> } @if (stay()?.quality; as q) { <sp-quality-score [score]="q.score" [suggestions]="q.suggestions" /> }<p class="hint">Add rooms after saving the stay draft.</p></section> }
      @if (step() === 6) { <section><p class="hint">Save as draft anytime. Submit sends the stay into the backend review workflow.</p></section> }
      <footer><button type="button" [disabled]="step()===0" (click)="step.set(step()-1)">Previous</button><button type="button" [disabled]="step()===steps.length-1" (click)="step.set(step()+1)">Next</button><button type="submit" [disabled]="busy()">Save Draft</button><button type="button" [disabled]="busy() || !stay()" (click)="submit()">Submit</button></footer>
    </form></section>`,
  styles: [
    `.page{display:grid;gap:1rem}header,.steps,footer{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}h1{margin:0}form,section{display:grid;gap:.8rem}label{display:grid;gap:.25rem}input,select,textarea{padding:.62rem;border:1px solid var(--line);border-radius:var(--radius-sm);font:inherit}.pair{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.check{display:flex;align-items:center;gap:.5rem}button,a{padding:.55rem .75rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;color:var(--midnight);text-decoration:none;font-weight:800}.active,button[type=submit]{background:var(--teal);color:#fff}.error{color:#9b2525}.hint{color:var(--slate)}.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.7rem}figure{margin:0;display:grid;gap:.45rem}figcaption{font-size:.8rem;color:var(--slate)}.photo-actions{display:grid;grid-template-columns:1fr 1fr;gap:.35rem}.photo-actions button{padding:.45rem;font-size:.78rem}@media(max-width:760px){.pair{grid-template-columns:1fr}}`,
  ],
})
export class StayFormComponent {
  private api = inject(StayManagementApiService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  ref = inject(ReferenceApiService);
  id = this.route.snapshot.paramMap.get('id');
  steps = ['Basics', 'Location', 'Amenities', 'Policies', 'Photos', 'Rooms', 'Review'];
  step = signal(0);
  busy = signal(false);
  error = signal('');
  dirty = signal(false);
  stay = signal<ManagedStay | null>(null);
  form = this.fb.nonNullable.group({
    name: ['', Validators.required], description: [''], stay_type: ['HOTEL'], region: [''], town: [''], suburb: [''], address: [''], latitude: [''], longitude: [''],
    phone: [''], email: [''], whatsapp_number: [''], website: [''], check_in_time: [''], check_out_time: [''], amenities: [[] as string[]],
  });
  constructor() {
    this.form.valueChanges.subscribe(() => this.dirty.set(true));
    if (this.id) this.api.detail(this.id).subscribe((s) => { this.stay.set(s); this.form.patchValue({ ...s, latitude: String(s.latitude ?? ''), longitude: String(s.longitude ?? ''), check_in_time: s.check_in_time || '', check_out_time: s.check_out_time || '', amenities: s.amenities.map((a) => a.id) }); this.dirty.set(false); });
  }
  hasAmenity(id: string) { return this.form.controls.amenities.value.includes(id); }
  toggleAmenity(id: string, on: boolean) { const a = this.form.controls.amenities.value; this.form.controls.amenities.setValue(on ? [...a, id] : a.filter((x) => x !== id)); }
  coordinate(control: 'latitude' | 'longitude') { const value = Number(this.form.controls[control].value); return Number.isFinite(value) ? value : null; }
  setLocation(point: { latitude: number; longitude: number }) { this.form.patchValue({ latitude: point.latitude.toFixed(6), longitude: point.longitude.toFixed(6) }); }
  orderedImages() { return [...(this.stay()?.images || [])].sort((a, b) => a.sort_order - b.sort_order); }
  save(navigate = true) {
    if (this.form.invalid) { this.error.set('Complete the required fields before saving.'); return; }
    this.busy.set(true); this.error.set('');
    const request = this.id || this.stay() ? this.api.update(this.id || this.stay()!.id, this.payload()) : this.api.create(this.payload());
    request.pipe(finalize(() => this.busy.set(false))).subscribe({ next: (s) => { this.stay.set(s); this.dirty.set(false); if (navigate && !this.id) void this.router.navigate(['/account/manage/stays', s.id, 'edit']); }, error: (e) => this.error.set(e?.error?.message || 'Stay could not be saved.') });
  }
  submit() { const id = this.stay()?.id; if (id) this.api.submit(id).subscribe({ next: (s) => this.stay.set(s), error: (e) => this.error.set(e?.error?.message || 'Stay could not be submitted.') }); }
  upload(files: FileList | null) {
    const id = this.stay()?.id; if (!id || !files?.length) return;
    Array.from(files).forEach((file) => { const data = new FormData(); data.set('image', file); this.api.uploadImage(id, data).subscribe(() => this.refresh()); });
  }
  moveImage(imageId: string, direction: -1 | 1) {
    const id = this.stay()?.id, images = this.orderedImages(), index = images.findIndex((img) => img.id === imageId), target = images[index + direction];
    if (!id || index < 0 || !target) return;
    const current = images[index];
    this.busy.set(true);
    forkJoin([this.api.updateImage(id, current.id, { sort_order: target.sort_order }), this.api.updateImage(id, target.id, { sort_order: current.sort_order })]).pipe(finalize(() => this.busy.set(false))).subscribe(() => this.refresh());
  }
  setCover(imageId: string) { const id = this.stay()?.id; if (id) this.api.updateImage(id, imageId, { is_cover: true }).subscribe(() => this.refresh()); }
  deleteImage(imageId: string) { const id = this.stay()?.id; if (id && confirm('Delete this photo?')) this.api.deleteImage(id, imageId).subscribe(() => this.refresh()); }
  private refresh() { const id = this.stay()?.id || this.id; if (id) this.api.detail(id).subscribe((s) => this.stay.set(s)); }
  private payload(): StayWriteRequest {
    const v = this.form.getRawValue();
    return { name: v.name, description: v.description, stay_type: v.stay_type, region: v.region, town: v.town, suburb: v.suburb, address: v.address, latitude: v.latitude ? Number(v.latitude) : undefined, longitude: v.longitude ? Number(v.longitude) : undefined, phone: v.phone, email: v.email, whatsapp_number: v.whatsapp_number, website: v.website, check_in_time: v.check_in_time || null, check_out_time: v.check_out_time || null, amenities: v.amenities };
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(e: BeforeUnloadEvent) { if (this.dirty()) e.preventDefault(); }
}

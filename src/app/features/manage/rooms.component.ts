import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { RoomManagementApiService, StayManagementApiService } from '../../core/api/manage-api.services';
import { RoomWriteRequest } from '../../core/models/manage.models';
import { RoomTypeSummary, StayImage } from '../../core/models/listing.models';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SmartImageComponent],
  template: `<section class="page"><header><a routerLink="/account/manage/stays">Back</a><h1>Room types</h1></header>
    @if (loading()) { <div class="skeleton"></div> } @else { <div class="list">@for (r of rooms(); track r.id) {
      <article><div class="media"><sp-image [src]="cover(r)" [alt]="r.name" ratio="4 / 3" /><label>Upload room photos<input type="file" multiple accept="image/png,image/jpeg" (change)="uploadRoomImages(r.id, $any($event.target).files)" /></label>@if (r.images.length) { <div class="thumbs">@for (img of orderedImages(r); track img.id; let i = $index) { <figure><sp-image [src]="img.image" [alt]="img.caption || r.name" ratio="1 / 1" /><figcaption>{{ img.is_cover ? 'Cover' : 'Photo' }}</figcaption><div><button type="button" [disabled]="i===0 || busy()" (click)="moveImage(r, img, -1)">Up</button><button type="button" [disabled]="i===orderedImages(r).length-1 || busy()" (click)="moveImage(r, img, 1)">Down</button><button type="button" [disabled]="img.is_cover || busy()" (click)="setCover(r.id, img.id)">Cover</button><button type="button" [disabled]="busy()" (click)="deleteImage(r.id, img.id)">Delete</button></div></figure> }</div> }</div><div><h2>{{ r.name }}</h2><p>{{ r.capacity_adults }} adults &middot; {{ r.capacity_children }} children &middot; {{ r.number_of_beds }} beds</p><p>{{ r.quantity }} units &middot; {{ formatMoney(r.base_price, r.currency) }} &middot; {{ r.minimum_stay }} night min</p><p>{{ r.bed_configuration }} &middot; {{ r.bathroom_type }}</p></div><aside><button (click)="edit(r)">Edit</button><button (click)="deactivate(r)">Deactivate</button><a [routerLink]="['/account/manage/stays', stayId, 'calendar']">Calendar</a></aside></article>
    }</div> }
    <form [formGroup]="form" (ngSubmit)="save()"><h2>{{ editing() ? 'Edit room' : 'Create room type' }}</h2><label>Name<input formControlName="name" /></label><label>Description<textarea formControlName="description"></textarea></label><div class="pair"><label>Adult capacity<input type="number" min="1" formControlName="capacity_adults" /></label><label>Child capacity<input type="number" min="0" formControlName="capacity_children" /></label></div><div class="pair"><label>Total capacity<input type="number" min="1" formControlName="total_capacity" /></label><label>Beds<input type="number" min="1" formControlName="number_of_beds" /></label></div><label>Bed configuration<input formControlName="bed_configuration" /></label><label>Bathroom type<input formControlName="bathroom_type" /></label><div class="pair"><label>Quantity<input type="number" min="1" formControlName="quantity" /></label><label>Base nightly price<input type="number" min="0" formControlName="base_price" /></label></div><div class="pair"><label>Currency<input formControlName="currency" /></label><label>Minimum stay<input type="number" min="1" formControlName="minimum_stay" /></label></div><label class="check"><input type="checkbox" formControlName="is_active" /> Active</label><footer><button type="submit" [disabled]="form.invalid || busy()">Save room</button>@if (editing()) { <button type="button" (click)="cancel()">Cancel</button> }</footer></form></section>`,
  styles: [
    `.page{display:grid;gap:1rem}header,footer{display:flex;gap:.6rem;align-items:center}.list{display:grid;gap:.8rem}article{display:grid;grid-template-columns:220px 1fr auto;gap:1rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}h1,h2,p{margin:0}p{color:var(--slate)}aside{display:grid;gap:.5rem;align-content:start}.media{display:grid;gap:.5rem}.thumbs{display:grid;grid-template-columns:repeat(2,1fr);gap:.45rem}figure{margin:0;display:grid;gap:.3rem}figcaption{font-size:.75rem;color:var(--slate)}figure div{display:grid;grid-template-columns:1fr 1fr;gap:.25rem}form{display:grid;gap:.7rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm)}label{display:grid;gap:.25rem}.pair{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.check{display:flex;align-items:center}input,textarea{padding:.62rem;border:1px solid var(--line);border-radius:var(--radius-sm)}button,a{padding:.55rem .75rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;color:var(--midnight);text-decoration:none;font-weight:800}figure button{padding:.35rem;font-size:.72rem}button[type=submit]{background:var(--teal);color:#fff}.skeleton{height:150px;background:var(--mist);border-radius:var(--radius-sm)}@media(max-width:900px){article{grid-template-columns:1fr}.thumbs{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}aside{display:flex;flex-wrap:wrap}}@media(max-width:760px){.pair{grid-template-columns:1fr}}`,
  ],
})
export class RoomsComponent {
  private stayApi = inject(StayManagementApiService);
  private roomApi = inject(RoomManagementApiService);
  private fb = inject(FormBuilder);
  stayId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  rooms = signal<RoomTypeSummary[]>([]);
  loading = signal(true);
  busy = signal(false);
  editing = signal<RoomTypeSummary | null>(null);
  form = this.fb.nonNullable.group({ name: ['', Validators.required], description: [''], capacity_adults: [2, Validators.min(1)], capacity_children: [0, Validators.min(0)], total_capacity: [2, Validators.min(1)], number_of_beds: [1, Validators.min(1)], bed_configuration: ['Queen bed'], bathroom_type: ['Private'], quantity: [1, Validators.min(1)], base_price: ['0', Validators.required], currency: ['SZL'], minimum_stay: [1, Validators.min(1)], is_active: [true] });
  readonly formatMoney = formatMoney;
  constructor() { this.load(); }
  load() { this.loading.set(true); this.stayApi.rooms(this.stayId).pipe(finalize(() => this.loading.set(false))).subscribe((r) => this.rooms.set(r)); }
  cover(room: RoomTypeSummary) { return room.images.find((img) => img.is_cover)?.image || room.images[0]?.image || null; }
  orderedImages(room: RoomTypeSummary) { return [...room.images].sort((a, b) => a.sort_order - b.sort_order); }
  edit(r: RoomTypeSummary) { this.editing.set(r); this.form.patchValue({ ...r, base_price: r.base_price }); }
  cancel() { this.editing.set(null); this.form.reset({ name: '', description: '', capacity_adults: 2, capacity_children: 0, total_capacity: 2, number_of_beds: 1, bed_configuration: 'Queen bed', bathroom_type: 'Private', quantity: 1, base_price: '0', currency: 'SZL', minimum_stay: 1, is_active: true }); }
  save() { if (this.form.invalid) return; this.busy.set(true); const body = this.form.getRawValue() as RoomWriteRequest; const req = this.editing() ? this.roomApi.update(this.editing()!.id, body) : this.stayApi.createRoom(this.stayId, body); req.pipe(finalize(() => this.busy.set(false))).subscribe(() => { this.cancel(); this.load(); }); }
  deactivate(r: RoomTypeSummary) { if (confirm('Deactivate this room type?')) this.roomApi.update(r.id, { is_active: false }).subscribe(() => this.load()); }
  uploadRoomImages(roomId: string, files: FileList | null) {
    if (!files?.length) return;
    Array.from(files).forEach((file) => { const data = new FormData(); data.set('image', file); this.roomApi.uploadImage(roomId, data).subscribe(() => this.load()); });
  }
  moveImage(room: RoomTypeSummary, image: StayImage, direction: -1 | 1) {
    const images = this.orderedImages(room), index = images.findIndex((img) => img.id === image.id), target = images[index + direction];
    if (index < 0 || !target) return;
    this.busy.set(true);
    forkJoin([this.roomApi.updateImage(room.id, image.id, { sort_order: target.sort_order }), this.roomApi.updateImage(room.id, target.id, { sort_order: image.sort_order })]).pipe(finalize(() => this.busy.set(false))).subscribe(() => this.load());
  }
  setCover(roomId: string, imageId: string) { this.roomApi.updateImage(roomId, imageId, { is_cover: true }).subscribe(() => this.load()); }
  deleteImage(roomId: string, imageId: string) { if (confirm('Delete this room photo?')) this.roomApi.deleteImage(roomId, imageId).subscribe(() => this.load()); }
}

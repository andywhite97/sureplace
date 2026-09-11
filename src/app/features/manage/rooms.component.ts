import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  RoomManagementApiService,
  StayManagementApiService,
} from '../../core/api/manage-api.services';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { RoomWriteRequest } from '../../core/models/manage.models';
import { RoomTypeSummary, StayImage } from '../../core/models/listing.models';
import { ToastService } from '../../core/services/toast.service';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';

type RoomField = keyof RoomWriteRequest;

const defaultRoom = {
  name: '',
  description: '',
  capacity_adults: 2,
  capacity_children: 0,
  total_capacity: 2,
  number_of_beds: 1,
  bed_configuration: 'Queen bed',
  bathroom_type: 'Private',
  quantity: 1,
  base_price: '',
  currency: 'SZL',
  minimum_stay: 1,
  is_active: true,
};

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SmartImageComponent],
  template: `<section class="page">
    <header>
      <a routerLink="/account/manage/stays">Back</a>
      <h1>Room types</h1>
    </header>

    @if (loadError()) {
      <p class="error" role="alert">{{ loadError() }}</p>
    }

    @if (loading()) {
      <div class="skeleton"></div>
    } @else {
      <div class="list">
        @for (r of rooms(); track r.id) {
          <article>
            <div class="media">
              <sp-image [src]="cover(r)" [alt]="r.name" ratio="4 / 3" />
              <label class="upload"
                >Upload room photos<input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  [disabled]="busy()"
                  (change)="uploadRoomImages(r.id, $any($event.target).files)"
              /></label>
              @if (r.images.length) {
                <div class="thumbs">
                  @for (img of orderedImages(r); track img.id; let i = $index) {
                    <figure>
                      <sp-image [src]="img.image" [alt]="img.caption || r.name" ratio="1 / 1" />
                      <figcaption>{{ img.is_cover ? 'Cover' : 'Photo' }}</figcaption>
                      <div>
                        <button
                          type="button"
                          [disabled]="i === 0 || busy()"
                          (click)="moveImage(r, img, -1)"
                        >
                          Up</button
                        ><button
                          type="button"
                          [disabled]="i === orderedImages(r).length - 1 || busy()"
                          (click)="moveImage(r, img, 1)"
                        >
                          Down</button
                        ><button
                          type="button"
                          [disabled]="img.is_cover || busy()"
                          (click)="setCover(r.id, img.id)"
                        >
                          Cover</button
                        ><button
                          type="button"
                          [disabled]="busy()"
                          (click)="deleteImage(r.id, img.id)"
                        >
                          Delete
                        </button>
                      </div>
                    </figure>
                  }
                </div>
              }
            </div>
            <div>
              <h2>{{ r.name }}</h2>
              <p>
                {{ r.capacity_adults }} adults &middot; {{ r.capacity_children }} children &middot;
                {{ r.number_of_beds }} beds
              </p>
              <p>
                {{ r.quantity }} units &middot; {{ formatMoney(r.base_price, r.currency) }} &middot;
                {{ r.minimum_stay }} night min
              </p>
              <p>{{ r.bed_configuration }} &middot; {{ r.bathroom_type }}</p>
            </div>
            <aside>
              <button type="button" (click)="edit(r)">Edit</button
              ><button type="button" (click)="deactivate(r)">Deactivate</button
              ><a [routerLink]="['/account/manage/stays', stayId, 'calendar']">Calendar</a>
            </aside>
          </article>
        } @empty {
          <div class="state">
            <h2>No room types yet.</h2>
            <p>Add the first room guests can book.</p>
          </div>
        }
      </div>
    }

    <form #roomForm [formGroup]="form" (ngSubmit)="save()" novalidate>
      <h2>{{ editing() ? 'Edit room' : 'Create room type' }}</h2>
      @if (formError()) {
        <p class="error" role="alert">{{ formError() }}</p>
      }
      <label
        >Name<input formControlName="name" />
        @if (showError('name')) {
          <small>{{ fieldError('name', 'Room name is required.') }}</small>
        }</label
      ><label
        >Description<textarea formControlName="description"></textarea>
        @if (showError('description')) {
          <small>{{ fieldErrors()['description'] }}</small>
        }
      </label>
      <div class="pair">
        <label
          >Adult capacity<input type="number" min="1" formControlName="capacity_adults" />
          @if (showError('capacity_adults')) {
            <small>{{ fieldError('capacity_adults', 'Adult capacity must be at least 1.') }}</small>
          }</label
        ><label
          >Child capacity<input type="number" min="0" formControlName="capacity_children" />
          @if (showError('capacity_children')) {
            <small>{{
              fieldError('capacity_children', 'Child capacity cannot be negative.')
            }}</small>
          }
        </label>
      </div>
      <div class="pair">
        <label
          >Total capacity<input type="number" min="1" formControlName="total_capacity" />
          @if (showError('total_capacity')) {
            <small>{{
              fieldError('total_capacity', 'Total capacity must cover all guests.')
            }}</small>
          }</label
        ><label
          >Beds<input type="number" min="1" formControlName="number_of_beds" />
          @if (showError('number_of_beds')) {
            <small>{{ fieldError('number_of_beds', 'Beds must be at least 1.') }}</small>
          }
        </label>
      </div>
      <label>Bed configuration<input formControlName="bed_configuration" /></label
      ><label>Bathroom type<input formControlName="bathroom_type" /></label>
      <div class="pair">
        <label
          >Quantity<input type="number" min="1" formControlName="quantity" />
          @if (showError('quantity')) {
            <small>{{ fieldError('quantity', 'Quantity must be at least 1.') }}</small>
          }</label
        ><label
          >Base nightly price<input
            type="number"
            min="0"
            step="0.01"
            formControlName="base_price"
          />
          @if (showError('base_price')) {
            <small>{{ fieldError('base_price', 'Base nightly price is required.') }}</small>
          }
        </label>
      </div>
      <div class="pair">
        <label
          >Currency<input maxlength="3" formControlName="currency" />
          @if (showError('currency')) {
            <small>{{ fieldError('currency', 'Use a 3-letter currency code.') }}</small>
          }</label
        ><label
          >Minimum stay<input type="number" min="1" formControlName="minimum_stay" />
          @if (showError('minimum_stay')) {
            <small>{{
              fieldError('minimum_stay', 'Minimum stay must be at least 1 night.')
            }}</small>
          }
        </label>
      </div>
      <label class="check"><input type="checkbox" formControlName="is_active" /> Active</label>
      <footer>
        <button type="submit" [disabled]="busy()">
          {{ busy() ? 'Saving...' : editing() ? 'Save changes' : 'Add Room' }}
        </button>
        @if (editing()) {
          <button type="button" [disabled]="busy()" (click)="cancel()">Cancel</button>
        }
      </footer>
    </form>
  </section>`,
  styles: [
    `
      .page {
        display: grid;
        gap: 1rem;
      }
      header,
      footer {
        display: flex;
        gap: 0.6rem;
        align-items: center;
      }
      .list {
        display: grid;
        gap: 0.8rem;
      }
      article {
        display: grid;
        grid-template-columns: 220px 1fr auto;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
      }
      h1,
      h2,
      p {
        margin: 0;
      }
      p {
        color: var(--slate);
      }
      aside {
        display: grid;
        gap: 0.5rem;
        align-content: start;
      }
      .media {
        display: grid;
        gap: 0.5rem;
      }
      .thumbs {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.45rem;
      }
      figure {
        margin: 0;
        display: grid;
        gap: 0.3rem;
      }
      figcaption,
      small {
        font-size: 0.75rem;
      }
      figcaption {
        color: var(--slate);
      }
      small,
      .error {
        color: #9b2525;
      }
      figure div {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.25rem;
      }
      form {
        display: grid;
        gap: 0.7rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
      }
      label {
        display: grid;
        gap: 0.25rem;
      }
      .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.7rem;
      }
      .check {
        display: flex;
        align-items: center;
      }
      input,
      textarea {
        padding: 0.62rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        font: inherit;
      }
      .ng-invalid.ng-touched {
        border-color: #9b2525;
      }
      button,
      a,
      .upload {
        padding: 0.55rem 0.75rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        color: var(--midnight);
        text-decoration: none;
        font-weight: 800;
      }
      .upload {
        cursor: pointer;
        text-align: center;
      }
      .upload input {
        margin-top: 0.4rem;
      }
      figure button {
        padding: 0.35rem;
        font-size: 0.72rem;
      }
      button[type='submit'] {
        background: var(--teal);
        color: #fff;
      }
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .state,
      .skeleton {
        border-radius: var(--radius-sm);
        background: var(--mist);
      }
      .state {
        display: grid;
        gap: 0.3rem;
        padding: 1.2rem;
        text-align: center;
      }
      .skeleton {
        height: 150px;
      }
      @media (max-width: 900px) {
        article {
          grid-template-columns: 1fr;
        }
        .thumbs {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }
        aside {
          display: flex;
          flex-wrap: wrap;
        }
      }
      @media (max-width: 760px) {
        .pair {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class RoomsComponent {
  private stayApi = inject(StayManagementApiService);
  private roomApi = inject(RoomManagementApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  stayId = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';
  rooms = signal<RoomTypeSummary[]>([]);
  loading = signal(true);
  busy = signal(false);
  editing = signal<RoomTypeSummary | null>(null);
  loadError = signal('');
  formError = signal('');
  fieldErrors = signal<Partial<Record<RoomField, string>>>({});
  @ViewChild('roomForm', { read: ElementRef }) roomForm?: ElementRef<HTMLElement>;
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    capacity_adults: [2, [Validators.required, Validators.min(1)]],
    capacity_children: [0, [Validators.required, Validators.min(0)]],
    total_capacity: [2, [Validators.required, Validators.min(1)]],
    number_of_beds: [1, [Validators.required, Validators.min(1)]],
    bed_configuration: ['Queen bed'],
    bathroom_type: ['Private'],
    quantity: [1, [Validators.required, Validators.min(1)]],
    base_price: ['', [Validators.required, Validators.min(0)]],
    currency: ['SZL', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    minimum_stay: [1, [Validators.required, Validators.min(1)]],
    is_active: [true],
  });
  readonly formatMoney = formatMoney;

  constructor() {
    this.load();
  }

  load() {
    if (!this.stayId) {
      this.loading.set(false);
      this.loadError.set('Save the stay before adding rooms.');
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    this.stayApi
      .rooms(this.stayId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rooms) => this.rooms.set(rooms),
        error: (error) => {
          const normalized = normalizeApiError(error);
          this.loadError.set(normalized.message || 'Rooms could not be loaded.');
        },
      });
  }

  cover(room: RoomTypeSummary) {
    return room.images.find((img) => img.is_cover)?.image || room.images[0]?.image || null;
  }

  orderedImages(room: RoomTypeSummary) {
    return [...room.images].sort((a, b) => a.sort_order - b.sort_order);
  }

  edit(room: RoomTypeSummary) {
    this.editing.set(room);
    this.formError.set('');
    this.fieldErrors.set({});
    this.form.patchValue({
      name: room.name,
      description: room.description,
      capacity_adults: room.capacity_adults,
      capacity_children: room.capacity_children,
      total_capacity: room.total_capacity,
      number_of_beds: room.number_of_beds,
      bed_configuration: room.bed_configuration,
      bathroom_type: room.bathroom_type,
      quantity: room.quantity,
      base_price: room.base_price,
      currency: room.currency,
      minimum_stay: room.minimum_stay,
      is_active: room.is_active,
    });
    this.roomForm?.nativeElement.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  cancel() {
    this.editing.set(null);
    this.formError.set('');
    this.fieldErrors.set({});
    this.form.reset(defaultRoom);
  }

  save() {
    if (this.busy()) return;

    this.formError.set('');
    this.fieldErrors.set({});
    this.applyCapacityRule();
    if (!this.stayId) {
      this.formError.set('Save the stay before adding rooms.');
      this.toast.show('Save the stay before adding rooms.', 'warning');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      this.formError.set('Please correct the highlighted room details.');
      return;
    }

    this.busy.set(true);
    const editing = this.editing();
    const request = editing
      ? this.roomApi.update(editing.id, this.payload())
      : this.stayApi.createRoom(this.stayId, this.payload());

    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (room) => {
        this.rooms.update((rooms) =>
          editing ? rooms.map((item) => (item.id === room.id ? room : item)) : [...rooms, room],
        );
        this.cancel();
        this.toast.show(
          editing ? 'Room updated successfully.' : 'Room added successfully.',
          'success',
        );
      },
      error: (error) => this.handleSaveError(error),
    });
  }

  deactivate(room: RoomTypeSummary) {
    if (this.busy() || !confirm('Deactivate this room type?')) return;

    this.busy.set(true);
    this.roomApi
      .update(room.id, { is_active: false })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.rooms.update((rooms) => rooms.filter((item) => item.id !== updated.id));
          this.toast.show('Room deactivated.', 'success');
        },
        error: () => this.toast.show('Could not deactivate room.', 'error'),
      });
  }

  uploadRoomImages(roomId: string, files: FileList | null) {
    if (!files?.length || this.busy()) return;

    this.busy.set(true);
    forkJoin(
      Array.from(files).map((file) => {
        const data = new FormData();
        data.set('image', file);
        return this.roomApi.uploadImage(roomId, data).pipe(catchError(() => of(null)));
      }),
    )
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe(() => {
        this.load();
        this.toast.show('Room photos updated.', 'success');
      });
  }

  moveImage(room: RoomTypeSummary, image: StayImage, direction: -1 | 1) {
    const images = this.orderedImages(room);
    const index = images.findIndex((img) => img.id === image.id);
    const target = images[index + direction];
    if (this.busy() || index < 0 || !target) return;

    this.busy.set(true);
    forkJoin([
      this.roomApi.updateImage(room.id, image.id, { sort_order: target.sort_order }),
      this.roomApi.updateImage(room.id, target.id, { sort_order: image.sort_order }),
    ])
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.load(),
        error: () => this.toast.show('Photo order could not be saved.', 'error'),
      });
  }

  setCover(roomId: string, imageId: string) {
    if (this.busy()) return;
    this.roomApi.updateImage(roomId, imageId, { is_cover: true }).subscribe({
      next: () => this.load(),
      error: () => this.toast.show('Cover photo could not be saved.', 'error'),
    });
  }

  deleteImage(roomId: string, imageId: string) {
    if (this.busy() || !confirm('Delete this room photo?')) return;
    this.roomApi.deleteImage(roomId, imageId).subscribe({
      next: () => this.load(),
      error: () => this.toast.show('Room photo could not be deleted.', 'error'),
    });
  }

  showError(name: RoomField) {
    const control = this.form.controls[name];
    return (
      Boolean(this.fieldErrors()[name]) || (control.invalid && (control.touched || control.dirty))
    );
  }

  fieldError(name: RoomField, fallback: string) {
    return this.fieldErrors()[name] || fallback;
  }

  private payload(): RoomWriteRequest {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      description: value.description.trim(),
      capacity_adults: Number(value.capacity_adults),
      capacity_children: Number(value.capacity_children),
      total_capacity: Number(value.total_capacity),
      number_of_beds: Number(value.number_of_beds),
      bed_configuration: value.bed_configuration.trim(),
      bathroom_type: value.bathroom_type.trim(),
      quantity: Number(value.quantity),
      base_price: String(value.base_price),
      currency: value.currency.trim().toUpperCase(),
      minimum_stay: Number(value.minimum_stay),
      is_active: value.is_active,
    };
  }

  private applyCapacityRule() {
    const errors = this.form.controls.total_capacity.errors;
    if (errors?.['capacity']) {
      const { capacity, ...remainingErrors } = errors;
      this.form.controls.total_capacity.setErrors(
        Object.keys(remainingErrors).length ? remainingErrors : null,
      );
    }

    const adult = Number(this.form.controls.capacity_adults.value);
    const child = Number(this.form.controls.capacity_children.value);
    const total = Number(this.form.controls.total_capacity.value);
    if (
      Number.isFinite(adult) &&
      Number.isFinite(child) &&
      Number.isFinite(total) &&
      total < adult + child
    ) {
      this.form.controls.total_capacity.setErrors({ capacity: true });
    }
  }

  private handleSaveError(error: unknown) {
    const normalized = normalizeApiError(error);
    const fields = this.extractFieldErrors(normalized.errors);
    if (!Object.keys(fields).length && error instanceof HttpErrorResponse) {
      Object.assign(fields, this.extractFieldErrors(error.error));
    }
    this.fieldErrors.set(fields);
    for (const key of Object.keys(fields) as RoomField[]) {
      this.form.controls[key]?.markAsTouched();
    }
    this.formError.set(normalized.message || 'Could not add this room. Please try again.');
    this.toast.show(this.formError(), 'error');
  }

  private extractFieldErrors(errors: unknown): Partial<Record<RoomField, string>> {
    if (!errors || typeof errors !== 'object') return {};

    const output: Partial<Record<RoomField, string>> = {};
    for (const [key, value] of Object.entries(errors)) {
      if (!this.isRoomField(key)) continue;
      output[key] = Array.isArray(value) ? String(value[0]) : String(value);
    }
    return output;
  }

  private isRoomField(key: string): key is RoomField {
    return key in this.form.controls;
  }

  private focusFirstInvalid() {
    queueMicrotask(() => {
      const element = this.roomForm?.nativeElement.querySelector<HTMLElement>(
        'input.ng-invalid, textarea.ng-invalid, select.ng-invalid',
      );
      element?.focus();
    });
  }
}

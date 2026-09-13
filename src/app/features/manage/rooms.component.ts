import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ReferenceOption } from '../../core/models/api.models';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin, firstValueFrom } from 'rxjs';
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
  bed_configuration: '',
  bathroom_type: '',
  quantity: 1,
  base_price: '',
  currency: 'SZL',
  minimum_stay: 1,
  is_active: true,
};

type RoomPhoto = {
  key: number;
  file?: File;
  preview: string;
  image?: StayImage;
  roomId?: string;
  state: 'PREPARING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  error?: string;
};

@Component({
  standalone: true,
  selector: 'app-rooms',
  imports: [ReactiveFormsModule, RouterLink, SmartImageComponent],
  template: `<section class="rooms-surface">
    @if (!embedded) {
      <header class="standalone-header">
        <a routerLink="/account/manage/stays">Back</a>
        <h1>Room types</h1>
      </header>
    }
    <div class="rooms-heading">
      <div>
        <p class="eyebrow">Stay listing</p>
        <h2>Rooms</h2>
        <p class="lead">Add the room types guests can book at your stay.</p>
      </div>
      <aside class="tip-card">
        <strong>Tip</strong>
        <p>
          Add clear descriptions and accurate pricing. Each room type can have its own photos and
          availability.
        </p>
      </aside>
    </div>
    @if (loadError()) {
      <p class="error" role="alert">{{ loadError() }}</p>
    }
    @if (loading()) {
      <div class="room-layout" aria-label="Loading room types">
        <div class="panel skeleton-panel"><span></span><span></span><span></span></div>
        <div class="panel skeleton-panel"><span></span><span></span><span></span></div>
      </div>
    } @else {
      <div class="room-layout">
        <form
          #roomForm
          class="panel room-form"
          [formGroup]="form"
          (ngSubmit)="$event.stopPropagation(); save()"
          novalidate
        >
          <header class="panel-header form-header">
            <div>
              <h3>{{ editing() ? 'Edit room type' : 'Add new room type' }}</h3>
              <p>Fill in the details for this room type.</p>
            </div>
            @if (editing()) {
              <button type="button" class="text-action" [disabled]="busy()" (click)="cancel()">
                Cancel edit
              </button>
            }
          </header>
          @if (formError()) {
            <p class="error form-error" role="alert">{{ formError() }}</p>
          }
          @if (optionsError()) {
            <p class="error" role="alert">
              Could not load room options.
              <button type="button" (click)="loadOptions(true)">Retry</button>
            </p>
          }
          <fieldset>
            <legend>Basics</legend>
            <label
              >Room name *<input formControlName="name" aria-describedby="name-help" />
              <small id="name-help">A short, clear name such as Deluxe Room.</small>
              @if (showError('name')) {
                <small class="field-error">{{
                  fieldError('name', 'Room name is required.')
                }}</small>
              }
            </label>
            <label
              >Description *<textarea
                rows="3"
                formControlName="description"
                aria-describedby="description-help"
              ></textarea>
              <small id="description-help">Describe what guests can expect.</small>
              @if (showError('description')) {
                <small class="field-error">{{
                  fieldError('description', 'Add a room description.')
                }}</small>
              }
            </label>
          </fieldset>
          <fieldset #photoSection class="room-photos">
            <legend>Room photos</legend>
            <p>Add photos of this room type (JPG, PNG or WebP). Optional, recommended.</p>
            <label
              class="photo-drop"
              [class.dragging]="dragging()"
              (dragover)="$event.preventDefault(); dragging.set(true)"
              (dragleave)="dragging.set(false)"
              (drop)="dropPhotos($event)"
            >
              <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
              <strong>Drag &amp; drop photos here</strong><span>or click to browse</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                [disabled]="busy()"
                aria-label="Choose room photos"
                (change)="selectPhotos($any($event.target).files); $any($event.target).value = ''"
              />
            </label>
            @if (photoSummary()) {
              <p role="status">{{ photoSummary() }}</p>
            }
            <div class="photo-grid" aria-live="polite">
              @for (photo of photos(); track photo.key; let i = $index) {
                <article class="photo-preview">
                  <div class="photo-image">
                    <img [src]="photo.preview" alt="Room photo preview" />
                    @if (photo.state === 'UPLOADING') {
                      <span class="upload-overlay"
                        ><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i
                      ></span>
                    }
                  </div>
                  <strong>{{ photo.image?.is_cover ? 'Cover' : 'Room photo' }}</strong>
                  <span>{{
                    photo.state === 'PREPARING'
                      ? 'Preparing - ready to upload after saving'
                      : photo.state === 'UPLOADING'
                        ? 'Uploading...'
                        : photo.state === 'UPLOADED'
                          ? 'Uploaded'
                          : 'Upload failed'
                  }}</span>
                  @if (photo.state === 'UPLOADED') {
                    <i class="fa-solid fa-check" aria-hidden="true"></i>
                  }
                  @if (photo.error) {
                    <small class="error">{{ photo.error }}</small>
                  }
                  <div class="photo-actions">
                    @if (photo.state === 'FAILED' && photo.roomId) {
                      <button type="button" [disabled]="busy()" (click)="retryPhoto(photo)">
                        Retry
                      </button>
                    }
                    @if (photo.image && photo.roomId) {
                      <button
                        type="button"
                        [disabled]="busy() || photo.image.is_cover"
                        (click)="setCover(photo.roomId, photo.image.id)"
                      >
                        Set as cover
                      </button>
                      <button
                        type="button"
                        [disabled]="busy() || i === 0"
                        (click)="movePhoto(photo, -1)"
                      >
                        Move left
                      </button>
                      <button
                        type="button"
                        [disabled]="busy() || i === photos().length - 1"
                        (click)="movePhoto(photo, 1)"
                      >
                        Move right
                      </button>
                    }
                    <button type="button" [disabled]="busy()" (click)="removePhoto(photo)">
                      Delete
                    </button>
                  </div>
                </article>
              }
            </div>
          </fieldset>
          <fieldset [disabled]="optionsLoading() || optionsError()">
            <legend>Room details</legend>
            <div class="form-grid three">
              <label
                >Adults *<input type="number" min="1" formControlName="capacity_adults" />
                @if (showError('capacity_adults')) {
                  <small class="field-error">{{
                    fieldError('capacity_adults', 'At least 1 adult.')
                  }}</small>
                }
              </label>
              <label
                >Children<input type="number" min="0" formControlName="capacity_children"
              /></label>
              <label
                >Total capacity<input
                  type="number"
                  formControlName="total_capacity"
                  readonly
                  aria-describedby="capacity-help"
                />
                <small id="capacity-help">Adults plus children.</small>
                @if (showError('total_capacity')) {
                  <small class="field-error">{{
                    fieldError('total_capacity', 'Total capacity must cover all guests.')
                  }}</small>
                }
              </label>
            </div>
            <div class="form-grid two">
              <label
                >Beds *<input type="number" min="1" formControlName="number_of_beds" />
                @if (showError('number_of_beds')) {
                  <small class="field-error">{{
                    fieldError('number_of_beds', 'At least 1 bed.')
                  }}</small>
                }
              </label>
              <label
                >Bed configuration *<select formControlName="bed_configuration">
                  <option value="">
                    {{ optionsLoading() ? 'Loading options...' : 'Select an option' }}
                  </option>
                  @for (option of options('bed_configuration'); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select></label
              >
            </div>
            <label
              >Bathroom type *<select formControlName="bathroom_type">
                <option value="">
                  {{ optionsLoading() ? 'Loading options...' : 'Select an option' }}
                </option>
                @for (option of options('bathroom_type'); track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
              @if (showError('bathroom_type')) {
                <small class="field-error">{{
                  fieldError('bathroom_type', 'Add a bathroom type.')
                }}</small>
              }
            </label>
          </fieldset>
          <fieldset [disabled]="optionsLoading() || optionsError()">
            <legend>Inventory &amp; pricing</legend>
            <div class="form-grid two">
              <label
                >Quantity *<input
                  type="number"
                  min="1"
                  formControlName="quantity"
                  aria-describedby="quantity-help"
                />
                <small id="quantity-help">Number of rooms of this type.</small>
                @if (showError('quantity')) {
                  <small class="field-error">{{
                    fieldError('quantity', 'Quantity must be at least 1.')
                  }}</small>
                }
              </label>
              <label
                >Base nightly price *<input
                  type="number"
                  min="0.01"
                  step="0.01"
                  formControlName="base_price"
                />
                <small>In SZL.</small>
                @if (showError('base_price')) {
                  <small class="field-error">{{
                    fieldError('base_price', 'Price must be greater than 0.')
                  }}</small>
                }
              </label>
            </div>
            <div class="form-grid two">
              <label
                >Currency *<select formControlName="currency">
                  <option value="">
                    {{ optionsLoading() ? 'Loading options...' : 'Select an option' }}
                  </option>
                  @for (option of options('currency'); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select></label
              >
              <label
                >Minimum stay (nights) *<input
                  type="number"
                  min="1"
                  formControlName="minimum_stay"
                />
                <small>Minimum number of nights.</small>
                @if (showError('minimum_stay')) {
                  <small class="field-error">{{
                    fieldError('minimum_stay', 'Minimum stay must be at least 1 night.')
                  }}</small>
                }
              </label>
            </div>
          </fieldset>
          <fieldset class="status-fieldset">
            <legend>Availability</legend>
            <label class="toggle-label"
              ><input type="checkbox" formControlName="is_active" /><span>Active</span></label
            >
            <small>Make this room type available for booking.</small>
          </fieldset>
          <footer class="form-actions">
            <button type="button" class="secondary-action" [disabled]="busy()" (click)="cancel()">
              Cancel
            </button>
            <button
              type="submit"
              class="primary-action"
              [disabled]="busy() || optionsLoading() || optionsError()"
            >
              <i
                class="fa-solid"
                [class.fa-plus]="!editing()"
                [class.fa-check]="editing()"
                aria-hidden="true"
              ></i>
              {{
                busy()
                  ? editing()
                    ? 'Saving changes...'
                    : 'Adding room...'
                  : editing()
                    ? 'Save Changes'
                    : 'Add Room Type'
              }}
            </button>
          </footer>
        </form>
        <section class="panel room-list-panel" aria-labelledby="room-list-title">
          <header class="panel-header">
            <div>
              <h3 id="room-list-title">Room types ({{ rooms().length }})</h3>
              <p>Manage your room types. Click Edit to update details or photos.</p>
            </div>
            <button type="button" class="outline-action" (click)="startNew()">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Add room type
            </button>
          </header>
          <div class="room-list">
            @for (r of rooms(); track r.id) {
              <article class="room-card">
                <div class="room-card-image">
                  <sp-image [src]="cover(r)" [alt]="r.name" ratio="4 / 3" />
                </div>
                <div class="room-card-body">
                  <div class="room-card-title">
                    <div>
                      <h4>{{ r.name }}</h4>
                      <strong>{{ formatMoney(r.base_price, r.currency) }} / night</strong>
                    </div>
                    <span class="status-badge" [class.inactive]="!r.is_active">
                      {{ r.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <p class="room-facts">
                    {{ guestCount(r) }} &middot; {{ bedCount(r) }} &middot; {{ roomCount(r) }}
                  </p>
                  <p class="room-detail">
                    {{ bathroomLabel(r.bathroom_type) || 'Bathroom details not set' }}
                  </p>
                  <div class="room-actions">
                    <button type="button" [disabled]="busy()" (click)="edit(r)">Edit</button>

                    <button type="button" [disabled]="busy()" (click)="managePhotos(r)">
                      Manage photos
                    </button>
                    <a [routerLink]="['/account/manage/stays', stayId, 'calendar']">Availability</a>
                    <button type="button" [disabled]="busy()" (click)="deactivate(r)">
                      {{ r.is_active ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button type="button" (click)="deleteRoom(r)">Delete</button>
                  </div>
                </div>
              </article>
            } @empty {
              <div class="empty-state">
                <span class="empty-icon"><i class="fa-solid fa-bed" aria-hidden="true"></i></span>
                <h4>No room types yet.</h4>
                <p>Add the first room guests can book.</p>
                <button type="button" class="primary-action" (click)="startNew()">
                  Add room type
                </button>
              </div>
            }
          </div>
          @if (rooms().length) {
            <div class="next-card">
              <strong>What's next?</strong>
              <p>
                After adding your rooms, review your stay details before submitting for approval.
              </p>
            </div>
          }
        </section>
      </div>
    }
  </section>`,
  styles: [
    `
      .photo-drop {
        display: grid;
        place-items: center;
        gap: 0.6rem;
        padding: 1.8rem 1rem;
        border: 2px dashed #bfe2d9;
        border-radius: 0.8rem;
        margin: 0.8rem 0;
        cursor: pointer;
        background: #f8fcfb;
        text-align: center;
      }
      .photo-drop.dragging,
      .photo-drop:focus-within {
        border-color: var(--teal);
        background: #e5f6f1;
      }
      .photo-drop > i {
        font-size: 1.8rem;
        color: var(--teal);
      }
      .photo-drop input {
        max-width: 100%;
      }
      .photo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 0.8rem;
      }
      .photo-preview {
        display: grid;
        align-content: start;
        gap: 0.4rem;
        padding: 0.6rem;
        min-width: 0;
        border: 1px solid var(--line);
        border-radius: 0.6rem;
        font-size: 0.8rem;
      }
      .photo-image {
        position: relative;
      }
      .photo-image img {
        display: block;
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        border-radius: 0.4rem;
      }
      .upload-overlay {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: #102f4166;
        color: white;
        font-size: 1.5rem;
      }
      .photo-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
      }
      .photo-actions button {
        min-height: 34px;
        padding: 0.3rem;
        border: 1px solid var(--line);
        border-radius: 0.4rem;
        background: white;
        color: var(--midnight);
      }
      .room-form,
      .room-photos {
        scroll-margin-top: 90px;
      }
      select {
        width: 100%;
        min-width: 0;
        min-height: 42px;
        border: 1px solid var(--line);
        border-radius: 0.5rem;
        padding: 0.6rem;
        background: white;
        color: var(--midnight);
        font: inherit;
      }
      @media (prefers-reduced-motion: reduce) {
        .fa-spin {
          animation: none;
        }
      }
      @media (max-width: 600px) {
        .photo-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      .rooms-surface {
        display: grid;
        gap: 1rem;
      }
      .standalone-header,
      .panel-header,
      .form-actions {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: center;
      }
      .standalone-header a,
      .room-actions a {
        color: var(--slate);
        text-decoration: none;
      }
      .rooms-heading {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: start;
      }
      .eyebrow {
        margin: 0 0 0.25rem;
        color: var(--teal);
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h2,
      h3,
      h4,
      p {
        margin: 0;
      }
      .rooms-heading h2 {
        color: var(--midnight);
        font-size: 1.8rem;
      }
      .lead,
      .panel-header p,
      .room-detail,
      .next-card p,
      .tip-card p,
      .empty-state p,
      fieldset small {
        color: var(--slate);
      }
      .tip-card,
      .next-card {
        padding: 0.8rem 0.9rem;
        border: 1px solid #bfe2d9;
        border-radius: 0.7rem;
        background: #effaf7;
      }
      .tip-card {
        max-width: 350px;
        font-size: 0.82rem;
      }
      .tip-card strong,
      .next-card strong {
        color: var(--teal);
      }
      .room-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
      }
      .panel {
        min-width: 0;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 0.85rem;
        background: #fff;
      }
      .panel-header {
        margin-bottom: 0.9rem;
      }
      .panel-header h3 {
        color: var(--midnight);
        font-size: 1.05rem;
      }
      .panel-header p {
        margin-top: 0.18rem;
        font-size: 0.82rem;
      }
      .outline-action,
      .primary-action,
      .secondary-action,
      .text-action,
      .room-actions button,
      .room-actions a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        min-height: 38px;
        padding: 0.52rem 0.7rem;
        border: 1px solid var(--line);
        border-radius: 0.5rem;
        color: var(--midnight);
        background: #fff;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 850;
        text-decoration: none;
        cursor: pointer;
      }
      .outline-action,
      .primary-action {
        border-color: var(--teal);
      }
      .primary-action {
        color: #fff;
        background: var(--teal);
      }
      .secondary-action {
        color: var(--slate);
      }
      .text-action {
        border: 0;
        color: var(--teal);
        background: transparent;
      }
      .room-list {
        display: grid;
        gap: 0.7rem;
      }
      .room-card {
        display: grid;
        grid-template-columns: 112px minmax(0, 1fr);
        gap: 0.8rem;
        padding: 0.65rem;
        border: 1px solid var(--line);
        border-radius: 0.7rem;
        background: #fbfdfc;
      }
      .room-card-image {
        overflow: hidden;
        min-height: 112px;
        border-radius: 0.55rem;
        background: var(--mist);
      }
      .room-card-title {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        align-items: start;
      }
      .room-card-title h4 {
        color: var(--midnight);
        font-size: 0.98rem;
      }
      .room-card-title strong {
        display: block;
        margin-top: 0.18rem;
        color: var(--teal);
        font-size: 0.84rem;
      }
      .status-badge {
        flex: 0 0 auto;
        padding: 0.22rem 0.42rem;
        border-radius: 999px;
        color: #08735e;
        background: #dff5ee;
        font-size: 0.68rem;
        font-weight: 900;
      }
      .status-badge.inactive {
        color: var(--slate);
        background: #edf0ef;
      }
      .room-facts {
        margin-top: 0.4rem;
        color: var(--midnight);
        font-size: 0.78rem;
        font-weight: 750;
      }
      .room-detail {
        margin-top: 0.25rem;
        font-size: 0.76rem;
      }
      .room-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.55rem;
      }
      .room-actions button,
      .room-actions a {
        min-height: 30px;
        padding: 0.28rem 0.45rem;
        font-size: 0.7rem;
      }
      .empty-state {
        display: grid;
        place-items: center;
        gap: 0.35rem;
        padding: 1.5rem 0.8rem;
        text-align: center;
      }
      .empty-icon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        color: var(--teal);
        background: #e5f6f1;
      }
      .empty-state h4 {
        color: var(--midnight);
      }
      .next-card {
        margin-top: 0.9rem;
        font-size: 0.78rem;
      }
      .next-card p {
        margin-top: 0.2rem;
      }
      .room-form {
        display: grid;
        gap: 0.9rem;
      }
      .form-header {
        margin-bottom: 0;
      }
      .room-form fieldset {
        grid-template-columns: minmax(0, 1fr);
        display: grid;
        gap: 0.65rem;
        min-width: 0;
        padding: 0;
        border: 0;
      }
      legend {
        margin-bottom: 0.1rem;
        color: var(--midnight);
        font-size: 0.84rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      label {
        display: grid;
        gap: 0.28rem;
        color: var(--midnight);
        font-size: 0.78rem;
        font-weight: 800;
      }
      .form-grid {
        display: grid;
        gap: 0.65rem;
      }
      .form-grid.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .form-grid.three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      input,
      textarea {
        width: 100%;
        min-height: 40px;
        padding: 0.58rem 0.65rem;
        border: 1px solid var(--line);
        border-radius: 0.5rem;
        color: var(--midnight);
        background: #fff;
        font: inherit;
      }
      textarea {
        resize: vertical;
      }
      input[readonly] {
        color: var(--slate);
        background: var(--mist);
      }
      label small {
        color: var(--slate);
        font-size: 0.7rem;
        font-weight: 600;
      }
      .field-error,
      .error {
        color: #9b2525 !important;
      }
      .form-error {
        margin: -0.25rem 0;
      }
      .status-fieldset {
        padding-top: 0.1rem;
      }
      .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
      }
      .toggle-label input {
        width: 18px;
        min-height: 18px;
      }
      .form-actions {
        justify-content: end;
        padding-top: 0.2rem;
        border-top: 1px solid var(--line);
      }
      .ng-invalid.ng-touched {
        border-color: #c94d4d;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .skeleton-panel {
        display: grid;
        gap: 0.8rem;
      }
      .skeleton-panel span {
        display: block;
        height: 70px;
        border-radius: 0.55rem;
        background: var(--mist);
      }
      @media (max-width: 900px) {
        .room-layout {
          grid-template-columns: 1fr;
        }
        .room-list-panel {
          order: initial;
        }
        .room-form {
          order: initial;
        }
      }
      @media (max-width: 600px) {
        .rooms-heading {
          display: grid;
        }
        .tip-card {
          max-width: none;
        }
        .panel-header {
          align-items: start;
          flex-direction: column;
        }
        .form-grid.two,
        .form-grid.three {
          grid-template-columns: 1fr;
        }
        .room-card {
          grid-template-columns: 84px minmax(0, 1fr);
        }
        .room-card-image {
          min-height: 84px;
        }
        .room-card-title {
          display: grid;
        }
        .form-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class RoomsComponent implements OnInit, OnDestroy {
  @Input() embedded = false;
  @Output() pendingChange = new EventEmitter<boolean>();
  @Output() roomsChanged = new EventEmitter<RoomTypeSummary[]>();
  private stayApi = inject(StayManagementApiService);
  private roomApi = inject(RoomManagementApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  readonly reference = inject(ReferenceApiService);
  optionsLoading = signal(true);
  optionsError = signal(false);
  photos = signal<RoomPhoto[]>([]);
  photoSummary = signal('');
  dragging = signal(false);
  private photoKey = 0;
  @ViewChild('photoSection', { read: ElementRef }) photoSection?: ElementRef<HTMLElement>;
  @Input() stayId = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';
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
    description: ['', Validators.required],
    capacity_adults: [2, [Validators.required, Validators.min(1)]],
    capacity_children: [0, [Validators.required, Validators.min(0)]],
    total_capacity: [2, [Validators.required, Validators.min(1)]],
    number_of_beds: [1, [Validators.required, Validators.min(1)]],
    bed_configuration: ['', Validators.required],
    bathroom_type: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    base_price: ['', [Validators.required, Validators.min(0)]],
    currency: ['SZL', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    minimum_stay: [1, [Validators.required, Validators.min(1)]],
    is_active: [true],
  });
  readonly formatMoney = formatMoney;

  constructor() {
    effect(() => this.pendingChange.emit(this.busy()));
    this.form.controls.capacity_adults.valueChanges.subscribe(() => this.updateTotalCapacity());
    this.form.controls.capacity_children.valueChanges.subscribe(() => this.updateTotalCapacity());
  }

  ngOnInit() {
    this.load();
    this.loadOptions();
  }
  ngOnDestroy() {
    this.pendingChange.emit(false);
    this.clearPhotos();
  }

  loadOptions(retry = false) {
    this.optionsLoading.set(true);
    this.optionsError.set(false);
    (retry ? this.reference.refresh() : this.reference.load())
      .pipe(finalize(() => this.optionsLoading.set(false)))
      .subscribe({
        next: (data) =>
          this.optionsError.set(
            !data.bed_configurations?.length ||
              !data.bathroom_types?.length ||
              !data.currencies?.length,
          ),
        error: () => this.optionsError.set(true),
      });
  }

  options(field: 'bed_configuration' | 'bathroom_type' | 'currency'): ReferenceOption[] {
    const data = this.reference.data();
    const options =
      field === 'bed_configuration'
        ? data.bed_configurations || []
        : field === 'bathroom_type'
          ? data.bathroom_types || []
          : data.currencies || [];
    const current = this.editing()?.[field];
    return current && !options.some((option) => option.value === current)
      ? [...options, { value: current, label: `${current} (saved value)` }]
      : options;
  }

  bathroomLabel(value: string) {
    return (
      this.reference.data().bathroom_types?.find((option) => option.value === value)?.label || value
    );
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
        next: (rooms) => {
          this.rooms.set(rooms);
          const edited = rooms.find((room) => room.id === this.editing()?.id);
          if (edited) {
            this.editing.set(edited);
            const pending = this.photos().filter((photo) => photo.state !== 'UPLOADED');
            for (const photo of this.photos())
              if (photo.state === 'UPLOADED' && photo.file) URL.revokeObjectURL(photo.preview);
            this.photos.set([
              ...this.orderedImages(edited).map((image) => ({
                key: ++this.photoKey,
                image,
                roomId: edited.id,
                preview: image.image,
                state: 'UPLOADED' as const,
              })),
              ...pending,
            ]);
          }
          this.roomsChanged.emit(rooms);
        },
        error: (error) => {
          const normalized = normalizeApiError(error);
          this.loadError.set(normalized.message || 'Rooms could not be loaded.');
        },
      });
  }

  cover(room: RoomTypeSummary) {
    return (
      this.orderedImages(room).find((img) => img.is_cover)?.image ||
      this.orderedImages(room)[0]?.image ||
      null
    );
  }

  orderedImages(room: RoomTypeSummary) {
    return [...room.images].sort((a, b) => a.sort_order - b.sort_order);
  }

  guestCount(room: RoomTypeSummary) {
    const guests = room.total_capacity;
    return `${guests} guest${guests === 1 ? '' : 's'}`;
  }

  bedCount(room: RoomTypeSummary) {
    return `${room.number_of_beds} bed${room.number_of_beds === 1 ? '' : 's'}`;
  }

  roomCount(room: RoomTypeSummary) {
    return `${room.quantity} room${room.quantity === 1 ? '' : 's'}`;
  }

  private scrollTo(element?: HTMLElement) {
    element?.scrollIntoView?.({
      behavior:
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      block: 'start',
    });
  }

  focusForm() {
    this.scrollTo(this.roomForm?.nativeElement);
    this.roomForm?.nativeElement
      .querySelector<HTMLElement>('input[formControlName="name"]')
      ?.focus();
  }

  startNew() {
    if (!this.busy()) {
      this.cancel();
      this.focusForm();
    }
  }

  edit(room: RoomTypeSummary, focus = true) {
    if (this.busy()) return;
    this.clearPhotos();
    this.photos.set(
      this.orderedImages(room).map((image) => ({
        key: ++this.photoKey,
        image,
        roomId: room.id,
        preview: image.image,
        state: 'UPLOADED',
      })),
    );
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
    if (focus) this.focusForm();
  }

  managePhotos(room: RoomTypeSummary) {
    if (this.busy()) return;
    this.edit(room, false);
    this.scrollTo(this.photoSection?.nativeElement);
    this.photoSection?.nativeElement
      .querySelector<HTMLInputElement>('input[type="file"]')
      ?.focus({ preventScroll: true });
  }

  cancel() {
    this.clearPhotos();
    this.editing.set(null);
    this.formError.set('');
    this.fieldErrors.set({});
    this.form.reset(defaultRoom);
  }

  async save() {
    if (this.busy() || this.optionsLoading() || this.optionsError()) return;

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
    const payload = this.payload();
    const request = editing
      ? this.roomApi.update(editing.id, payload)
      : this.stayApi.createRoom(this.stayId, payload);

    try {
      const saved = await firstValueFrom(request);
      const room = { ...saved, images: saved.images || editing?.images || [] };
      this.replaceRoom(room);
      this.editing.set(room);
      for (const photo of this.photos().filter((photo) => photo.file && photo.state !== 'UPLOADED'))
        await this.uploadPhoto(photo, room.id);
      const failed = this.photos().filter((photo) => photo.state === 'FAILED').length;
      if (failed) {
        const uploaded = this.photos().filter((photo) => photo.state === 'UPLOADED').length;
        this.photoSummary.set(
          `Room type ${editing ? 'updated' : 'added'}. ${uploaded} of ${this.photos().length} photos uploaded. ${failed} failed.`,
        );
        this.toast.show('Room saved. Some photos need retrying.', 'warning');
      } else {
        this.cancel();
        this.toast.show(editing ? 'Room type updated.' : 'Room type added.', 'success');
      }
    } catch (error) {
      this.handleSaveError(error);
    } finally {
      this.busy.set(false);
    }
  }

  private replaceRoom(room: RoomTypeSummary) {
    if (this.editing()?.id === room.id) this.editing.set(room);
    this.rooms.update((rooms) =>
      rooms.some((item) => item.id === room.id)
        ? rooms.map((item) => (item.id === room.id ? room : item))
        : [...rooms, room],
    );
    this.roomsChanged.emit(this.rooms());
  }

  deactivate(room: RoomTypeSummary) {
    if (this.busy() || !confirm(`${room.is_active ? 'Deactivate' : 'Activate'} this room type?`))
      return;

    this.busy.set(true);
    this.roomApi
      .update(room.id, { is_active: !room.is_active })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.replaceRoom({ ...updated, images: updated.images || room.images });
          this.toast.show(updated.is_active ? 'Room activated.' : 'Room deactivated.', 'success');
        },
        error: () => this.toast.show('Could not deactivate room.', 'error'),
      });
  }

  deleteRoom(room: RoomTypeSummary) {
    if (this.busy() || !confirm(`Delete ${room.name}? This cannot be undone.`)) return;

    this.busy.set(true);
    this.roomApi
      .delete(room.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.rooms.update((rooms) => rooms.filter((item) => item.id !== room.id));
          this.roomsChanged.emit(this.rooms());
          this.toast.show('Room type deleted.', 'success');
        },
        error: (error) => this.handleSaveError(error),
      });
  }

  selectPhotos(files: FileList | File[] | null) {
    if (!files || this.busy()) return;
    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        this.photoSummary.set('Unsupported image type. Choose JPG, PNG or WebP.');
        continue;
      }
      this.photos.update((photos) => [
        ...photos,
        { key: ++this.photoKey, file, preview: URL.createObjectURL(file), state: 'PREPARING' },
      ]);
    }
  }

  dropPhotos(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    this.selectPhotos(event.dataTransfer?.files || null);
  }

  private clearPhotos() {
    for (const photo of this.photos()) if (photo.file) URL.revokeObjectURL(photo.preview);
    this.photos.set([]);
    this.photoSummary.set('');
  }

  private async uploadPhoto(photo: RoomPhoto, roomId: string) {
    if (!photo.file) return;
    this.photos.update((photos) =>
      photos.map((item) =>
        item.key === photo.key ? { ...item, roomId, state: 'UPLOADING', error: undefined } : item,
      ),
    );
    const room = this.rooms().find((room) => room.id === roomId)!;
    const data = new FormData();
    data.set('image', photo.file);
    data.set(
      'sort_order',
      String(Math.max(-1, ...room.images.map((image) => image.sort_order)) + 1),
    );
    data.set('is_cover', String(!room.images.some((image) => image.is_cover)));
    try {
      const image = await firstValueFrom(this.roomApi.uploadImage(roomId, data));
      this.replaceRoom({ ...room, images: [...room.images, image] });
      this.photos.update((photos) =>
        photos.map((item) =>
          item.key === photo.key ? { ...item, roomId, image, state: 'UPLOADED' } : item,
        ),
      );
    } catch (error) {
      const message =
        (error as HttpErrorResponse).status === 413
          ? 'Image is too large.'
          : normalizeApiError(error).message;
      this.photos.update((photos) =>
        photos.map((item) =>
          item.key === photo.key ? { ...item, roomId, state: 'FAILED', error: message } : item,
        ),
      );
    }
  }

  async retryPhoto(photo: RoomPhoto) {
    if (this.busy() || !photo.roomId) return;
    this.busy.set(true);
    await this.uploadPhoto(photo, photo.roomId);
    this.busy.set(false);
    this.photoSummary.set(
      this.photos().some((item) => item.state === 'FAILED')
        ? 'Some photos still need retrying.'
        : 'All room photos uploaded.',
    );
  }

  removePhoto(photo: RoomPhoto) {
    if (photo.image && photo.roomId) {
      this.deleteImage(photo.roomId, photo.image.id);
      return;
    }
    if (photo.file) URL.revokeObjectURL(photo.preview);
    this.photos.update((photos) => photos.filter((item) => item.key !== photo.key));
  }

  movePhoto(photo: RoomPhoto, direction: -1 | 1) {
    const room = this.rooms().find((room) => room.id === photo.roomId);
    if (room && photo.image) this.moveImage(room, photo.image, direction);
  }

  moveImage(room: RoomTypeSummary, image: StayImage, direction: -1 | 1) {
    const images = this.orderedImages(room);
    const index = images.findIndex((img) => img.id === image.id);
    const target = images[index + direction];
    if (this.busy() || index < 0 || !target) return;

    this.busy.set(true);
    [images[index], images[index + direction]] = [images[index + direction], images[index]];
    forkJoin(
      images.map((item, sort_order) => this.roomApi.updateImage(room.id, item.id, { sort_order })),
    )
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.load(),
        error: () => this.toast.show('Photo order could not be saved.', 'error'),
      });
  }

  setCover(roomId: string, imageId: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.roomApi
      .updateImage(roomId, imageId, { is_cover: true })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.load(),
        error: () => this.toast.show('Cover photo could not be saved.', 'error'),
      });
  }

  deleteImage(roomId: string, imageId: string) {
    if (this.busy() || !confirm('Delete this room photo?')) return;
    this.busy.set(true);
    this.roomApi
      .deleteImage(roomId, imageId)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
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
    this.updateTotalCapacity();
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

  private updateTotalCapacity() {
    const adults = Number(this.form.controls.capacity_adults.value) || 0;
    const children = Number(this.form.controls.capacity_children.value) || 0;
    this.form.controls.total_capacity.setValue(Math.max(adults + children, 0), {
      emitEvent: false,
    });
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
    const message =
      error instanceof HttpErrorResponse && error.status === 403
        ? "You don't have permission to manage rooms for this stay."
        : error instanceof HttpErrorResponse && error.status === 409
          ? normalized.message || 'This room change conflicts with the current stay state.'
          : Object.keys(fields).length
            ? 'Please fix the highlighted fields.'
            : normalized.message || 'The request could not be completed.';
    this.formError.set(message);
    this.toast.show(message, 'error');
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

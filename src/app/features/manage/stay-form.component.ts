import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, finalize, forkJoin } from 'rxjs';
import { StayManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ManagedStay, StayWriteRequest } from '../../core/models/manage.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { LocationPickerComponent } from './location-picker.component';
import { ManageStatusComponent, QualityScoreComponent } from './manage-ui';

type SaveState = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SmartImageComponent,
    LocationPickerComponent,
    ManageStatusComponent,
    QualityScoreComponent,
  ],
  template: `<main class="wizard-page">
    <section class="wizard-card">
      @if (!submitted()) {
        <div class="wizard-top">
          <div class="wizard-nav">
            <button type="button" (click)="back()">
              <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
              Back
            </button>
            <strong>Step {{ step() + 1 }} of {{ steps.length }}</strong>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" [style.width.%]="progress()"></div>
          </div>
          <div class="step-tabs" aria-label="Stay listing steps">
            @for (item of steps; track item.key; let i = $index) {
              <button type="button" [class.active]="step() === i" (click)="go(i)">
                {{ item.label }}
              </button>
            }
          </div>
          <p class="save-status" aria-live="polite">{{ saveLabel() }}</p>
        </div>
      }

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (submitted()) {
        <section class="success-panel">
          <span class="success-icon"><i class="fa-solid fa-check" aria-hidden="true"></i></span>
          <h1>Listing Submitted!</h1>
          <p>Your listing is now under review. We'll notify you once there's an update.</p>
          <div class="success-actions">
            <a class="primary-cta" routerLink="/account/manage/stays">Go to My Listings</a>
            <a class="secondary" routerLink="/account/manage/listings/new">Add Another Listing</a>
            @if (stay()?.slug) {
              <a class="ghost-link" [routerLink]="['/stays', stay()!.slug]">View Listing</a>
            }
          </div>
        </section>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <section class="wizard-body">
            @switch (current().key) {
              @case ('basic') {
                <div class="step-panel">
                  <div>
                    <p class="eyebrow">Stay</p>
                    <h1>Basic Information</h1>
                    <p class="step-copy">Let's start with the essentials.</p>
                  </div>
                  <div class="form-grid">
                    <label class="field">
                      <span>Stay name *</span>
                      <input formControlName="name" maxlength="255" autocomplete="off" />
                      @if (showError('name')) {
                        <small class="field-error">Add a stay name.</small>
                      }
                    </label>
                    <label class="field">
                      <span>Stay type *</span>
                      <select formControlName="stay_type">
                        @for (type of ref.data().stay_types; track type.value) {
                          <option [value]="type.value">{{ type.label }}</option>
                        }
                      </select>
                    </label>
                    <label class="field">
                      <span>Short description *</span>
                      <textarea rows="5" maxlength="1200" formControlName="description"></textarea>
                      <small class="counter"
                        >{{ form.controls.description.value.length }}/1200</small
                      >
                      @if (showError('description')) {
                        <small class="field-error">Tell guests what to expect.</small>
                      }
                    </label>
                  </div>
                </div>
              }
              @case ('location') {
                <div class="step-panel">
                  <div>
                    <h1>Location</h1>
                    <p class="step-copy">Help guests find your stay.</p>
                  </div>
                  <div class="form-grid">
                    <div class="pair">
                      <label class="field">
                        <span>Region *</span>
                        <select formControlName="region">
                          <option value="">Choose region</option>
                          @for (region of ref.data().regions; track region.value) {
                            <option [value]="region.label">{{ region.label }}</option>
                          }
                        </select>
                        @if (showError('region')) {
                          <small class="field-error">Choose a region.</small>
                        }
                      </label>
                      <label class="field">
                        <span>Town or area *</span>
                        <input formControlName="town" list="stay-towns" />
                        <datalist id="stay-towns">
                          @for (town of towns(); track town) {
                            <option [value]="town"></option>
                          }
                        </datalist>
                        @if (showError('town')) {
                          <small class="field-error">Add a town or area.</small>
                        }
                      </label>
                    </div>
                    <div class="pair">
                      <label class="field">
                        <span>Suburb or locality</span>
                        <input formControlName="suburb" />
                      </label>
                      <label class="field">
                        <span>Address</span>
                        <input formControlName="address" />
                      </label>
                    </div>
                    <div class="map-wrap">
                      <sp-location-picker
                        [latitude]="coordinate('latitude')"
                        [longitude]="coordinate('longitude')"
                        (locationChange)="setLocation($event)"
                      />
                    </div>
                    <p class="hint">Place the pin as accurately as you're comfortable with.</p>
                    <div class="pair">
                      <label class="field">
                        <span>Latitude *</span>
                        <input type="number" step="0.000001" formControlName="latitude" />
                      </label>
                      <label class="field">
                        <span>Longitude *</span>
                        <input type="number" step="0.000001" formControlName="longitude" />
                      </label>
                    </div>
                  </div>
                </div>
              }
              @case ('details') {
                <div class="step-panel">
                  <div>
                    <h1>Details</h1>
                    <p class="step-copy">Add contact basics guests may need before booking.</p>
                  </div>
                  <div class="form-grid">
                    <div class="pair">
                      <label class="field">
                        <span>Phone</span>
                        <input formControlName="phone" autocomplete="tel" />
                      </label>
                      <label class="field">
                        <span>Email</span>
                        <input type="email" formControlName="email" autocomplete="email" />
                      </label>
                    </div>
                    <div class="pair">
                      <label class="field">
                        <span>WhatsApp</span>
                        <input formControlName="whatsapp_number" autocomplete="tel" />
                      </label>
                      <label class="field">
                        <span>Website</span>
                        <input formControlName="website" autocomplete="url" />
                      </label>
                    </div>
                  </div>
                </div>
              }
              @case ('photos') {
                <div class="step-panel">
                  <div>
                    <h1>Photos</h1>
                    <p class="step-copy">Add high-quality photos to showcase your stay.</p>
                  </div>
                  <label class="upload-zone" (drop)="drop($event)" (dragover)="allowDrop($event)">
                    <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
                    <strong>Drag and drop photos here</strong>
                    <span>or click to browse</span>
                    <small>JPG, PNG or WebP</small>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      (change)="upload($any($event.target).files)"
                    />
                  </label>
                  @if (!stay()) {
                    <p class="hint">
                      Complete basic information first so SurePlace can create a draft for photos.
                    </p>
                  }
                  <div class="photos">
                    @for (img of orderedImages(); track img.id; let i = $index) {
                      <figure>
                        @if (img.is_cover) {
                          <span class="cover-badge">Cover photo</span>
                        }
                        <sp-image
                          [src]="img.image"
                          [alt]="img.caption || form.controls.name.value || 'Stay photo'"
                          ratio="4 / 3"
                        />
                        <div class="photo-actions">
                          <button
                            type="button"
                            [disabled]="i === 0 || busy()"
                            (click)="moveImage(img.id, -1)"
                          >
                            <i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
                          </button>
                          <button
                            type="button"
                            [disabled]="i === orderedImages().length - 1 || busy()"
                            (click)="moveImage(img.id, 1)"
                          >
                            <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
                          </button>
                          <button
                            type="button"
                            [disabled]="img.is_cover || busy()"
                            (click)="setCover(img.id)"
                          >
                            Cover
                          </button>
                          <button type="button" [disabled]="busy()" (click)="deleteImage(img.id)">
                            <i class="fa-solid fa-trash" aria-hidden="true"></i>
                          </button>
                        </div>
                      </figure>
                    }
                  </div>
                </div>
              }
              @case ('amenities') {
                <div class="step-panel">
                  <div>
                    <h1>Amenities</h1>
                    <p class="step-copy">Select what's available.</p>
                  </div>
                  <div class="amenity-grid">
                    @for (amenity of ref.data().stay_amenities || []; track amenity.id) {
                      <label class="check-card">
                        <input
                          type="checkbox"
                          [checked]="hasAmenity(amenity.id)"
                          (change)="toggleAmenity(amenity.id, $any($event.target).checked)"
                        />
                        <span
                          ><i [class]="amenityIcon(amenity.name)" aria-hidden="true"></i>
                          {{ amenity.name }}</span
                        >
                      </label>
                    }
                  </div>
                </div>
              }
              @case ('policies') {
                <div class="step-panel">
                  <div>
                    <h1>Policies</h1>
                    <p class="step-copy">Set the stay-level timing guests should know.</p>
                  </div>
                  <div class="pair">
                    <label class="field">
                      <span>Check-in time</span>
                      <input type="time" formControlName="check_in_time" />
                    </label>
                    <label class="field">
                      <span>Check-out time</span>
                      <input type="time" formControlName="check_out_time" />
                    </label>
                  </div>
                  <p class="hint">
                    Room prices, inventory and minimum stay rules are managed in Rooms.
                  </p>
                </div>
              }
              @case ('rooms') {
                <div class="step-panel">
                  <div>
                    <h1>Rooms</h1>
                    <p class="step-copy">Add the room options guests can book.</p>
                  </div>
                  @if (stay()) {
                    <a
                      class="room-link"
                      [routerLink]="['/account/manage/stays', stay()!.id, 'rooms']"
                    >
                      Manage Rooms
                      <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    </a>
                    <p class="hint">
                      Your room setup opens in the existing room management workflow, so inventory
                      and booking rules stay consistent.
                    </p>
                  } @else {
                    <p class="hint">Save the draft first, then add room types.</p>
                  }
                </div>
              }
              @case ('review') {
                <div class="step-panel">
                  <div>
                    <h1>Review Your Listing</h1>
                    <p class="step-copy">Make sure everything looks good.</p>
                  </div>
                  @if (reviewWarnings().length) {
                    <div class="error-summary" tabindex="-1">
                      <strong>{{ reviewWarnings().length }} items still need attention</strong>
                      @for (warning of reviewWarnings(); track warning.message) {
                        <button type="button" (click)="go(warning.step)">
                          {{ warning.message }}
                        </button>
                      }
                    </div>
                  }
                  <article class="preview-card">
                    <sp-image
                      [src]="coverImage()"
                      [alt]="form.controls.name.value || 'Stay preview'"
                      ratio="4 / 3"
                    />
                    <div>
                      <h3>{{ form.controls.name.value || 'Untitled stay' }}</h3>
                      <p>
                        {{ form.controls.suburb.value ? form.controls.suburb.value + ', ' : ''
                        }}{{ form.controls.town.value || 'Location pending' }}
                      </p>
                      <strong>{{ stayTypeLabel() }}</strong>
                      @if (stay()) {
                        <sp-manage-status [status]="stay()!.status" />
                      }
                    </div>
                  </article>
                  <div class="review-grid">
                    @for (block of reviewBlocks(); track block.title) {
                      <article class="review-block">
                        <header>
                          <strong>{{ block.title }}</strong>
                          <button class="review-edit" type="button" (click)="go(block.step)">
                            Edit
                          </button>
                        </header>
                        <p>{{ block.text }}</p>
                      </article>
                    }
                  </div>
                  @if (stay()?.quality; as quality) {
                    <sp-quality-score [score]="quality.score" [suggestions]="quality.suggestions" />
                  }
                </div>
              }
              @case ('submit') {
                <div class="submit-panel">
                  <span class="step-icon"
                    ><i class="fa-solid fa-shield-halved" aria-hidden="true"></i
                  ></span>
                  <h1>Almost there!</h1>
                  <p class="step-copy">
                    Submit your listing for review. We'll check it to make sure it meets SurePlace's
                    quality and safety standards.
                  </p>
                  <label class="confirm">
                    <input type="checkbox" formControlName="confirmed" />
                    <span>I confirm that the information provided is accurate.</span>
                  </label>
                  @if (showError('confirmed')) {
                    <small class="field-error">Confirm before submitting.</small>
                  }
                </div>
              }
            }
          </section>

          <footer class="wizard-actions">
            <button
              type="button"
              class="secondary"
              [disabled]="step() === 0 || busy()"
              (click)="back()"
            >
              Back
            </button>
            @if (current().key === 'submit') {
              <button type="submit" class="primary" [disabled]="busy() || submitting()">
                {{ submitting() ? 'Submitting...' : 'Submit Listing' }}
              </button>
            } @else {
              <button type="button" class="primary" [disabled]="busy()" (click)="continue()">
                {{ current().key === 'review' ? 'Review Submission' : 'Continue' }}
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </button>
            }
          </footer>
        </form>
      }
    </section>
  </main>`,
  styleUrl: './listing-wizard.scss',
})
export class StayFormComponent {
  private api = inject(StayManagementApiService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  ref = inject(ReferenceApiService);
  id = this.route.snapshot.paramMap.get('id');
  steps = [
    { key: 'basic', label: 'Basic' },
    { key: 'location', label: 'Location' },
    { key: 'details', label: 'Details' },
    { key: 'photos', label: 'Photos' },
    { key: 'amenities', label: 'Amenities' },
    { key: 'policies', label: 'Policies' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'review', label: 'Review' },
    { key: 'submit', label: 'Submit' },
  ] as const;
  step = signal(0);
  busy = signal(false);
  submitting = signal(false);
  submitted = signal(false);
  error = signal('');
  dirty = signal(false);
  saveState = signal<SaveState>('idle');
  stay = signal<ManagedStay | null>(null);
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required, Validators.maxLength(1200)]],
    stay_type: ['HOTEL'],
    region: ['', Validators.required],
    town: ['', Validators.required],
    suburb: [''],
    address: [''],
    latitude: ['', Validators.required],
    longitude: ['', Validators.required],
    phone: [''],
    email: [''],
    whatsapp_number: [''],
    website: [''],
    check_in_time: [''],
    check_out_time: [''],
    amenities: [[] as string[]],
    confirmed: [false, Validators.requiredTrue],
  });
  current = computed(() => this.steps[this.step()]);
  progress = computed(() => ((this.step() + 1) / this.steps.length) * 100);
  towns = computed(() => this.ref.data().regions.flatMap((region) => region.areas || []));

  constructor() {
    this.form.valueChanges.pipe(debounceTime(900)).subscribe(() => {
      this.dirty.set(true);
      this.saveState.set(this.stay() ? 'unsaved' : 'idle');
      if (this.stay() && !this.busy() && !this.submitting()) this.saveDraft(true);
    });
    if (this.id) this.load();
  }

  saveLabel() {
    if (this.saveState() === 'saving') return 'Draft - Saving...';
    if (this.saveState() === 'saved') return 'Draft - Saved';
    if (this.saveState() === 'error') return 'Draft - Save failed';
    if (this.stay()) return 'Draft - Unsaved changes';
    return 'Not saved yet';
  }

  continue() {
    if (!this.validateStep(this.step())) return;
    if (this.step() === 0 || this.stay()) this.saveDraft(true);
    this.step.set(Math.min(this.step() + 1, this.steps.length - 1));
  }

  back() {
    if (this.step() > 0) {
      this.step.set(this.step() - 1);
      return;
    }
    void this.router.navigate(['/account/manage/listings/new']);
  }

  go(index: number) {
    this.step.set(index);
  }

  hasAmenity(id: string) {
    return this.form.controls.amenities.value.includes(id);
  }

  toggleAmenity(id: string, on: boolean) {
    const amenities = this.form.controls.amenities.value;
    this.form.controls.amenities.setValue(
      on ? [...amenities, id] : amenities.filter((item) => item !== id),
    );
  }

  coordinate(control: 'latitude' | 'longitude') {
    const value = Number(this.form.controls[control].value);
    return Number.isFinite(value) ? value : null;
  }

  setLocation(point: { latitude: number; longitude: number }) {
    this.form.patchValue({
      latitude: point.latitude.toFixed(6),
      longitude: point.longitude.toFixed(6),
    });
  }

  orderedImages() {
    return [...(this.stay()?.images || [])].sort((a, b) => a.sort_order - b.sort_order);
  }

  coverImage() {
    const images = this.orderedImages();
    return images.find((image) => image.is_cover)?.image || images[0]?.image || null;
  }

  upload(files: FileList | null) {
    const id = this.stay()?.id;
    if (!id || !files?.length) {
      this.error.set('Save the draft before uploading photos.');
      return;
    }
    this.busy.set(true);
    Array.from(files).forEach((file) => {
      const data = new FormData();
      data.set('image', file);
      this.api
        .uploadImage(id, data)
        .pipe(finalize(() => this.busy.set(false)))
        .subscribe({
          next: () => this.refresh(),
          error: () => this.error.set('Photo upload failed.'),
        });
    });
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  drop(event: DragEvent) {
    event.preventDefault();
    this.upload(event.dataTransfer?.files || null);
  }

  moveImage(imageId: string, direction: -1 | 1) {
    const id = this.stay()?.id;
    const images = this.orderedImages();
    const index = images.findIndex((img) => img.id === imageId);
    const target = images[index + direction];
    if (!id || index < 0 || !target) return;
    const current = images[index];
    this.busy.set(true);
    forkJoin([
      this.api.updateImage(id, current.id, { sort_order: target.sort_order }),
      this.api.updateImage(id, target.id, { sort_order: current.sort_order }),
    ])
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.refresh(),
        error: () => this.error.set('Photo order could not be saved.'),
      });
  }

  setCover(imageId: string) {
    const id = this.stay()?.id;
    if (!id) return;
    this.api.updateImage(id, imageId, { is_cover: true }).subscribe(() => this.refresh());
  }

  deleteImage(imageId: string) {
    const id = this.stay()?.id;
    if (id && confirm('Delete this photo?'))
      this.api.deleteImage(id, imageId).subscribe(() => this.refresh());
  }

  submit() {
    if (this.submitting()) return;
    if (!this.validateAll()) return;
    this.saveDraft(false, () => {
      const id = this.stay()?.id;
      if (!id) return;
      this.submitting.set(true);
      this.api
        .submit(id)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (stay) => {
            this.stay.set(stay);
            this.submitted.set(true);
          },
          error: (e) => this.error.set(e?.error?.message || 'Stay could not be submitted.'),
        });
    });
  }

  reviewWarnings() {
    const warnings: { message: string; step: number }[] = [];
    if (!this.validateGroup(['name', 'description']))
      warnings.push({ message: 'Complete basic information', step: 0 });
    if (!this.validateGroup(['region', 'town', 'latitude', 'longitude']))
      warnings.push({ message: 'Select a location', step: 1 });
    if (!this.orderedImages().length) warnings.push({ message: 'Add at least one photo', step: 3 });
    if (!this.form.controls.phone.value && !this.form.controls.email.value)
      warnings.push({ message: 'Add contact information', step: 2 });
    if (this.stay() && !this.stay()!.room_types.some((room) => room.is_active))
      warnings.push({ message: 'Add a room type', step: 6 });
    return warnings;
  }

  reviewBlocks() {
    const v = this.form.getRawValue();
    return [
      {
        title: 'Basic information',
        step: 0,
        text: `${this.stayTypeLabel()} - ${v.description || 'No description yet'}`,
      },
      {
        title: 'Location',
        step: 1,
        text: `${v.suburb ? `${v.suburb}, ` : ''}${v.town || 'Town pending'}, ${v.region || 'Region pending'}`,
      },
      {
        title: 'Contact',
        step: 2,
        text: v.phone || v.email || v.whatsapp_number || 'Contact pending',
      },
      {
        title: 'Photos',
        step: 3,
        text: `${this.orderedImages().length} photo${this.orderedImages().length === 1 ? '' : 's'}`,
      },
      { title: 'Amenities', step: 4, text: `${v.amenities.length} selected` },
      {
        title: 'Policies',
        step: 5,
        text: `Check-in ${v.check_in_time || 'not set'}, check-out ${v.check_out_time || 'not set'}`,
      },
      {
        title: 'Rooms',
        step: 6,
        text: `${this.stay()?.room_types.length || 0} room type${this.stay()?.room_types.length === 1 ? '' : 's'}`,
      },
    ];
  }

  stayTypeLabel() {
    const match = this.ref
      .data()
      .stay_types.find((type) => type.value === this.form.controls.stay_type.value);
    return match?.label || this.form.controls.stay_type.value;
  }

  showError(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  amenityIcon(name: string) {
    const text = name.toLowerCase();
    if (text.includes('parking')) return 'fa-solid fa-square-parking';
    if (text.includes('pool')) return 'fa-solid fa-water-ladder';
    if (text.includes('wifi') || text.includes('wi-fi')) return 'fa-solid fa-wifi';
    if (text.includes('kitchen')) return 'fa-solid fa-kitchen-set';
    if (text.includes('tv')) return 'fa-solid fa-tv';
    if (text.includes('security')) return 'fa-solid fa-shield-halved';
    return 'fa-solid fa-circle-check';
  }

  private validateStep(index: number) {
    const controls =
      index === 0
        ? ['name', 'stay_type', 'description']
        : index === 1
          ? ['region', 'town', 'latitude', 'longitude']
          : [];
    for (const name of controls) this.form.get(name)?.markAsTouched();
    const valid = controls.every((name) => this.form.get(name)?.valid);
    if (!valid) this.error.set('Complete the required fields before continuing.');
    else this.error.set('');
    return valid;
  }

  private validateAll() {
    for (let index = 0; index <= 1; index += 1) if (!this.validateStep(index)) return false;
    this.form.controls.confirmed.markAsTouched();
    if (!this.form.controls.confirmed.valid) {
      this.error.set('Confirm the listing details before submitting.');
      return false;
    }
    return true;
  }

  private load() {
    this.api.detail(this.id!).subscribe((stay) => {
      this.stay.set(stay);
      this.form.patchValue(
        {
          name: stay.name,
          description: stay.description,
          stay_type: stay.stay_type,
          region: stay.region,
          town: stay.town,
          suburb: stay.suburb,
          address: stay.address,
          latitude: String(stay.latitude ?? ''),
          longitude: String(stay.longitude ?? ''),
          phone: stay.phone,
          email: stay.email,
          whatsapp_number: stay.whatsapp_number,
          website: stay.website,
          check_in_time: stay.check_in_time || '',
          check_out_time: stay.check_out_time || '',
          amenities: stay.amenities.map((a) => a.id),
        },
        { emitEvent: false },
      );
      this.step.set(this.firstIncompleteStep());
      this.dirty.set(false);
      this.saveState.set('saved');
    });
  }

  private saveDraft(silent = false, after?: () => void) {
    if (this.busy()) return;
    if (!this.canCreateDraft()) {
      after?.();
      return;
    }
    this.busy.set(true);
    this.saveState.set('saving');
    const request =
      this.id || this.stay()
        ? this.api.update(this.id || this.stay()!.id, this.payload())
        : this.api.create(this.payload());
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (stay) => {
        const created = !this.id;
        this.stay.set(stay);
        this.dirty.set(false);
        this.saveState.set('saved');
        if (created) {
          this.id = stay.id;
          void this.router.navigate(['/account/manage/stays', stay.id, 'edit'], {
            replaceUrl: true,
          });
        }
        after?.();
      },
      error: (e) => {
        this.saveState.set('error');
        if (!silent) this.error.set(e?.error?.message || 'Stay could not be saved.');
      },
    });
  }

  private canCreateDraft() {
    return this.form.controls.name.valid && this.form.controls.stay_type.valid;
  }

  private refresh() {
    const id = this.stay()?.id || this.id;
    if (id) this.api.detail(id).subscribe((stay) => this.stay.set(stay));
  }

  private firstIncompleteStep() {
    if (!this.validateGroup(['name', 'description'])) return 0;
    if (!this.validateGroup(['region', 'town', 'latitude', 'longitude'])) return 1;
    if (!this.orderedImages().length) return 3;
    if (!this.form.controls.phone.value && !this.form.controls.email.value) return 2;
    if (this.stay() && !this.stay()!.room_types.some((room) => room.is_active)) return 6;
    return 7;
  }

  private validateGroup(names: string[]) {
    return names.every((name) => this.form.get(name)?.valid);
  }

  private payload(): StayWriteRequest {
    const v = this.form.getRawValue();
    return {
      name: v.name,
      description: v.description,
      stay_type: v.stay_type,
      region: v.region,
      town: v.town,
      suburb: v.suburb,
      address: v.address,
      latitude: v.latitude ? Number(v.latitude) : undefined,
      longitude: v.longitude ? Number(v.longitude) : undefined,
      phone: v.phone,
      email: v.email,
      whatsapp_number: v.whatsapp_number,
      website: v.website,
      check_in_time: v.check_in_time || null,
      check_out_time: v.check_out_time || null,
      amenities: v.amenities,
    };
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty() && this.saveState() !== 'saved') event.preventDefault();
  }
}

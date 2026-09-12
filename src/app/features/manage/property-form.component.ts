import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, firstValueFrom } from 'rxjs';
import { PropertyManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import {
  ManagedProperty,
  PropertyImage,
  PropertyWriteRequest,
} from '../../core/models/manage.models';
import { ToastService } from '../../core/services/toast.service';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { LocationPickerComponent } from './location-picker.component';
import { ManageStatusComponent, QualityScoreComponent } from './manage-ui';

type SaveState = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';
type PendingImageStatus = 'pending' | 'uploading' | 'failed';
type StepDirection = 'forward' | 'back';
type PendingImage = {
  localId: string;
  file: File;
  previewUrl: string;
  status: PendingImageStatus;
  error?: string;
};
type PhotoItem =
  | {
      token: string;
      kind: 'persisted';
      id: string;
      src: string;
      caption: string;
      status: 'uploaded';
      isCover: boolean;
    }
  | {
      token: string;
      kind: 'pending';
      id: string;
      src: string;
      caption: string;
      status: PendingImageStatus;
      error?: string;
      isCover: boolean;
    };

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
            <button type="button" (click)="exitWizard()">
              <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
              Exit listing
            </button>
            <strong>Step {{ step() + 1 }} of {{ steps.length }}</strong>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" [style.width.%]="progress()"></div>
          </div>
          <div class="step-tabs" aria-label="Property listing steps">
            @for (item of steps; track item.key; let i = $index) {
              <button
                type="button"
                [class.active]="step() === i"
                [disabled]="submitStepDisabled(i)"
                (click)="go(i)"
              >
                {{ item.label }}
              </button>
            }
          </div>
          <div class="save-status" [class.error]="saveState() === 'error'" aria-live="polite">
            <span>{{ saveLabel() }}</span>
            @if (saveState() === 'error') {
              <button type="button" (click)="retrySave()">Retry</button>
            }
          </div>
        </div>
      }

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (submitted()) {
        <section class="success-panel">
          <span class="success-icon"><i class="fa-solid fa-check" aria-hidden="true"></i></span>
          <h1>Listing submitted!</h1>
          <p>
            Your listing is now pending SurePlace review. We'll notify you when it is approved or if
            changes are needed.
          </p>
          <div class="success-actions">
            <a class="primary-cta" routerLink="/account/manage/properties">Go to My Properties</a>
            <a class="secondary" routerLink="/account/manage/properties/new"
              >Add Another Property</a
            >
            @if (listing()?.slug) {
              <a class="ghost-link" [routerLink]="['/properties', listing()!.slug]"
                >Preview Listing</a
              >
            }
          </div>
        </section>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <section class="wizard-body" [class.back]="stepDirection() === 'back'">
            @switch (current().key) {
              @case ('basic') {
                <div class="step-panel">
                  <div>
                    <p class="eyebrow">Property</p>
                    <h1>List a Property</h1>
                    <p class="step-copy">Let's start with the essentials.</p>
                  </div>
                  <div class="form-grid">
                    <label class="field">
                      <span>Title *</span>
                      <input formControlName="title" maxlength="255" autocomplete="off" />
                      @if (showError('title')) {
                        <small class="field-error">Add a clear listing title.</small>
                      }
                    </label>
                    <div class="pair">
                      <label class="field">
                        <span>Listing purpose *</span>
                        <select formControlName="listing_type">
                          <option value="RENT">Rent</option>
                          <option value="SALE">Sale</option>
                        </select>
                      </label>
                      <label class="field">
                        <span>Property type *</span>
                        <select formControlName="property_type">
                          @for (type of ref.data().property_types; track type.value) {
                            <option [value]="type.value">{{ type.label }}</option>
                          }
                        </select>
                      </label>
                    </div>
                    <label class="field">
                      <span>Short description *</span>
                      <textarea rows="5" maxlength="1200" formControlName="description"></textarea>
                      <small class="counter"
                        >{{ form.controls.description.value.length }}/1200</small
                      >
                      @if (showError('description')) {
                        <small class="field-error"
                          >Tell seekers what makes this property useful.</small
                        >
                      }
                    </label>
                  </div>
                </div>
              }
              @case ('location') {
                <div class="step-panel">
                  <div>
                    <h1>Location</h1>
                    <p class="step-copy">
                      Choose the property's area, then place the pin as accurately as possible.
                    </p>
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
                        <span>Town *</span>
                        <select formControlName="town">
                          <option value="">Choose town</option>
                          @for (town of towns(); track town) {
                            <option [value]="town">{{ town }}</option>
                          }
                        </select>
                        @if (showError('town')) {
                          <small class="field-error">Choose a town or area.</small>
                        }
                      </label>
                    </div>
                    <div class="pair">
                      <label class="field">
                        <span>Area / Suburb</span>
                        <input formControlName="suburb" />
                      </label>
                      <label class="field">
                        <span>Address</span>
                        <input formControlName="address" />
                      </label>
                    </div>
                    <div class="location-tools">
                      <button type="button" [disabled]="locating()" (click)="useCurrentLocation()">
                        <i
                          class="fa-solid"
                          [class.fa-spinner]="locating()"
                          [class.fa-spin]="locating()"
                          [class.fa-location-arrow]="!locating()"
                          aria-hidden="true"
                        ></i>
                        {{ locating() ? 'Locating you...' : 'Use my current location' }}
                      </button>
                      <small>Use your current location if you're at the property.</small>
                    </div>
                    @if (locationStatus()) {
                      <p class="location-message success" aria-live="polite">
                        <i class="fa-solid fa-check" aria-hidden="true"></i>
                        {{ locationStatus() }}
                      </p>
                    }
                    @if (locationError()) {
                      <p class="location-message error" aria-live="polite">
                        {{ locationError() }}
                      </p>
                    }
                    <div class="map-wrap">
                      <sp-location-picker
                        [latitude]="coordinate('latitude')"
                        [longitude]="coordinate('longitude')"
                        (locationChange)="setLocation($event)"
                      />
                    </div>
                    <p class="hint">
                      Click the map or drag the pin to the property's exact location. We use this to
                      place the property on the map. Public display follows SurePlace's location
                      privacy rules.
                    </p>
                    @if (coordinate('latitude') !== null && coordinate('longitude') !== null) {
                      <button class="clear-location" type="button" (click)="clearLocation()">
                        Clear map location
                      </button>
                    }
                    <details class="advanced-location">
                      <summary>Advanced location details</summary>
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
                    </details>
                  </div>
                </div>
              }
              @case ('details') {
                <div class="step-panel">
                  <div>
                    <h1>Details</h1>
                    <p class="step-copy">Add the information people compare first.</p>
                  </div>
                  <div class="form-grid">
                    <div class="pair">
                      <label class="field">
                        <span>Price *</span>
                        <input type="number" min="0" formControlName="price" />
                        @if (showError('price')) {
                          <small class="field-error">Enter a valid price.</small>
                        }
                      </label>
                      <label class="field">
                        <span>Currency</span>
                        <select formControlName="currency">
                          @for (currency of ref.data().currencies; track currency.value) {
                            <option [value]="currency.value">{{ currency.label }}</option>
                          }
                        </select>
                      </label>
                    </div>
                    @if (showResidentialDetails()) {
                      <div class="pair">
                        <label class="field">
                          <span>Bedrooms</span>
                          <input type="number" min="0" formControlName="bedrooms" />
                        </label>
                        <label class="field">
                          <span>Bathrooms</span>
                          <input type="number" min="0" formControlName="bathrooms" />
                        </label>
                      </div>
                    }
                    <div class="pair">
                      <label class="field">
                        <span>Parking spaces</span>
                        <input type="number" min="0" formControlName="parking_spaces" />
                      </label>
                      <label class="field">
                        <span>{{
                          form.controls.listing_type.value === 'RENT'
                            ? 'Floor area'
                            : 'Building size'
                        }}</span>
                        <input type="number" min="0" formControlName="floor_area" />
                      </label>
                    </div>
                    <label class="field">
                      <span>Land area</span>
                      <input type="number" min="0" formControlName="land_area" />
                    </label>
                    <div class="amenity-grid">
                      <label class="check-card">
                        <input type="checkbox" formControlName="furnished" />
                        <span class="card-icon">
                          <i
                            [class]="
                              form.controls.furnished.value
                                ? 'fa-solid fa-check'
                                : 'fa-solid fa-couch'
                            "
                            aria-hidden="true"
                          ></i>
                        </span>
                        <span>Furnished</span>
                      </label>
                      <label class="check-card">
                        <input type="checkbox" formControlName="pet_friendly" />
                        <span class="card-icon">
                          <i
                            [class]="
                              form.controls.pet_friendly.value
                                ? 'fa-solid fa-check'
                                : 'fa-solid fa-paw'
                            "
                            aria-hidden="true"
                          ></i>
                        </span>
                        <span>Pet friendly</span>
                      </label>
                    </div>
                  </div>
                </div>
              }
              @case ('photos') {
                <div class="step-panel">
                  <div>
                    <h1>Photos</h1>
                    <p class="step-copy">Add high-quality photos to showcase your listing.</p>
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
                  @if (!listing()) {
                    <p class="hint">
                      SurePlace will create the draft first, then upload these photos in order.
                    </p>
                  }
                  @if (uploadProgress()) {
                    <p class="hint" aria-live="polite">{{ uploadProgress() }}</p>
                  }
                  @if (failedImageCount()) {
                    <button
                      type="button"
                      class="retry-upload"
                      [disabled]="busy()"
                      (click)="retryFailedUploads()"
                    >
                      Retry failed upload
                    </button>
                  }
                  <div class="photos">
                    @for (img of photoItems(); track img.token; let i = $index) {
                      <figure>
                        @if (img.isCover) {
                          <span class="cover-badge" aria-label="Current cover image">
                            <i class="fa-solid fa-check" aria-hidden="true"></i>
                            {{ img.kind === 'pending' ? 'Default cover' : 'Cover photo' }}
                          </span>
                        }
                        <sp-image
                          [src]="img.src"
                          [alt]="img.caption || form.controls.title.value || 'Property photo'"
                          ratio="4 / 3"
                        />
                        @if (img.status !== 'uploaded') {
                          <figcaption [class.failed]="img.status === 'failed'">
                            {{
                              img.status === 'uploading'
                                ? 'Uploading...'
                                : img.status === 'failed'
                                  ? img.error || 'Upload failed'
                                  : 'Ready to upload'
                            }}
                          </figcaption>
                        } @else {
                          <figcaption class="uploaded">
                            <i class="fa-solid fa-check" aria-hidden="true"></i>
                            Uploaded
                          </figcaption>
                        }
                        <div class="photo-actions">
                          <span class="drag-handle" aria-hidden="true">
                            <i class="fa-solid fa-grip-lines" aria-hidden="true"></i>
                          </span>
                          <div class="reorder-fallback" aria-label="Photo reorder controls">
                            <button
                              type="button"
                              [disabled]="i === 0 || busy()"
                              [attr.aria-label]="'Move image ' + (i + 1) + ' left'"
                              (click)="movePhoto(img.token, -1)"
                            >
                              <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                            </button>
                            <button
                              type="button"
                              [disabled]="i === photoItems().length - 1 || busy()"
                              [attr.aria-label]="'Move image ' + (i + 1) + ' right'"
                              (click)="movePhoto(img.token, 1)"
                            >
                              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                            </button>
                          </div>
                          @if (img.kind === 'persisted' && !img.isCover) {
                            <button
                              type="button"
                              class="cover-action"
                              [disabled]="busy()"
                              [attr.aria-label]="'Set image ' + (i + 1) + ' as cover'"
                              (click)="setCover(img.token)"
                            >
                              Set as cover
                            </button>
                          } @else {
                            <span class="cover-action current">
                              {{ img.isCover ? 'Cover' : 'Queued' }}
                            </span>
                          }
                          <button type="button" [disabled]="busy()" (click)="deletePhoto(img)">
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
                    @for (amenity of ref.data().property_amenities; track amenity.id) {
                      <label class="check-card">
                        <input
                          type="checkbox"
                          [checked]="hasAmenity(amenity.id)"
                          (change)="toggleAmenity(amenity.id, $any($event.target).checked)"
                        />
                        <span class="card-icon">
                          <i
                            [class]="
                              hasAmenity(amenity.id)
                                ? 'fa-solid fa-check'
                                : amenityIcon(amenity.name)
                            "
                            aria-hidden="true"
                          ></i>
                        </span>
                        <span>{{ amenity.name }}</span>
                      </label>
                    }
                  </div>
                </div>
              }
              @case ('review') {
                <div class="step-panel">
                  <div>
                    <h1>
                      {{
                        isPublishedListing() ? 'Editing published property' : 'Review Your Listing'
                      }}
                    </h1>
                    <p class="step-copy">
                      {{
                        isPublishedListing()
                          ? 'Your property is live. Save only the updates you intend to publish.'
                          : 'Make sure everything looks good.'
                      }}
                    </p>
                  </div>
                  @if (reviewLoading()) {
                    <div class="review-loading" aria-live="polite">
                      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                      Loading your listing...
                    </div>
                  }
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
                      [alt]="form.controls.title.value || 'Property preview'"
                      ratio="4 / 3"
                    />
                    <div>
                      <h3>{{ form.controls.title.value || 'Untitled property' }}</h3>
                      <p>
                        {{ form.controls.suburb.value ? form.controls.suburb.value + ', ' : ''
                        }}{{ form.controls.town.value || 'Location pending' }}
                      </p>
                      <strong
                        >{{ form.controls.currency.value }} {{ form.controls.price.value || '0'
                        }}{{
                          form.controls.listing_type.value === 'RENT' ? ' / month' : ''
                        }}</strong
                      >
                      <div class="preview-facts" aria-label="Listing facts">
                        @for (fact of reviewFacts(); track fact.label) {
                          <span>
                            <i [class]="fact.icon" aria-hidden="true"></i>
                            {{ fact.label }}
                          </span>
                        }
                      </div>
                      @if (listing()) {
                        <sp-manage-status [status]="listing()!.status" />
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
                  @if (listing()?.quality; as quality) {
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
                    Your property will be submitted to SurePlace for review before it becomes
                    publicly visible.
                  </p>
                  <ul class="submit-checks">
                    <li>
                      <i class="fa-solid fa-check" aria-hidden="true"></i> Complete information
                    </li>
                    <li><i class="fa-solid fa-check" aria-hidden="true"></i> Appropriate images</li>
                    <li>
                      <i class="fa-solid fa-check" aria-hidden="true"></i> Valid location details
                    </li>
                    <li>
                      <i class="fa-solid fa-check" aria-hidden="true"></i> Marketplace quality and
                      safety
                    </li>
                  </ul>
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
                @if (submitting()) {
                  <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                  Submitting listing...
                } @else {
                  Submit Listing
                }
              </button>
            } @else {
              <button type="button" class="primary" [disabled]="busy()" (click)="continue()">
                @if (busy()) {
                  <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                  {{ current().key === 'photos' ? 'Uploading...' : 'Saving...' }}
                } @else {
                  {{
                    current().key === 'review'
                      ? isPublishedListing()
                        ? 'Finish editing'
                        : 'Continue to submission'
                      : 'Continue'
                  }}
                }
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
export class PropertyFormComponent implements OnDestroy {
  private api = inject(PropertyManagementApiService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  ref = inject(ReferenceApiService);
  id = this.route.snapshot.paramMap.get('id');
  steps = [
    { key: 'basic', label: 'Basic' },
    { key: 'location', label: 'Location' },
    { key: 'details', label: 'Details' },
    { key: 'photos', label: 'Photos' },
    { key: 'amenities', label: 'Amenities' },
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
  reviewLoading = signal(false);
  stepDirection = signal<StepDirection>('forward');
  listing = signal<ManagedProperty | null>(null);
  pendingImages = signal<PendingImage[]>([]);
  photoOrder = signal<string[]>([]);
  uploadProgress = signal('');
  locating = signal(false);
  locationStatus = signal('');
  locationError = signal('');
  selectedRegionValue = signal('');
  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required, Validators.maxLength(1200)]],
    listing_type: ['RENT'],
    property_type: ['HOUSE'],
    price: ['', Validators.required],
    currency: ['SZL'],
    region: ['', Validators.required],
    town: ['', Validators.required],
    suburb: [''],
    address: [''],
    latitude: ['', Validators.required],
    longitude: ['', Validators.required],
    bedrooms: [''],
    bathrooms: [''],
    parking_spaces: ['0'],
    floor_area: [''],
    land_area: [''],
    furnished: [false],
    pet_friendly: [false],
    amenities: [[] as string[]],
    confirmed: [false, Validators.requiredTrue],
  });
  current = computed(() => this.steps[this.step()]);
  progress = computed(() => ((this.step() + 1) / this.steps.length) * 100);
  selectedRegion = computed(() => {
    const value = this.selectedRegionValue();
    return (
      this.ref.data().regions.find((region) => region.label === value || region.value === value) ||
      null
    );
  });
  towns = computed(
    () =>
      this.selectedRegion()?.areas ||
      this.ref.data().regions.flatMap((region) => region.areas || []),
  );
  failedImageCount = computed(
    () => this.pendingImages().filter((image) => image.status === 'failed').length,
  );
  photoItems = computed(() => {
    const persisted = new Map<string, PhotoItem>(
      this.orderedPersistedImages().map((image) => [
        this.persistedToken(image.id),
        {
          token: this.persistedToken(image.id),
          kind: 'persisted' as const,
          id: image.id,
          src: image.image,
          caption: image.caption,
          status: 'uploaded' as const,
          isCover: image.is_cover,
        },
      ]),
    );
    const pending = new Map<string, PhotoItem>(
      this.pendingImages().map((image) => [
        this.pendingToken(image.localId),
        {
          token: this.pendingToken(image.localId),
          kind: 'pending' as const,
          id: image.localId,
          src: image.previewUrl,
          caption: image.file.name,
          status: image.status,
          error: image.error,
          isCover: false,
        },
      ]),
    );
    const items = this.photoOrder()
      .map((token) => persisted.get(token) || pending.get(token))
      .filter((item) => item !== undefined);
    const seen = new Set(items.map((item) => item.token));
    for (const item of [...persisted.values(), ...pending.values()]) {
      if (!seen.has(item.token)) items.push(item);
    }
    if (!items.some((item) => item.isCover) && items[0]?.kind === 'pending') {
      return items.map((item, index) => ({ ...item, isCover: index === 0 }));
    }
    return items;
  });
  persistedPhotoItems = computed(() =>
    this.photoItems().filter((item) => item.kind === 'persisted'),
  );

  constructor() {
    this.form.controls.region.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.selectedRegionValue.set(this.form.controls.region.value);
      this.form.patchValue({ town: '', suburb: '' }, { emitEvent: false });
    });
    this.form.controls.town.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.form.patchValue({ suburb: '' }, { emitEvent: false });
    });
    this.form.valueChanges.pipe(debounceTime(900)).subscribe(() => {
      this.dirty.set(true);
      this.saveState.set(this.listing() ? 'unsaved' : 'idle');
      if (this.listing() && !this.busy() && !this.submitting()) this.saveDraft(true);
    });
    if (this.id) this.load();
  }

  ngOnDestroy() {
    for (const image of this.pendingImages()) URL.revokeObjectURL(image.previewUrl);
  }

  showResidentialDetails() {
    return !['LAND', 'OFFICE', 'SHOP', 'WAREHOUSE', 'COMMERCIAL'].includes(
      this.form.controls.property_type.value,
    );
  }

  saveLabel() {
    if (this.saveState() === 'saving') return 'Saving...';
    if (this.saveState() === 'saved')
      return this.isPublishedListing() ? 'Published changes saved' : 'Draft saved';
    if (this.saveState() === 'error') return "Couldn't save";
    if (this.listing()) return 'Unsaved changes';
    return 'Not saved yet';
  }

  retrySave() {
    void this.persistDraft(false);
  }

  async continue() {
    if (!this.validateStep(this.step())) return;
    if (this.step() === 2 || this.listing()) {
      const saved = await this.persistDraft(true);
      if (!saved && this.canCreateDraft()) return;
    }
    if (this.current().key === 'photos' && !(await this.uploadQueuedImages())) return;
    if (this.current().key === 'review' && this.isPublishedListing()) {
      void this.router.navigate(['/account/manage/properties']);
      return;
    }
    const next = Math.min(this.step() + 1, this.steps.length - 1);
    await this.moveToStep(next, 'forward');
  }

  back() {
    if (this.step() > 0) {
      void this.moveToStep(this.step() - 1, 'back');
      return;
    }
    this.exitWizard();
  }

  go(index: number) {
    if (this.submitStepDisabled(index)) return;
    void this.moveToStep(index, index >= this.step() ? 'forward' : 'back');
  }

  submitStepDisabled(index: number) {
    return this.isPublishedListing() && this.steps[index]?.key === 'submit';
  }

  isPublishedListing() {
    return this.listing()?.status === 'PUBLISHED';
  }

  exitWizard() {
    const hasUnsavedChanges =
      this.dirty() || this.saveState() === 'unsaved' || this.saveState() === 'error';
    const hasQueuedPhotos = this.pendingImages().length > 0;
    if (isPlatformBrowser(this.platformId) && (hasUnsavedChanges || hasQueuedPhotos)) {
      const leave = confirm('Leave this listing? Unsaved changes or queued photos may be lost.');
      if (!leave) return;
    }
    void this.router.navigate(['/account/manage/listings/new']);
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
    const raw = this.form.controls[control].value;
    if (raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  setLocation(point: { latitude: number; longitude: number }) {
    this.form.patchValue({
      latitude: point.latitude.toFixed(6),
      longitude: point.longitude.toFixed(6),
    });
    this.locationError.set('');
    this.locationStatus.set('Location set. Drag the pin if you need to adjust it.');
  }

  useCurrentLocation() {
    if (this.locating()) return;
    if (!isPlatformBrowser(this.platformId) || !('geolocation' in navigator)) {
      this.locationStatus.set('');
      this.locationError.set(
        "We couldn't access your location. You can place the pin manually instead.",
      );
      return;
    }
    this.locating.set(true);
    this.locationStatus.set('');
    this.locationError.set('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        this.setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        this.locationStatus.set('Location detected. Drag the pin if you need to adjust it.');
      },
      () => {
        this.locating.set(false);
        this.locationStatus.set('');
        this.locationError.set(
          "We couldn't access your location. You can place the pin manually instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  clearLocation() {
    this.form.patchValue({ latitude: '', longitude: '' });
    this.locationStatus.set('');
    this.locationError.set('');
  }

  private orderedPersistedImages() {
    return [...(this.listing()?.images || [])].sort((a, b) => a.sort_order - b.sort_order);
  }

  coverImage() {
    const images = this.persistedPhotoItems();
    return images.find((image) => image.isCover)?.src || images[0]?.src || null;
  }

  upload(files: FileList | null) {
    if (!files?.length) return;
    const images = Array.from(files).map((file) => ({
      localId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending' as const,
    }));
    this.pendingImages.update((current) => [...current, ...images]);
    this.photoOrder.update((order) => [
      ...order,
      ...images.map((image) => this.pendingToken(image.localId)),
    ]);
    this.error.set('');
    this.uploadProgress.set(
      `${images.length} photo${images.length === 1 ? '' : 's'} ready to upload.`,
    );
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  drop(event: DragEvent) {
    event.preventDefault();
    this.upload(event.dataTransfer?.files || null);
  }

  async retryFailedUploads() {
    this.error.set('');
    this.uploadProgress.set('Retrying failed uploads...');
    this.pendingImages.update((images) =>
      images.map((image) =>
        image.status === 'failed' ? { ...image, status: 'pending', error: undefined } : image,
      ),
    );
    await this.uploadQueuedImages();
  }

  movePhoto(token: string, direction: -1 | 1) {
    const order = this.currentPhotoOrder();
    const index = order.indexOf(token);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    this.photoOrder.set(order);
    if (!this.pendingImages().length) void this.persistPhotoOrder();
  }

  setCover(token: string) {
    const id = this.listing()?.id;
    const image = this.photoItems().find((item) => item.token === token);
    if (!id || !image || image.kind !== 'persisted' || image.isCover) return;
    this.busy.set(true);
    this.api
      .updateImage(id, image.id, { is_cover: true })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.listing.update((property) =>
            property
              ? {
                  ...property,
                  images: property.images.map((item) => ({
                    ...item,
                    is_cover: item.id === image.id,
                  })),
                }
              : property,
          );
          this.toast.show('Cover image updated.', 'success');
          this.refresh();
        },
        error: () => {
          this.error.set('Cover photo could not be saved.');
          this.toast.show('Cover photo could not be saved.', 'error');
        },
      });
  }

  deletePhoto(image: PhotoItem) {
    if (image.kind === 'pending') {
      const pending = this.pendingImages().find((item) => item.localId === image.id);
      if (pending) URL.revokeObjectURL(pending.previewUrl);
      this.pendingImages.update((items) => items.filter((item) => item.localId !== image.id));
      this.photoOrder.update((order) => order.filter((token) => token !== image.token));
      return;
    }
    const id = this.listing()?.id;
    if (id && confirm('Delete this photo?')) {
      this.busy.set(true);
      this.api
        .deleteImage(id, image.id)
        .pipe(finalize(() => this.busy.set(false)))
        .subscribe({
          next: () => this.refresh(),
          error: () => this.error.set('Photo could not be deleted.'),
        });
    }
  }

  async submit() {
    if (this.submitting()) return;
    if (!this.validateAll()) return;
    const saved = await this.persistDraft(false);
    if (!saved) return;
    if (!(await this.uploadQueuedImages())) return;
    const id = this.listing()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.api
      .submit(id)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (property) => {
          this.listing.set(property);
          this.syncPhotoOrder(property);
          this.submitted.set(true);
        },
        error: (e) =>
          this.error.set(
            e?.error?.detail || e?.error?.message || 'Property could not be submitted.',
          ),
      });
  }

  reviewWarnings() {
    const warnings: { message: string; step: number }[] = [];
    if (!this.validateGroup(['title', 'description']))
      warnings.push({ message: 'Complete basic information', step: 0 });
    if (
      !this.form.controls.region.valid ||
      !this.form.controls.town.valid ||
      !this.form.controls.latitude.valid ||
      !this.form.controls.longitude.valid
    )
      warnings.push({ message: 'Select a location', step: 1 });
    if (!this.form.controls.price.valid) warnings.push({ message: 'Enter a valid price', step: 2 });
    if (!this.persistedPhotoItems().length)
      warnings.push({ message: 'No photos have been uploaded.', step: 3 });
    return warnings;
  }

  reviewBlocks() {
    const v = this.form.getRawValue();
    return [
      {
        title: 'Basic information',
        step: 0,
        text: `${v.listing_type} ${v.property_type} - ${v.description || 'No description yet'}`,
      },
      {
        title: 'Location',
        step: 1,
        text: `${v.suburb ? `${v.suburb}, ` : ''}${v.town || 'Town pending'}, ${v.region || 'Region pending'}`,
      },
      {
        title: 'Details',
        step: 2,
        text: `${v.currency} ${v.price || '0'}${v.listing_type === 'RENT' ? ' per month' : ''}`,
      },
      {
        title: 'Photos',
        step: 3,
        text: `${this.persistedPhotoItems().length} uploaded photo${this.persistedPhotoItems().length === 1 ? '' : 's'}`,
      },
      { title: 'Amenities', step: 4, text: `${v.amenities.length} selected` },
    ];
  }

  reviewFacts() {
    const v = this.form.getRawValue();
    const facts = [
      { value: v.property_type, icon: 'fa-solid fa-house' },
      { value: this.roomLabel(Number(v.bedrooms), 'bed'), icon: 'fa-solid fa-bed' },
      { value: this.roomLabel(Number(v.bathrooms), 'bath'), icon: 'fa-solid fa-bath' },
      { value: this.roomLabel(Number(v.parking_spaces), 'parking'), icon: 'fa-solid fa-car' },
    ];
    return facts.filter((fact) => fact.value).map((fact) => ({ ...fact, label: fact.value! }));
  }

  showError(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  amenityIcon(name: string) {
    const text = name.toLowerCase();
    if (text.includes('parking')) return 'fa-solid fa-square-parking';
    if (text.includes('security')) return 'fa-solid fa-shield-halved';
    if (text.includes('garden')) return 'fa-solid fa-seedling';
    if (text.includes('pool')) return 'fa-solid fa-water-ladder';
    if (text.includes('wifi') || text.includes('wi-fi')) return 'fa-solid fa-wifi';
    return 'fa-solid fa-circle-check';
  }

  private validateStep(index: number) {
    const controls =
      index === 0
        ? ['title', 'listing_type', 'property_type', 'description']
        : index === 1
          ? ['region', 'town', 'latitude', 'longitude']
          : index === 2
            ? ['price', 'currency']
            : [];
    for (const name of controls) this.form.get(name)?.markAsTouched();
    const valid = controls.every((name) => this.form.get(name)?.valid);
    if (!valid) this.error.set('Complete the required fields before continuing.');
    else this.error.set('');
    return valid;
  }

  private validateAll() {
    for (let index = 0; index <= 2; index += 1) if (!this.validateStep(index)) return false;
    this.form.controls.confirmed.markAsTouched();
    if (!this.form.controls.confirmed.valid) {
      this.error.set('Confirm the listing details before submitting.');
      return false;
    }
    return true;
  }

  private load() {
    this.api.detail(this.id!).subscribe((property) => {
      this.listing.set(property);
      this.syncPhotoOrder(property);
      this.form.patchValue(
        {
          title: property.title,
          description: property.description,
          listing_type: property.listing_type,
          property_type: property.property_type,
          price: property.price,
          currency: property.currency,
          region: property.region,
          town: property.town,
          suburb: property.suburb,
          address: property.address,
          latitude: String(property.latitude ?? ''),
          longitude: String(property.longitude ?? ''),
          bedrooms: String(property.bedrooms ?? ''),
          bathrooms: String(property.bathrooms ?? ''),
          parking_spaces: String(property.parking_spaces ?? 0),
          floor_area: String(property.floor_area ?? ''),
          land_area: String(property.land_area ?? ''),
          furnished: property.furnished,
          pet_friendly: property.pet_friendly,
          amenities: property.amenities.map((a) => a.id),
        },
        { emitEvent: false },
      );
      this.selectedRegionValue.set(property.region);
      this.step.set(this.firstIncompleteStep());
      this.dirty.set(false);
      this.saveState.set('saved');
    });
  }

  private saveDraft(silent = false, after?: () => void) {
    void this.persistDraft(silent).then((property) => {
      if (property || !this.canCreateDraft()) after?.();
    });
  }

  private async persistDraft(silent = false) {
    if (this.busy()) return this.listing();
    if (!this.canCreateDraft()) {
      return this.listing();
    }
    this.busy.set(true);
    this.saveState.set('saving');
    const request =
      this.id || this.listing()
        ? this.api.update(this.id || this.listing()!.id, this.payload())
        : this.api.create(this.payload());
    try {
      const property = await firstValueFrom(request);
      const created = !this.id;
      this.listing.set(property);
      this.syncPhotoOrder(property);
      this.dirty.set(false);
      this.saveState.set('saved');
      if (created) {
        this.id = property.id;
        void this.router.navigate(['/account/manage/properties', property.id, 'edit'], {
          replaceUrl: true,
        });
      }
      return property;
    } catch (e: any) {
      this.saveState.set('error');
      if (!silent) this.error.set(e?.error?.message || 'Property could not be saved.');
      return null;
    } finally {
      this.busy.set(false);
    }
  }

  private canCreateDraft() {
    return (
      this.form.controls.title.valid &&
      this.form.controls.listing_type.valid &&
      this.form.controls.property_type.valid &&
      this.form.controls.price.valid
    );
  }

  private refresh() {
    const id = this.listing()?.id || this.id;
    if (id)
      this.api.detail(id).subscribe((property) => {
        this.listing.set(property);
        this.syncPhotoOrder(property);
      });
  }

  private async refreshListing() {
    const id = this.listing()?.id || this.id;
    if (!id) return this.listing();
    this.reviewLoading.set(true);
    try {
      const property = await firstValueFrom(this.api.detail(id));
      this.listing.set(property);
      this.syncPhotoOrder(property);
      return property;
    } catch {
      this.error.set("Couldn't refresh your listing. Please try again.");
      return null;
    } finally {
      this.reviewLoading.set(false);
    }
  }

  private async moveToStep(index: number, direction: StepDirection) {
    if (index === this.step()) return;
    this.stepDirection.set(direction);
    if (this.steps[index]?.key === 'review' && !(await this.refreshListing())) return;
    this.step.set(index);
    if (isPlatformBrowser(this.platformId)) {
      requestAnimationFrame(() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.querySelector('.wizard-card')?.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'start',
        });
      });
    }
  }

  private firstIncompleteStep() {
    if (!this.validateGroup(['title', 'description'])) return 0;
    if (!this.validateGroup(['region', 'town', 'latitude', 'longitude'])) return 1;
    if (!this.validateGroup(['price'])) return 2;
    if (!this.persistedPhotoItems().length && !this.pendingImages().length) return 3;
    return 5;
  }

  private async uploadQueuedImages() {
    if (!this.pendingImages().length) {
      await this.persistPhotoOrder();
      return true;
    }
    const property = await this.persistDraft(false);
    const id = property?.id || this.listing()?.id;
    if (!id) return false;
    const pendingByToken = new Map(
      this.pendingImages().map((image) => [this.pendingToken(image.localId), image]),
    );
    const order = this.currentPhotoOrder();
    const pendingTokens = order.filter((token) => pendingByToken.has(token));
    let uploaded = 0;
    let failed = 0;
    const total = pendingTokens.length;
    if (!total) {
      await this.persistPhotoOrder();
      this.error.set('');
      this.uploadProgress.set('');
      return true;
    }
    this.busy.set(true);
    try {
      for (const token of pendingTokens) {
        const pending = pendingByToken.get(token);
        if (!pending) continue;
        const index = order.indexOf(token);
        this.markPending(pending.localId, { status: 'uploading', error: undefined });
        this.uploadProgress.set(`Uploading ${uploaded + failed + 1} of ${total}...`);
        const data = new FormData();
        data.set('image', pending.file);
        data.set('sort_order', String(index));
        try {
          const image = await firstValueFrom(this.api.uploadImage(id, data));
          uploaded += 1;
          URL.revokeObjectURL(pending.previewUrl);
          this.pendingImages.update((items) =>
            items.filter((item) => item.localId !== pending.localId),
          );
          this.listing.update((current) => (current ? this.withImage(current, image) : current));
          this.photoOrder.update((items) =>
            items.map((item) => (item === token ? this.persistedToken(image.id) : item)),
          );
        } catch {
          failed += 1;
          this.markPending(pending.localId, {
            status: 'failed',
            error: `${pending.file.name} failed to upload.`,
          });
        }
      }
      await this.persistPhotoOrder();
      if (failed) {
        this.error.set(this.uploadFailureMessage(uploaded, failed, total));
        this.uploadProgress.set('Retry failed uploads when ready.');
        return false;
      }
      this.error.set('');
      this.uploadProgress.set(
        `${uploaded} photo${uploaded === 1 ? '' : 's'} uploaded successfully.`,
      );
      await this.refreshListing();
      return true;
    } finally {
      this.busy.set(false);
    }
  }

  private roomLabel(count: number, singular: string) {
    if (!Number.isFinite(count) || count <= 0) return '';
    return `${count} ${singular}${count === 1 ? '' : 's'}`;
  }

  private uploadFailureMessage(uploaded: number, failed: number, total: number) {
    if (failed === total) return `${failed} photo${failed === 1 ? '' : 's'} failed to upload.`;
    return `${uploaded} of ${total} photos uploaded. ${failed} failed.`;
  }

  private async persistPhotoOrder() {
    const id = this.listing()?.id;
    if (!id) return;
    const persistedItems = this.photoItems().filter((item) => item.kind === 'persisted');
    this.busy.set(true);
    try {
      for (const [index, image] of persistedItems.entries()) {
        await firstValueFrom(this.api.updateImage(id, image.id, { sort_order: index }));
      }
      if (persistedItems.length) this.refresh();
    } catch {
      this.error.set('Photo order could not be saved.');
    } finally {
      this.busy.set(false);
    }
  }

  private currentPhotoOrder() {
    return this.photoItems().map((item) => item.token);
  }

  private syncPhotoOrder(property = this.listing()) {
    const existing = new Set(
      this.orderedPersistedImages().map((image) => this.persistedToken(image.id)),
    );
    const pending = new Set(this.pendingImages().map((image) => this.pendingToken(image.localId)));
    const order = this.photoOrder().filter((token) => existing.has(token) || pending.has(token));
    for (const token of existing) if (!order.includes(token)) order.push(token);
    for (const token of pending) if (!order.includes(token)) order.push(token);
    if (property || order.length) this.photoOrder.set(order);
  }

  private markPending(localId: string, patch: Partial<Pick<PendingImage, 'status' | 'error'>>) {
    this.pendingImages.update((images) =>
      images.map((image) => (image.localId === localId ? { ...image, ...patch } : image)),
    );
  }

  private withImage(property: ManagedProperty, image: PropertyImage): ManagedProperty {
    return {
      ...property,
      images: [...property.images.filter((item) => item.id !== image.id), image].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    };
  }

  private persistedToken(id: string) {
    return `persisted:${id}`;
  }

  private pendingToken(id: string) {
    return `pending:${id}`;
  }

  private validateGroup(names: string[]) {
    return names.every((name) => this.form.get(name)?.valid);
  }

  private payload(): PropertyWriteRequest {
    const v = this.form.getRawValue();
    const n = (x: string) => (x === '' ? null : Number(x));
    return {
      title: v.title,
      description: v.description,
      listing_type: v.listing_type,
      property_type: v.property_type,
      price: v.price,
      currency: v.currency,
      region: v.region,
      town: v.town,
      suburb: v.suburb,
      address: v.address,
      latitude: v.latitude ? Number(v.latitude) : undefined,
      longitude: v.longitude ? Number(v.longitude) : undefined,
      bedrooms: n(v.bedrooms),
      bathrooms: n(v.bathrooms),
      parking_spaces: n(v.parking_spaces),
      floor_area: v.floor_area || null,
      land_area: v.land_area || null,
      furnished: v.furnished,
      pet_friendly: v.pet_friendly,
      amenities: v.amenities,
    };
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty() && this.saveState() !== 'saved') event.preventDefault();
  }
}

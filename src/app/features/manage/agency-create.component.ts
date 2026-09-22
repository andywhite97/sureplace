import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { AgencyNavigationService } from '../../core/services/agency-navigation.service';
import { ToastService } from '../../core/services/toast.service';
import { EswatiniPhoneInputComponent } from '../../shared/ui/eswatini-phone-input.component';

type FormStep = 0 | 1 | 2 | 3;
type WizardStep = FormStep | 4;

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, EswatiniPhoneInputComponent],
  template: `<section class="agency-flow">
    @if (step() < 4) {
      <a class="back-link" (click)="cancel()"
        ><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</a
      >
      <header class="flow-heading">
        <p class="eyebrow">Create agency</p>
        <h1>Set up your agency</h1>
        <p>{{ stepSubtitle() }}</p>
      </header>
      <ol class="steps" aria-label="Agency creation progress">
        @for (label of labels; track label; let index = $index) {
          <li
            [class.current]="step() === index"
            [class.done]="step() > index"
            [attr.aria-current]="step() === index ? 'step' : null"
          >
            <span>
              @if (step() > index) {
                <i class="fa-solid fa-check" aria-hidden="true"></i>
              } @else {
                {{ index + 1 }}
              }</span
            ><small>{{ label }}</small>
          </li>
        }
      </ol>
      <form [formGroup]="form" novalidate>
        <section class="panel" [class.reverse]="direction() === 'back'">
          @if (error()) {
            <p class="error" role="alert">
              {{ error() }}
              @if (needsEmailVerification()) {
                <a routerLink="/verify-email/pending">Go to email verification</a>
              }
            </p>
          }
          @if (step() === 0) {
            <header>
              <h2 tabindex="-1">Agency details</h2>
              <p>Give your agency a name and tell clients what you do.</p>
            </header>
            <div class="details-grid">
              <div>
                <p class="label">Agency logo <span>(optional)</span></p>
                <label
                  class="dropzone"
                  [class.has-file]="logoPreview()"
                  (dragover)="dragOver($event)"
                  (drop)="dropLogo($event)"
                  ><input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    (change)="setLogo($any($event.target).files); $any($event.target).value = ''"
                  />
                  @if (logoPreview()) {
                    <img [src]="logoPreview()" alt="Selected agency logo" /><strong>{{
                      logo()?.name
                    }}</strong
                    ><small>Ready to upload when your agency is created</small>
                  } @else {
                    <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i
                    ><strong>Drag & drop your logo here</strong
                    ><small>or click to browse · PNG, JPG or WebP</small>
                  }
                </label>
              </div>
              <div class="fields">
                <label
                  >Agency name *<input formControlName="name" autocomplete="organization" /><small
                    >Your public agency or business name.</small
                  ><em>{{ fieldError('name') }}</em></label
                ><label
                  >Trading name<input formControlName="trading_name" /><small
                    >Optional registered or commonly used trading name.</small
                  ></label
                ><label
                  >Description *<textarea
                    rows="6"
                    maxlength="1000"
                    formControlName="description"
                  ></textarea
                  ><small
                    >Tell people about your agency, what you do and who you serve.
                    {{ form.controls.description.value.length }}/1000</small
                  ><em>{{ fieldError('description') }}</em></label
                >
              </div>
            </div>
          }
          @if (step() === 1) {
            <header>
              <h2 tabindex="-1">Contact details</h2>
              <p>Add your contact details so clients can get in touch.</p>
            </header>
            <div class="fields two">
              <label
                >Business email *<input
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                /><em>{{ fieldError('email') }}</em></label
              ><label
                >Phone number *<sp-eswatini-phone-input
                  formControlName="phone"
                  [invalid]="!!fieldError('phone')"
                /><small>Use your Eswatini business number.</small
                ><em>{{ fieldError('phone') }}</em></label
              ><label
                >WhatsApp
                <sp-eswatini-phone-input
                  formControlName="whatsapp_number"
                  autocomplete="tel" /></label
              ><label
                >Website
                <input
                  type="url"
                  formControlName="website"
                  placeholder="https://youragency.com"
                /><em>{{ fieldError('website') }}</em></label
              >
            </div>
          }
          @if (step() === 2) {
            <header>
              <h2 tabindex="-1">Location</h2>
              <p>Add your agency's physical location.</p>
            </header>
            <div class="fields two">
              <label
                >Region *<select formControlName="region">
                  <option value="">Select a region</option>
                  @for (region of regions(); track region.value) {
                    <option [value]="region.label">{{ region.label }}</option>
                  }</select
                ><em>{{ fieldError('region') }}</em></label
              ><label
                >Town *<select formControlName="town">
                  <option value="">Select a town</option>
                  @for (town of towns(); track town) {
                    <option [value]="town">{{ town }}</option>
                  }</select
                ><em>{{ fieldError('town') }}</em></label
              ><label>Suburb / Area<input formControlName="suburb" /></label
              ><label
                >Street / Address<textarea rows="3" formControlName="address"></textarea>
              </label>
            </div>
          }
          @if (step() === 3) {
            <header>
              <h2 tabindex="-1">Review & create</h2>
              <p>Review your details before creating your agency.</p>
            </header>
            <div class="review-card">
              <section class="identity-review">
                <div class="logo">
                  @if (logoPreview()) {
                    <img [src]="logoPreview()" alt="" />
                  } @else {
                    <i class="fa-solid fa-building" aria-hidden="true"></i>
                  }
                </div>
                <div>
                  <h3>{{ form.controls.name.value }}</h3>
                  @if (form.controls.trading_name.value) {
                    <p>{{ form.controls.trading_name.value }}</p>
                  }
                  <small>{{ location() }}</small>
                </div>
              </section>
              <p class="description">{{ form.controls.description.value }}</p>
              <section class="review-section">
                <div>
                  <h3>Contact</h3>
                  <button type="button" (click)="goTo(1)">Edit</button>
                </div>
                <dl>
                  <dt>Email</dt>
                  <dd>{{ form.controls.email.value }}</dd>
                  <dt>Phone</dt>
                  <dd>{{ form.controls.phone.value }}</dd>
                  @if (form.controls.whatsapp_number.value) {
                    <dt>WhatsApp</dt>
                    <dd>{{ form.controls.whatsapp_number.value }}</dd>
                  }
                  @if (form.controls.website.value) {
                    <dt>Website</dt>
                    <dd>{{ form.controls.website.value }}</dd>
                  }
                </dl>
              </section>
              <section class="review-section">
                <div>
                  <h3>Location</h3>
                  <button type="button" (click)="goTo(2)">Edit</button>
                </div>
                <p>{{ location() }}</p>
              </section>
            </div>
            <aside class="notice verification">
              <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
              <div>
                <strong>Verification</strong>
                <p>Starts as unverified. You can complete verification after creation.</p>
              </div>
            </aside>
            <aside class="notice owner">
              <i class="fa-solid fa-crown" aria-hidden="true"></i>
              <div>
                <strong>You will become the agency owner.</strong>
                <p>
                  You can invite team members and complete verification after your agency is
                  created.
                </p>
              </div>
            </aside>
          }
          <footer class="actions">
            <button type="button" class="secondary" (click)="step() === 0 ? cancel() : back()">
              {{ step() === 0 ? 'Cancel' : 'Back' }}</button
            ><button
              type="button"
              class="primary"
              [disabled]="busy()"
              (click)="step() === 3 ? submit() : next()"
            >
              {{ busy() ? 'Creating agency...' : step() === 3 ? 'Create Agency' : 'Continue →' }}
            </button>
          </footer>
        </section>
      </form>
    } @else {
      <section class="panel success" role="status" aria-live="polite">
        <span class="success-icon"><i class="fa-solid fa-check" aria-hidden="true"></i></span>
        <p class="eyebrow">Agency created</p>
        <h1>Agency Created!</h1>
        <p>
          <strong>{{ createdName() }}</strong> has been successfully created.
        </p>
        <p>You are the agency owner.</p>
        <div class="onboarding">
          <a routerLink="/account/manage/agency/profile"
            ><i class="fa-solid fa-id-card" aria-hidden="true"></i
            ><span
              ><strong>Complete your profile</strong
              ><small>Add more details, photos and branding.</small></span
            ><b>→</b></a
          ><a routerLink="/account/manage/agency/team"
            ><i class="fa-solid fa-users" aria-hidden="true"></i
            ><span
              ><strong>Invite team members</strong
              ><small>Add agents to your agency and work together.</small></span
            ><b>→</b></a
          ><a routerLink="/account/manage/agency/verification"
            ><i class="fa-solid fa-shield-halved" aria-hidden="true"></i
            ><span
              ><strong>Start verification</strong
              ><small>Build trust with a verified agency.</small></span
            ><b>→</b></a
          >
        </div>
        <div class="actions">
          <a class="primary" routerLink="/account/manage/agency">Go to Agency Dashboard</a
          ><a class="secondary" routerLink="/account/manage/listings/new">Create a Listing</a>
        </div>
      </section>
    }
  </section>`,
  styles: [
    `
      .agency-flow {
        max-width: 900px;
        margin: 0 auto;
        display: grid;
        gap: 1rem;
        color: var(--midnight);
      }
      .back-link {
        width: max-content;
        color: var(--slate);
        font-weight: 800;
        cursor: pointer;
      }
      .flow-heading h1,
      .flow-heading p,
      .panel h2,
      .panel h3,
      .panel p {
        margin: 0;
      }
      .flow-heading > p:last-child,
      .panel header > p {
        margin-top: 0.28rem;
        color: var(--slate);
      }
      .eyebrow {
        color: var(--teal) !important;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 0.74rem;
      }
      .steps {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .steps li {
        position: relative;
        display: grid;
        justify-items: center;
        gap: 0.35rem;
        color: var(--slate);
        font-size: 0.78rem;
        font-weight: 800;
      }
      .steps li:not(:last-child):after {
        content: '';
        position: absolute;
        top: 15px;
        left: calc(50% + 19px);
        width: calc(100% - 38px);
        height: 2px;
        background: var(--line);
      }
      .steps span {
        z-index: 1;
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--mist);
        font-size: 0.75rem;
      }
      .steps .done span,
      .steps .current span {
        background: var(--teal);
        color: #fff;
      }
      .steps .done:after {
        background: var(--teal);
      }
      .panel {
        display: grid;
        gap: 1.1rem;
        padding: 1.25rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
        overflow: hidden;
        animation: enter 0.2s ease;
      }
      .panel.reverse {
        animation: enter-right 0.2s ease;
      }
      .details-grid {
        display: grid;
        grid-template-columns: 250px minmax(0, 1fr);
        gap: 1rem;
      }
      .label,
      label {
        display: grid;
        gap: 0.36rem;
        font-size: 0.83rem;
        font-weight: 850;
      }
      .label span,
      label small {
        color: var(--slate);
        font-weight: 650;
      }
      .dropzone {
        min-height: 235px;
        box-sizing: border-box;
        place-content: center;
        justify-items: center;
        padding: 1rem;
        border: 2px dashed #9ddfd0;
        border-radius: 0.8rem;
        background: #f8fdfb;
        text-align: center;
        cursor: pointer;
      }
      .dropzone input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
      }
      .dropzone i {
        font-size: 2rem;
        color: var(--teal);
      }
      .dropzone img {
        width: 100px;
        height: 100px;
        border-radius: 0.75rem;
        object-fit: cover;
      }
      .fields {
        display: grid;
        gap: 0.85rem;
      }
      .fields.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .fields label:has(textarea) {
        grid-column: 1/-1;
      }
      input,
      textarea,
      select {
        box-sizing: border-box;
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 0.55rem;
        padding: 0.68rem;
        background: #fff;
        color: var(--midnight);
        font: inherit;
      }
      textarea {
        resize: vertical;
      }
      em {
        color: #a22626;
        font-size: 0.78rem;
        font-style: normal;
        font-weight: 700;
      }
      em:empty {
        display: none;
      }
      .error {
        margin: 0 !important;
        padding: 0.72rem;
        border-radius: 0.55rem;
        background: #fff2f2;
        color: #9d2525;
        font-weight: 750;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.65rem;
        padding-top: 0.15rem;
      }
      .primary,
      .secondary {
        min-height: 43px;
        box-sizing: border-box;
        padding: 0.65rem 0.95rem;
        border: 1px solid var(--line);
        border-radius: 0.55rem;
        background: #fff;
        color: var(--midnight);
        font: inherit;
        font-weight: 850;
        text-decoration: none;
        cursor: pointer;
      }
      .primary {
        border-color: var(--teal);
        background: var(--teal);
        color: #fff;
      }
      .primary:disabled {
        opacity: 0.62;
        cursor: not-allowed;
      }
      .review-card {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 0.8rem;
      }
      .identity-review {
        display: flex;
        gap: 0.85rem;
        align-items: center;
      }
      .logo {
        display: grid;
        place-items: center;
        width: 70px;
        height: 70px;
        overflow: hidden;
        border-radius: 0.75rem;
        background: #e4f7f1;
        color: var(--teal);
        font-size: 1.6rem;
      }
      .logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .identity-review h3 {
        font-size: 1.08rem;
      }
      .identity-review p,
      .identity-review small,
      .review-section p {
        color: var(--slate);
      }
      .description {
        padding-top: 0.85rem;
        border-top: 1px solid var(--line);
        line-height: 1.5;
      }
      .review-section {
        padding-top: 0.85rem;
        border-top: 1px solid var(--line);
      }
      .review-section > div {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .review-section button {
        border: 0;
        background: none;
        color: var(--teal);
        font: inherit;
        font-weight: 850;
        cursor: pointer;
      }
      .review-section dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 0.45rem 0.8rem;
        margin: 0.7rem 0 0;
      }
      .review-section dd {
        margin: 0;
        color: var(--slate);
        overflow-wrap: anywhere;
      }
      .notice {
        display: flex;
        gap: 0.7rem;
        padding: 0.9rem;
        border-radius: 0.7rem;
      }
      .notice i {
        margin-top: 0.15rem;
        color: var(--teal);
      }
      .notice strong,
      .notice p {
        margin: 0;
      }
      .notice p {
        margin-top: 0.18rem;
        color: var(--slate);
        font-size: 0.86rem;
      }
      .verification {
        background: #eefaf7;
        border: 1px solid #c8eee3;
      }
      .owner {
        background: #f4f8f7;
        border: 1px solid var(--line);
      }
      .success {
        justify-items: center;
        max-width: 690px;
        margin: auto;
        text-align: center;
        padding: 2rem;
      }
      .success-icon {
        display: grid;
        place-items: center;
        width: 62px;
        height: 62px;
        border-radius: 50%;
        background: var(--teal);
        color: #fff;
        font-size: 1.6rem;
      }
      .success > p:not(.eyebrow) {
        color: var(--slate);
      }
      .onboarding {
        display: grid;
        width: 100%;
        margin-top: 0.5rem;
        text-align: left;
      }
      .onboarding a {
        display: grid;
        grid-template-columns: 28px 1fr auto;
        gap: 0.65rem;
        align-items: center;
        padding: 0.85rem 0;
        border-top: 1px solid var(--line);
        color: var(--midnight);
        text-decoration: none;
      }
      .onboarding i,
      .onboarding b {
        color: var(--teal);
      }
      .onboarding span {
        display: grid;
        gap: 0.18rem;
      }
      .onboarding small {
        color: var(--slate);
      }
      .success .actions {
        margin-top: 0.25rem;
      }
      @keyframes enter {
        from {
          opacity: 0;
          transform: translateX(12px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      @keyframes enter-right {
        from {
          opacity: 0;
          transform: translateX(-12px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .panel {
          animation: none;
        }
      }
      @media (max-width: 620px) {
        .agency-flow {
          gap: 0.85rem;
        }
        .panel {
          padding: 1rem;
        }
        .steps small {
          font-size: 0.67rem;
        }
        .steps li:not(:last-child):after {
          left: calc(50% + 17px);
          width: calc(100% - 34px);
        }
        .details-grid,
        .fields.two {
          grid-template-columns: 1fr;
        }
        .fields label:has(textarea) {
          grid-column: auto;
        }
        .dropzone {
          min-height: 180px;
        }
        .actions {
          display: grid;
          grid-template-columns: 1fr;
        }
        .actions > * {
          width: 100%;
        }
        .success {
          padding: 1.25rem;
        }
        .review-section dl {
          grid-template-columns: 1fr;
        }
        .review-section dt {
          font-weight: 850;
        }
        .review-section dd {
          margin-top: -0.3rem;
        }
        .onboarding {
          gap: 0.15rem;
        }
      }
    `,
  ],
})
export class AgencyCreateComponent {
  private fb = inject(FormBuilder);
  private api = inject(AgencyManagementApiService);
  private refs = inject(ReferenceApiService);
  private navigation = inject(AgencyNavigationService);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly labels = ['Details', 'Contact', 'Location', 'Review'];
  readonly step = signal<WizardStep>(0);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly needsEmailVerification = signal(false);
  readonly direction = signal<'forward' | 'back'>('forward');
  readonly createdName = signal('');
  readonly logo = signal<File | null>(null);
  readonly logoPreview = signal<string | null>(null);
  readonly selectedRegion = signal('');
  readonly regions = computed(() => this.refs.data().regions);
  readonly towns = computed(
    () => this.regions().find((r) => r.label === this.selectedRegion())?.areas || [],
  );
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    trading_name: [''],
    description: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    whatsapp_number: [''],
    website: ['', Validators.pattern(/^$|https?:\/\/[^\s]+$/)],
    region: ['', Validators.required],
    town: ['', Validators.required],
    suburb: [''],
    address: [''],
  });
  constructor() {
    this.refs.load().subscribe();
    this.form.controls.region.valueChanges.pipe(distinctUntilChanged()).subscribe((region) => {
      const changed = this.selectedRegion() && this.selectedRegion() !== region;
      this.selectedRegion.set(region);
      if (changed) this.form.patchValue({ town: '' });
    });
  }
  stepSubtitle() {
    return (
      [
        'Start with the essentials for your public agency profile.',
        'Add the ways clients can reach your business.',
        'Help clients find your agency.',
        'Make sure everything looks right.',
      ][this.step()] || ''
    );
  }
  dragOver(event: DragEvent) {
    event.preventDefault();
  }
  dropLogo(event: DragEvent) {
    event.preventDefault();
    this.setLogo(event.dataTransfer?.files || null);
  }
  setLogo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error.set('Choose a PNG, JPG or WebP logo.');
      return;
    }
    this.logo.set(file);
    this.logoPreview.set(URL.createObjectURL(file));
    this.error.set('');
  }
  next() {
    if (!this.validateStep(this.step() as FormStep)) return;
    this.direction.set('forward');
    this.step.update((value) => Math.min(3, value + 1) as WizardStep);
  }
  back() {
    this.error.set('');
    this.direction.set('back');
    this.step.update((value) => Math.max(0, value - 1) as WizardStep);
  }
  goTo(value: FormStep) {
    this.direction.set(value < this.step() ? 'back' : 'forward');
    this.error.set('');
    this.step.set(value);
  }
  fieldError(name: keyof typeof this.form.controls) {
    const field = this.form.controls[name];
    if (!field.invalid || !(field.touched || field.dirty)) return '';
    if (field.errors?.['required']) return 'This field is required.';
    if (field.errors?.['email']) return 'Enter a valid email address.';
    if (field.errors?.['pattern']) return 'Use a full website address beginning with https://.';
    return 'Check this value.';
  }
  location() {
    return [
      this.form.controls.suburb.value,
      this.form.controls.town.value,
      this.form.controls.region.value,
      'Eswatini',
    ]
      .filter(Boolean)
      .join(', ');
  }
  cancel() {
    if (this.form.dirty || this.logo()) {
      if (!window.confirm('Leave agency setup? Your changes will be lost.')) return;
    }
    void this.router.navigateByUrl('/account/manage');
  }
  private validateStep(step: FormStep) {
    const names: (keyof typeof this.form.controls)[][] = [
      ['name', 'description'],
      ['email', 'phone', 'website'],
      ['region', 'town'],
      Object.keys(this.form.controls) as (keyof typeof this.form.controls)[],
    ];
    const fields = names[step];
    fields.forEach((name) => this.form.controls[name].markAsTouched());
    const invalid = fields.some((name) => this.form.controls[name].invalid);
    this.error.set(invalid ? 'Please fix the highlighted fields before continuing.' : '');
    return !invalid;
  }
  submit() {
    if (this.busy() || this.step() === 4 || !this.validateStep(3)) return;
    const body = new FormData();
    Object.entries(this.form.getRawValue()).forEach(([key, value]) => body.set(key, value || ''));
    if (this.logo()) body.set('logo', this.logo()!);
    this.busy.set(true);
    this.error.set('');
    this.needsEmailVerification.set(false);
    this.api
      .create(body)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (agency) => {
          this.createdName.set(agency.name);
          this.navigation.refresh();
          this.toast.show({
            kind: 'success',
            title: 'Agency created successfully',
            message: agency.name,
          });
          this.step.set(4);
        },
        error: (response) => this.handleCreateError(response),
      });
  }
  private handleCreateError(response: any) {
    if (response?.error?.code === 'email_not_verified') {
      this.needsEmailVerification.set(true);
      this.error.set('Verify your email before creating an agency.');
      return;
    }
    const errors = response?.error?.errors || {};
    const field = Object.keys(errors)[0];
    const target =
      field === 'name' || field === 'description'
        ? 0
        : ['email', 'phone', 'whatsapp_number', 'website'].includes(field)
          ? 1
          : ['region', 'town', 'suburb', 'address'].includes(field)
            ? 2
            : 3;
    if (field && target !== 3) this.goTo(target as FormStep);
    this.error.set(response?.error?.message || "Couldn't create your agency. Please try again.");
  }
}

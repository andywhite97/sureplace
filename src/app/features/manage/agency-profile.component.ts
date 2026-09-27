import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { AgencyManagementApiService, VerificationApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { Agency, AgencyDashboard } from '../../core/models/manage.models';
import { VerificationRequestSummary } from '../../core/models/manage.models';
import { ToastService } from '../../core/services/toast.service';
import { EswatiniPhoneInputComponent } from '../../shared/ui/eswatini-phone-input.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, EswatiniPhoneInputComponent],
  template: `<section class="profile-page">
    <header class="page-heading">
      <p class="eyebrow">Agency</p>
      <h1>Agency details</h1>
      <p>Manage your agency identity, contact details, and business information.</p>
    </header>
    @if (loading()) {
      <div class="profile-grid"><main><div class="skeleton identity-skeleton"></div><div class="skeleton section-skeleton"></div></main><aside><div class="skeleton rail-skeleton"></div><div class="skeleton rail-skeleton"></div></aside></div>
    } @else if (loadError()) {
      <section class="state" role="alert">
        <h2>Couldn't load agency profile.</h2>
        <button type="button" (click)="load()">Retry</button>
      </section>
    } @else if (dashboard(); as data) {
      <div class="profile-grid">
        <main>
          <section class="identity-card">
            <div class="logo-wrap" [class.placeholder]="!logoPreview()">
              @if (logoPreview()) {
                <img [src]="logoPreview()" [alt]="data.agency.name + ' logo'" />
              } @else {
                <i class="fa-solid fa-building" aria-hidden="true"></i>
              }
              @if (logoUploading()) {
                <span class="logo-loading"
                  ><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Uploading...</span
                >
              }
            </div>
            <div class="identity-copy">
              <div class="identity-title">
                <h2>{{ data.agency.name }}</h2>
                <span class="badge" [class.inactive]="!data.agency.is_active">{{
                  data.agency.is_active ? 'Active' : 'Inactive'
                }}</span>
              </div>
              @if (data.agency.trading_name) {
                <p class="trading">{{ data.agency.trading_name }}</p>
              }
              <p>
                <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                {{ location(data.agency) }}
              </p>
              <p>
                <i class="fa-solid fa-users" aria-hidden="true"></i> {{ data.team_members }} team
                member{{ data.team_members === 1 ? '' : 's' }}
              </p>
              <span [class]="'verification ' + verificationTone(data.verification_status)">{{
                verificationLabel(data.verification_status)
              }}</span>
            </div>
            @if (canEdit()) {
              <label class="logo-action"
                ><input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  [disabled]="logoUploading() || busy()"
                  (change)="changeLogo($any($event.target).files); $any($event.target).value = ''"
                />{{ logoUploading() ? 'Uploading...' : 'Change logo' }}</label
              >
            }
          </section>
          <nav class="section-tabs" aria-label="Agency profile sections">
            <a href="#general">General</a><a href="#contact-location">Contact &amp; Location</a><a href="#about">About</a><a routerLink="/account/manage/agency/team">Team</a><a routerLink="/account/manage/verification">Verification</a>
          </nav>
          <form [formGroup]="form" (ngSubmit)="save(data.agency)" novalidate>
            @if (saveError()) {
              <p class="error" role="alert">{{ saveError() }}</p>
            }
            @if (!canEdit()) {
              <p class="read-only" role="status">
                Your agency role lets you view this profile, but not edit it.
              </p>
            }
            <fieldset class="edit-fields" [disabled]="!canEdit()">
              <section class="section-card agency-details-card" id="general">
                <header>
                  <h2>Agency details</h2>
                  <p>Basic information about your agency.</p>
                </header>
                <div class="fields two">
                  <label
                    >Name *<input formControlName="name" /><small class="field-error">{{
                      fieldError('name')
                    }}</small></label
                  ><label>Trading name<input formControlName="trading_name" /></label>
                </div>
                <label id="about"
                  >Description *<textarea rows="4" formControlName="description"></textarea
                  ><small class="field-error">{{ fieldError('description') }}</small></label
                >
              </section>
              <section class="section-card contact-card" id="contact-location">
                <header>
                  <h2>Contact information</h2>
                  <p>How clients and hosts can get in touch with you.</p>
                </header>
                <div class="fields two">
                  <label
                    >Email *<input type="email" formControlName="email" /><small
                      class="field-error"
                      >{{ fieldError('email') }}</small
                    ></label
                  ><label
                    >Phone *<sp-eswatini-phone-input
                      formControlName="phone"
                      [invalid]="!!fieldError('phone')"
                    /><small class="field-error">{{ fieldError('phone') }}</small></label
                  ><label
                    >WhatsApp<sp-eswatini-phone-input formControlName="whatsapp_number" /></label
                  ><label
                    >Website<input type="url" formControlName="website" /><small
                      class="field-error"
                      >{{ fieldError('website') }}</small
                    ></label
                  >
                </div>
              </section>
              <section class="section-card location-card">
                <header>
                  <h2>Location</h2>
                  <p>Your agency's physical location.</p>
                </header>
                <div class="fields two">
                  <label
                    >Region *<select formControlName="region">
                      <option value="">Select a region</option>
                      @for (region of reference.data().regions; track region.value) {
                        <option [value]="region.label">{{ region.label }}</option>
                      }</select
                    ><small class="field-error">{{ fieldError('region') }}</small></label
                  ><label
                    >Town *<select formControlName="town">
                      <option value="">Select a town</option>
                      @for (town of towns(); track town) {
                        <option [value]="town">{{ town }}</option>
                      }</select
                    ><small class="field-error">{{ fieldError('town') }}</small></label
                  ><label>Suburb<input formControlName="suburb" /></label
                  ><label class="full"
                    >Address<textarea rows="3" formControlName="address"></textarea>
                  </label>
                </div>
              </section>
            </fieldset>
            <footer class="form-actions">
              <button
                type="button"
                class="secondary"
                [disabled]="busy() || !dirty()"
                (click)="cancel()"
              >
                Cancel</button
              ><button
                type="submit"
                class="primary"
                [disabled]="busy() || form.invalid || !dirty() || !canEdit()"
              >
                {{ busy() ? 'Saving...' : saved() ? 'Saved' : 'Save changes' }}
              </button>
            </footer>
            @if (canEdit() && !dirty() && !busy()) {
              <small class="save-hint">Make a change to this profile to enable saving.</small>
            }
          </form>
        </main>
        <aside class="right-rail">
          <section class="summary-card">
            <h2>Agency summary</h2>
            <a routerLink="/account/manage/agency/listings"><span>Listings</span><strong>{{ data.active_properties }}</strong><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>
            <a routerLink="/account/manage/stays"><span>Stays</span><strong>{{ data.active_stays }}</strong><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>
            <a routerLink="/account/manage/agency/team"><span>Team members</span><strong>{{ data.team_members }}</strong><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>
            <a routerLink="/account/manage/verification"><span>Verification</span><strong>{{ verificationLabel(data.verification_status) }}</strong></a>
          </section>
          <section class="rail-card verification-card" id="verification">
            <h2><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Verification status</h2>
            <p>Get verified to build trust and attract more clients.</p>
            @if (verificationLoading()) { <p role="status">Loading verification details…</p> }
            @else if (verificationError()) { <p role="alert">Couldn't load verification details.</p><button type="button" class="text-button" (click)="loadVerification(data.agency.id)">Retry</button> }
            @else {
              @for (step of verificationSteps(); track step.label) {
                <div class="status-step"><span [class.complete]="step.complete"><i class="fa-solid" [class.fa-check]="step.complete" [class.fa-circle]="!step.complete" aria-hidden="true"></i></span><p>{{ step.label }}<strong>{{ step.status }}</strong></p></div>
              }
            }
            <a class="primary rail-cta" routerLink="/account/manage/verification">{{ verificationAction() }}</a>
          </section>
          <section class="rail-card completeness-card">
            <h2><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i> Profile completeness</h2>
            <p>Help clients find and trust your agency.</p>
            <div class="progress-track" role="progressbar" [attr.aria-valuenow]="completionPercent()" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="completionPercent()"></span></div><strong class="percent">{{ completionPercent() }}%</strong>
            @for (item of completeness(); track item.label) { <p class="check-row"><i class="fa-solid" [class.fa-circle-check]="item.done" [class.fa-circle]="!item.done" [class.done]="item.done" aria-hidden="true"></i>{{ item.label }}</p> }
          </section>
          <section class="rail-card help-card"><h2>Need help?</h2><p>Visit our Help Centre for guidance on managing your agency profile.</p><a routerLink="/help">View Help Centre <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></section>
        </aside>
      </div>
    } @else {
      <section class="state">
        <h2>No agency found.</h2>
        <a routerLink="/account/manage/agency/create">Create an agency</a>
      </section>
    }
  </section>`,
  styles: [
    `
      .profile-page {
        display: grid;
        gap: 1.25rem;
        max-width: 1240px;
      }
      .page-heading h1,
      .page-heading p,
      .identity-card h2,
      .section-card h2,
      .summary-card h2 {
        margin: 0;
      }
      .page-heading > p:last-child,
      header p,
      .identity-copy p {
        color: var(--slate);
      }
      .eyebrow {
        margin: 0 0 0.25rem !important;
        color: var(--teal) !important;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .profile-grid {
        display: grid;
        grid-template-columns: minmax(0, 2.25fr) minmax(270px, 0.95fr);
        gap: 1rem;
        align-items: start;
      }
      .profile-grid main,
      form {
        display: grid;
        gap: 1rem;
        min-width: 0;
      }
      .identity-card,
      .section-card,
      .summary-card,
      .rail-card,
      .state {
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
      }
      .identity-card {
        display: grid;
        grid-template-columns: 104px minmax(0, 1fr) auto;
        gap: 1rem;
        align-items: center;
        padding: 1.15rem;
      }
      .logo-wrap {
        position: relative;
        display: grid;
        place-items: center;
        width: 104px;
        height: 104px;
        overflow: hidden;
        border-radius: 1rem;
        background: #f5faf8;
        color: var(--teal);
        font-size: 2rem;
      }
      .logo-wrap img {
        width: 100%;
        height: 100%;
        padding: 0.35rem;
        box-sizing: border-box;
        object-fit: contain;
      }
      .logo-loading {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 0.35rem;
        background: #152b2acc;
        color: #fff;
        font-size: 0.7rem;
        text-align: center;
      }
      .identity-title {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .trading {
        font-weight: 800;
        color: var(--midnight) !important;
      }
      .identity-copy p {
        margin: 0.35rem 0;
        font-size: 0.88rem;
      }
      .identity-copy i {
        width: 1rem;
        color: var(--teal);
      }
      .badge,
      .verification {
        display: inline-flex;
        width: max-content;
        margin-top: 0.2rem;
        border-radius: 999px;
        padding: 0.22rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 850;
        background: #dff5ee;
        color: #08735e;
      }
      .badge.inactive,
      .verification.bad {
        background: #fde8e8;
        color: #9b2525;
      }
      .verification.warn {
        background: #fff4dd;
        color: #8a5a00;
      }
      .logo-action,
      .mobile-actions a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0.55rem 0.75rem;
        border: 1px solid var(--teal);
        border-radius: 0.5rem;
        color: var(--teal);
        font-size: 0.82rem;
        font-weight: 850;
        cursor: pointer;
      }
      .logo-action input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
      }
      .mobile-actions {
        display: none;
      }
      .section-tabs { display:flex; gap:1.5rem; border-bottom:1px solid var(--line); padding:0 .75rem; overflow-x:auto; }
      .section-tabs a { flex:none; padding:.8rem .1rem; border-bottom:3px solid transparent; color:var(--slate); font-size:.86rem; font-weight:750; text-decoration:none; }
      .section-tabs a:hover,.section-tabs a:focus-visible { color:var(--teal); border-bottom-color:var(--teal); }
      .section-card {
        display: grid;
        gap: 0.9rem;
        padding: 1.1rem;
      }
      .edit-fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: start;
        gap: 1rem;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }
      .section-card header h2 {
        font-size: 1.02rem;
      }
      .section-card header p {
        margin: 0.2rem 0 0;
        font-size: 0.86rem;
      }
      .location-card {
        grid-column: 1 / -1;
      }
      .agency-details-card textarea {
        min-height: 118px;
      }
      .fields {
        display: grid;
        gap: 0.85rem;
      }
      .fields.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      label {
        min-width: 0;
      }
      .full {
        grid-column: 1/-1;
      }
      label {
        display: grid;
        gap: 0.35rem;
        color: var(--midnight);
        font-size: 0.82rem;
        font-weight: 800;
      }
      input,
      textarea,
      select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--line);
        border-radius: 0.5rem;
        padding: 0.68rem;
        background: #fff;
        color: var(--midnight);
        font: inherit;
      }
      textarea {
        resize: vertical;
      }
      .field-error {
        min-height: 0;
        color: #a22626;
        font-weight: 650;
      }
      .field-error:empty {
        display: none;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.65rem;
        padding: 0.85rem 0 0;
        border-top: 1px solid var(--line);
      }
      .primary,
      .secondary,
      .state button,
      .state a {
        min-height: 42px;
        padding: 0.65rem 0.9rem;
        border: 1px solid var(--line);
        border-radius: 0.5rem;
        background: #fff;
        color: var(--midnight);
        font: inherit;
        font-weight: 850;
        text-decoration: none;
        cursor: pointer;
        transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
      }
      .primary {
        border-color: var(--teal);
        background: var(--teal);
        color: #fff;
      }
      .primary:hover:not(:disabled),
      .secondary:hover:not(:disabled),
      .logo-action:hover {
        transform: translateY(-1px);
        box-shadow: 0 5px 14px rgba(7, 43, 54, 0.12);
      }
      .primary:disabled,
      .secondary:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .save-hint {
        justify-self: end;
        margin-top: -0.65rem;
        color: var(--slate);
        font-size: 0.75rem;
      }
      .error,
      .read-only {
        margin: 0;
        padding: 0.75rem;
        border-radius: 0.5rem;
      }
      .error {
        background: #fff3f3;
        color: #9b2525;
      }
      .read-only {
        background: #fff4dd;
        color: #8a5a00;
      }
      .right-rail { display:grid; gap:1rem; align-content:start; position:sticky; top:88px; }
      .summary-card {
        display: grid;
        gap: 0.1rem;
        padding: 0.8rem;
      }
      .summary-card h2 {
        padding: 0.25rem 0.25rem 0.6rem;
        font-size: 1rem;
      }
      .summary-card a {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.7rem 0.25rem;
        border-top: 1px solid var(--line);
        color: var(--midnight);
        text-decoration: none;
        align-items:center;
      }
      .summary-card a i { color:var(--slate); font-size:.7rem; }
      .summary-card span {
        color: var(--slate);
        font-size: 0.85rem;
      }
      .summary-card strong {
        font-size: 0.9rem;
        text-align: right;
      }
      .rail-card { padding:1rem; display:grid; gap:.65rem; }
      .rail-card h2 { margin:0; font-size:1rem; display:flex; align-items:center; gap:.6rem; }
      .rail-card h2 i { color:var(--teal); }
      .rail-card > p { margin:0; color:var(--slate); font-size:.83rem; line-height:1.45; }
      .status-step { display:flex; gap:.7rem; align-items:flex-start; }
      .status-step > span { width:1.25rem; height:1.25rem; display:grid; place-items:center; border:1.5px solid #b8c8c8; border-radius:50%; color:#8b9b9b; font-size:.65rem; flex:none; }
      .status-step > span.complete { background:var(--teal); color:white; border-color:var(--teal); }
      .status-step p { margin:0; font-size:.8rem; }
      .status-step strong { display:block; margin-top:.15rem; color:var(--slate); font-weight:550; }
      .rail-cta { text-align:center; text-decoration:none; }
      .text-button { justify-self:start; padding:0; border:0; color:var(--teal); background:none; font:inherit; cursor:pointer; }
      .progress-track { height:7px; margin-top:.3rem; overflow:hidden; border-radius:1rem; background:#e6efed; }
      .progress-track span { display:block; height:100%; border-radius:inherit; background:var(--teal); transition:width .25s ease; }
      .percent { justify-self:center; color:var(--midnight); font-size:1.2rem; }
      .check-row { display:flex; gap:.6rem; align-items:center; color:var(--midnight)!important; }
      .check-row i { color:#aebdbc; }
      .check-row i.done { color:var(--teal); }
      .help-card { background:#eaf8f5; }
      .help-card a { display:flex; justify-content:center; gap:.4rem; padding:.65rem; border:1px solid var(--line); border-radius:.5rem; background:#fff; color:var(--teal); font-size:.82rem; font-weight:800; text-decoration:none; }
      .right-rail a,.section-tabs a { transition:color .16s ease,background .16s ease,border-color .16s ease,transform .16s ease; }
      .right-rail a:hover { color:var(--teal); }
      .rail-skeleton { height:210px; }
      .state {
        display: grid;
        justify-items: start;
        gap: 0.7rem;
        padding: 2rem;
      }
      .skeleton {
        border-radius: 1rem;
        background: linear-gradient(90deg, #edf2f0 25%, #f7faf9 40%, #edf2f0 60%);
        background-size: 300% 100%;
        animation: shimmer 1.2s infinite;
      }
      .identity-skeleton {
        height: 128px;
      }
      .section-skeleton {
        height: 420px;
      }
      @keyframes shimmer {
        to {
          background-position: -100% 0;
        }
      }
      @media (max-width: 900px) {
        .profile-grid {
          grid-template-columns: 1fr;
        }
        .right-rail { position:static; grid-template-columns:repeat(2,minmax(0,1fr)); }
        .summary-card {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .summary-card h2 {
          grid-column: 1/-1;
        }
        .summary-card a {
          display: grid;
          gap: 0.2rem;
        }
        .summary-card strong {
          text-align: left;
        }
        .section-tabs { gap:1rem; }
        .edit-fields {
          grid-template-columns: 1fr;
        }
        .location-card {
          grid-column: auto;
        }
      }
      @media (max-width: 600px) {
        .identity-card {
          grid-template-columns: 64px minmax(0, 1fr);
          padding: 1rem;
        }
        .logo-wrap {
          width: 64px;
          height: 64px;
          font-size: 1.5rem;
        }
        .logo-action {
          grid-column: 1/-1;
          width: 100%;
          box-sizing: border-box;
        }
        .fields.two,
        .summary-card,
        .right-rail {
          grid-template-columns: 1fr;
        }
        .summary-card h2 {
          grid-column: auto;
        }
        .full {
          grid-column: auto;
        }
        .form-actions {
          display: grid;
          grid-template-columns: 1fr;
        }
        .form-actions button {
          width: 100%;
        }
        .section-tabs { gap:.85rem; padding-inline:.25rem; }
        .section-tabs a { font-size:.78rem; }
        .identity-title h2 {
          font-size: 1.08rem;
        }
      }
    `,
  ],
})
export class AgencyProfileComponent {
  private api = inject(AgencyManagementApiService);
  private verificationApi = inject(VerificationApiService);
  readonly reference = inject(ReferenceApiService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  loading = signal(true);
  busy = signal(false);
  logoUploading = signal(false);
  loadError = signal(false);
  saveError = signal('');
  saved = signal(false);
  dashboard = signal<AgencyDashboard | null>(null);
  verificationRequests = signal<VerificationRequestSummary[]>([]);
  verificationLoading = signal(false);
  verificationError = signal(false);
  logoPreview = signal<string | null>(null);
  private initial: ReturnType<typeof this.form.getRawValue> | null = null;
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    trading_name: [''],
    description: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    whatsapp_number: [''],
    website: ['', [Validators.pattern(/^$|https?:\/\/[^\s]+$/)]],
    region: ['', Validators.required],
    town: ['', Validators.required],
    suburb: [''],
    address: [''],
  });
  dirty = computed(() => this.form.dirty && !this.busy());
  towns = computed(
    () =>
      this.reference.data().regions.find((item) => item.label === this.form.controls.region.value)
        ?.areas || [],
  );
  canEdit = computed(() => ['OWNER', 'ADMIN'].includes(this.dashboard()?.role || ''));
  readonly latestIdentityRequest = computed(() => this.verificationRequests()
    .filter((request) => request.verification_type === 'IDENTITY')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null);
  readonly latestAgencyRequest = computed(() => this.verificationRequests()
    .filter((request) => request.verification_type === 'AGENCY')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null);
  readonly verificationSteps = computed(() => {
    const identity = this.latestIdentityRequest();
    const agency = this.latestAgencyRequest();
    return [
      { label: 'Identity verification', status: this.requestStatus(identity), complete: identity?.status === 'APPROVED' },
      { label: 'Business verification', status: this.requestStatus(agency), complete: agency?.status === 'APPROVED' },
      { label: 'Agency review', status: this.reviewStatus(agency), complete: agency?.status === 'APPROVED' },
    ];
  });
  readonly verificationAction = computed(() => {
    const status = this.latestAgencyRequest()?.status || this.dashboard()?.verification_status || 'UNVERIFIED';
    if (status === 'APPROVED' || status === 'VERIFIED') return 'View verification details';
    if (status === 'DRAFT') return 'Continue verification';
    if (status === 'CHANGES_REQUESTED') return 'Fix verification';
    if (['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(status)) return 'View verification';
    return 'Start verification';
  });
  readonly completeness = computed(() => {
    const value = this.form.getRawValue();
    const agency = this.dashboard()?.agency;
    return [
      { label: 'Basic information', done: !!value.name.trim() },
      { label: 'Contact details', done: !!value.email.trim() && !!value.phone.trim() },
      { label: 'Location', done: !!value.region && !!value.town },
      { label: 'Description', done: !!value.description.trim() },
      { label: 'Logo', done: !!this.logoPreview() || !!agency?.logo },
      { label: 'Verification', done: ['VERIFIED', 'APPROVED'].includes(agency?.verification_status || '') },
    ];
  });
  readonly completionPercent = computed(() => Math.round(this.completeness().filter((item) => item.done).length / 6 * 100));
  constructor() {
    this.reference.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.load();
  }
  load() {
    this.loading.set(true);
    this.loadError.set(false);
    this.api
      .mine()
      .pipe(
        switchMap((items) => (items[0] ? this.api.dashboard(items[0].id) : of(null))),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.dashboard.set(data);
          if (data) {
            this.form.patchValue(data.agency);
            this.initial = this.form.getRawValue();
            this.form.markAsPristine();
            this.logoPreview.set(data.agency.logo);
            this.loadVerification(data.agency.id);
          }
        },
        error: () => this.loadError.set(true),
      });
  }
  loadVerification(agencyId: string) {
    this.verificationLoading.set(true);
    this.verificationError.set(false);
    this.verificationApi.list().pipe(
      finalize(() => this.verificationLoading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (page) => this.verificationRequests.set((page.results || []).filter((item) => item.agency === agencyId || item.verification_type === 'IDENTITY')),
      error: () => this.verificationError.set(true),
    });
  }
  private requestStatus(request: VerificationRequestSummary | null) {
    if (!request) return 'Not started';
    return ({ APPROVED: 'Verified', REJECTED: 'Rejected', CHANGES_REQUESTED: 'Action required', DRAFT: 'Not submitted', SUBMITTED: 'Under review', UNDER_REVIEW: 'Under review', CANCELLED: 'Not started', EXPIRED: 'Expired' } as Record<string,string>)[request.status] || request.status.replaceAll('_',' ').toLowerCase().replace(/^./,(s) => s.toUpperCase());
  }
  private reviewStatus(request: VerificationRequestSummary | null) {
    if (!request) return 'Not started';
    if (request.status === 'APPROVED') return 'Approved';
    if (['SUBMITTED','UNDER_REVIEW'].includes(request.status)) return 'Pending';
    if (request.status === 'CHANGES_REQUESTED' || request.status === 'REJECTED') return 'Action required';
    return 'Not started';
  }
  location(a: Agency) {
    return [a.suburb, a.town, a.region, 'Eswatini'].filter(Boolean).join(', ');
  }
  verificationLabel(value: string) {
    return (
      (
        {
          VERIFIED: 'Verified',
          PENDING: 'Pending verification',
          REJECTED: 'Rejected',
          SUSPENDED: 'Suspended',
          UNVERIFIED: 'Not verified',
        } as Record<string, string>
      )[value] || 'Status unavailable'
    );
  }
  verificationTone(value: string) {
    return value === 'VERIFIED'
      ? 'good'
      : value === 'PENDING'
        ? 'warn'
        : value === 'REJECTED' || value === 'SUSPENDED'
          ? 'bad'
          : 'neutral';
  }
  fieldError(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    if (!c.invalid || !(c.touched || c.dirty)) return '';
    if (c.errors?.['required']) return 'This field is required.';
    if (c.errors?.['email']) return 'Enter a valid email address.';
    if (c.errors?.['pattern']) return 'Use a full https:// URL.';
    return 'Check this value.';
  }
  cancel() {
    if (this.initial) {
      this.form.reset(this.initial);
      this.form.markAsPristine();
      this.saveError.set('');
      this.logoPreview.set(this.dashboard()?.agency.logo || null);
    }
  }
  save(agency: Agency) {
    if (this.busy() || this.form.invalid || !this.canEdit()) return;
    this.busy.set(true);
    this.saveError.set('');
    this.saved.set(false);
    this.api
      .update(agency.id, this.form.getRawValue())
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => this.persist(updated),
        error: () => this.saveError.set('Could not update your agency profile. Please try again.'),
      });
  }
  changeLogo(files: FileList | null) {
    const agency = this.dashboard()?.agency;
    if (!agency || !files?.[0] || !this.canEdit()) return;
    const file = files[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.saveError.set('Choose a JPG, PNG or WebP logo.');
      return;
    }
    this.logoPreview.set(URL.createObjectURL(file));
    this.logoUploading.set(true);
    this.saveError.set('');
    const data = new FormData();
    data.set('logo', file);
    this.api
      .update(agency.id, data)
      .pipe(
        finalize(() => this.logoUploading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.persist(updated);
          this.toast.show({ kind: 'success', title: 'Agency logo updated' });
        },
        error: () => {
          this.logoPreview.set(agency.logo);
          this.saveError.set('Logo upload failed. Please try again.');
        },
      });
  }
  private persist(updated: Agency) {
    const current = this.dashboard();
    if (!current) return;
    this.dashboard.set({ ...current, agency: updated });
    this.form.patchValue(updated);
    this.initial = this.form.getRawValue();
    this.form.markAsPristine();
    this.logoPreview.set(updated.logo);
    this.saved.set(true);
    this.toast.show({ kind: 'success', title: 'Agency profile updated' });
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) event.preventDefault();
  }
}

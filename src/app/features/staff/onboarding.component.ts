import { Component, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { OnboardingApi, Prospect } from '../../core/api/onboarding-api.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe, JsonPipe],
  template: `<main>
    <h1>Onboarding prospects</h1>
    <p>Private demonstrations and owner approvals. Handoffs create drafts for normal review.</p>
    <div class="filters">
      <label>Business name<input [(ngModel)]="search" /></label
      ><label>Town<input [(ngModel)]="town" /></label>
      <label
        >Type<select [(ngModel)]="kind">
          <option value="">All</option>
          <option>STAY</option>
          <option>PROPERTY</option>
        </select></label
      >
      <label
        >Status<select [(ngModel)]="status">
          <option value="">All</option>
          @for (s of statuses; track s) {
            <option>{{ s }}</option>
          }
        </select></label
      >
      <button (click)="load()" [disabled]="busy()">Search</button
      ><button (click)="select(null)" [disabled]="!can('add_onboardingprospect')">
        New prospect
      </button>
    </div>
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
    }
    @if (notice()) {
      <p role="status">{{ notice() }}</p>
    }
    <div class="layout">
      <section aria-label="Prospect progress board">
        @for (p of prospects(); track p.id) {
          <button class="prospect" (click)="select(p)">
            <strong>{{ p.business_name }}</strong
            ><span>{{ p.kind }} · {{ p.town }} · {{ p.status }}</span
            ><span
              >Last contact:
              {{
                p.last_contacted_at ? (p.last_contacted_at | date: 'mediumDate') : 'Not recorded'
              }}</span
            ><span>{{ p.next_action || 'Set a next action' }}</span>
          </button>
        }
        @if (!prospects().length) {
          <p>No matching prospects.</p>
        }
        <button (click)="page = page - 1; load()" [disabled]="page <= 1 || busy()">Previous</button>
        <span> Page {{ page }} </span
        ><button (click)="page = page + 1; load()" [disabled]="!hasNext() || busy()">Next</button>
      </section>
      <section>
        <h2>{{ selected() ? 'Edit prospect' : 'New prospect' }}</h2>
        @if (selected(); as p) {
          <p>
            <strong>{{ p.status }}</strong> · Version {{ p.version }} · Approved version
            {{ p.approved_version || 'None' }}
          </p>
        }
        <form [formGroup]="form" (ngSubmit)="save()">
          <fieldset [disabled]="busy() || closed()">
            <label
              >Type<select formControlName="kind">
                <option>STAY</option>
                <option>PROPERTY</option>
              </select></label
            >
            @for (f of intake; track f.key) {
              <label>{{ f.label }}<input [formControlName]="f.key" /></label>
            }
            <label
              >Consent<select formControlName="consent_status">
                <option>UNKNOWN</option>
                <option>REQUESTED</option>
                <option>GRANTED</option>
                <option>WITHDRAWN</option>
              </select></label
            >
            <label>Consent evidence<textarea formControlName="consent_evidence"></textarea></label>
            <label
              >Source and permission for business content<textarea
                formControlName="source_evidence"
              ></textarea>
            </label>
            <label>Private staff notes<textarea formControlName="notes"></textarea></label>
            <h3>Preview content</h3>
            <p>
              Leave unknown values blank. Prices, amenities and availability are always marked
              unconfirmed.
            </p>
            <label>Description<textarea formControlName="description" rows="5"></textarea></label>
            <label>Address<input formControlName="address" /></label>
            @if (form.controls.kind.value === 'STAY') {
              <label
                >Stay category<select formControlName="stay_type">
                  @for (type of stayTypes; track type) {
                    <option>{{ type }}</option>
                  }
                </select></label
              >
              <h4>Room types</h4>
              <p>
                Optional. Include only owner-supplied indicative rates. Availability is not created
                by this preview.
              </p>
              @for (room of rooms; track $index; let i = $index) {
                <div class="room">
                  <label
                    >Room name<input
                      [ngModel]="room.name"
                      (ngModelChange)="room.name = $event"
                      [ngModelOptions]="{ standalone: true }"
                  /></label>
                  <label
                    >Indicative nightly rate (SZL)<input
                      type="number"
                      min="0"
                      [ngModel]="room.base_price"
                      (ngModelChange)="room.base_price = $event"
                      [ngModelOptions]="{ standalone: true }"
                  /></label>
                  <label
                    >Room quantity<input
                      type="number"
                      min="1"
                      [(ngModel)]="room.quantity"
                      [ngModelOptions]="{ standalone: true }"
                  /></label>
                  <button type="button" (click)="rooms.splice(i, 1)">Remove room</button>
                </div>
              }
              <button type="button" (click)="rooms.push({ name: '', base_price: '', quantity: 1 })">
                Add room type
              </button>
            } @else {
              <label
                >Listing type<select formControlName="listing_type">
                  <option>RENT</option>
                  <option>SALE</option>
                </select></label
              >
              <label
                >Property type<select formControlName="property_type">
                  @for (type of propertyTypes; track type) {
                    <option>{{ type }}</option>
                  }
                </select></label
              >
              <label
                >Indicative price (SZL)<input type="number" min="0" formControlName="price"
              /></label>
            }
            <button
              type="submit"
              [disabled]="
                selected() ? !can('change_onboardingprospect') : !can('add_onboardingprospect')
              "
            >
              Save content
            </button>
          </fieldset>
        </form>
        @if (selected(); as p) {
          <h3>Private images</h3>
          <p>
            JPG, PNG or WebP, up to 5 MB each. Images are stored privately; record permission before
            uploading.
          </p>
          @for (image of p.images; track image.id) {
            <p>
              {{ image.caption || 'Image' }} · {{ image.source }}
              <button (click)="run('image', { remove: image.id })" [disabled]="busy() || closed()">
                Remove
              </button>
            </p>
          }
          <label
            >Image<input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              (change)="imageFile = $any($event.target).files[0]"
          /></label>
          <label>Caption<input [(ngModel)]="imageCaption" /></label
          ><label>Source<input [(ngModel)]="imageSource" /></label>
          <label>Permission evidence<textarea [(ngModel)]="imagePermission"></textarea></label>
          <button
            (click)="upload()"
            [disabled]="busy() || !imageFile || closed() || !can('change_onboardingprospect')"
          >
            Upload private image
          </button>
          <h3>Review and handoff</h3>
          <p>
            Save edits before taking an action. New content invalidates earlier links and approvals.
          </p>
          <label
            >Action evidence<textarea
              [(ngModel)]="evidence"
              placeholder="Record who confirmed, how identity and rights were checked, and the signed approval reference."
            ></textarea>
          </label>
          <label class="check"
            ><input type="checkbox" [(ngModel)]="rights" /> Listing and photo rights explicitly
            confirmed</label
          >
          <label
            >Agency ID (optional, recipient must be owner/admin)<input [(ngModel)]="agency"
          /></label>
          <div class="actions">
            <button
              (click)="run('prepare')"
              [disabled]="busy() || form.dirty || closed() || !can('change_onboardingprospect')"
            >
              Prepare preview
            </button>
            <button
              (click)="issue()"
              [disabled]="busy() || form.dirty || closed() || !can('issue_onboarding')"
            >
              Generate preview link
            </button>
            <button
              (click)="run('revoke')"
              [disabled]="busy() || form.dirty || closed() || !can('issue_onboarding')"
            >
              Revoke link
            </button>
            <button
              (click)="run('transition', { status: 'PREVIEW_SENT', evidence })"
              [disabled]="busy() || form.dirty || closed() || !can('change_onboardingprospect')"
            >
              Record preview sent
            </button>
            <button
              (click)="run('transition', { status: 'CHANGES_REQUESTED', evidence })"
              [disabled]="busy() || form.dirty || closed() || !can('change_onboardingprospect')"
            >
              Record requested changes
            </button>
            <button
              (click)="run('approve', { evidence, rights_confirmed: rights })"
              [disabled]="busy() || form.dirty || closed() || !rights || !can('approve_onboarding')"
            >
              Record approval
            </button>
            <button
              (click)="run('invite', { evidence, agency: agency || null })"
              [disabled]="busy() || form.dirty || closed() || !can('handoff_onboarding')"
            >
              Invite owner to claim
            </button>
            <button
              (click)="run('transition', { status: 'CLOSED', evidence })"
              [disabled]="busy() || form.dirty || closed() || !can('change_onboardingprospect')"
            >
              Close prospect
            </button>
          </div>
          @if (previewLink()) {
            <label
              >Private link (expires in seven days)<input readonly [value]="previewLink()" /></label
            ><button (click)="copy(previewLink())">Copy preview link</button>
            <p>Generated only. No message has been sent.</p>
          }
          @if (p.status === 'CLAIM_PENDING') {
            <label>Owner acceptance link<input readonly [value]="claimLink(p)" /></label
            ><button (click)="copy(claimLink(p))">Copy owner invitation</button>
            <p>
              The verified invited account must accept. Handoff completes automatically after
              acceptance.
            </p>
          }
          <details>
            <summary>Manual outreach template</summary>
            <p>
              Hello {{ p.contact_name || p.business_name }}, SurePlace can prepare a private
              demonstration of your business profile. May we use the description and photos you
              provide for this purpose? Please confirm that you have permission to share them.
              Nothing will be published or bookable until you approve the content, claim your draft
              and complete the normal review process. Reply with any corrections or permission
              preferences.
            </p>
          </details>
          <h3>Audit history</h3>
          @for (event of p.audit; track event.id) {
            <details>
              <summary>
                {{ event.created_at | date: 'short' }} · {{ event.action }} · v{{ event.version }}
              </summary>
              <pre>{{ event.evidence | json }}</pre>
            </details>
          }
        }
      </section>
    </div>
  </main>`,
  styles: [
    `
      main {
        padding: clamp(1rem, 3vw, 2rem);
        color: var(--midnight);
      }
      .filters,
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        align-items: end;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(180px, 1fr) minmax(0, 2fr);
        gap: 1.5rem;
        margin-top: 1.5rem;
      }
      section {
        min-width: 0;
      }
      fieldset {
        border: 0;
        padding: 0;
        min-width: 0;
      }
      label {
        display: grid;
        gap: 0.35rem;
        margin: 0.65rem 0;
      }
      input,
      textarea,
      select {
        width: 100%;
        box-sizing: border-box;
        min-width: 0;
        padding: 0.65rem;
        border: 1px solid #b9ceca;
        border-radius: 8px;
        background: white;
        font: inherit;
      }
      button {
        padding: 0.65rem 1rem;
        border: 1px solid #b9ceca;
        border-radius: 8px;
        background: white;
        color: #005c56;
        cursor: pointer;
        white-space: normal;
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .prospect {
        display: grid;
        text-align: left;
        gap: 0.4rem;
        width: 100%;
        margin-bottom: 0.75rem;
      }
      .prospect span {
        font-size: 0.85rem;
      }
      .check {
        display: flex;
        align-items: center;
      }
      .check input {
        width: auto;
      }
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .error {
        color: #a52626;
      }
      .room {
        border: 1px solid #dde6e4;
        padding: 0.75rem;
        border-radius: 10px;
        margin-bottom: 1rem;
      }
      @media (max-width: 700px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .filters > label {
          width: 100%;
        }
      }
    `,
  ],
})
export class OnboardingComponent {
  api = inject(OnboardingApi);
  auth = inject(AuthService);
  fb = inject(FormBuilder);
  prospects = signal<Prospect[]>([]);
  selected = signal<Prospect | null>(null);
  busy = signal(false);
  error = signal('');
  notice = signal('');
  previewLink = signal('');
  hasNext = signal(false);
  search = '';
  town = '';
  kind = '';
  status = '';
  page = 1;
  evidence = '';
  rights = false;
  agency = '';
  imageFile: File | null = null;
  imageCaption = '';
  imageSource = '';
  imagePermission = '';
  rooms: { name: string; base_price: string | number; quantity: number }[] = [];
  statuses = [
    'NEW',
    'CONTENT_GATHERING',
    'PREVIEW_READY',
    'PREVIEW_SENT',
    'CHANGES_REQUESTED',
    'APPROVED',
    'CLAIM_PENDING',
    'HANDED_OFF',
    'CLOSED',
  ];
  stayTypes = [
    'HOTEL',
    'GUEST_HOUSE',
    'LODGE',
    'BNB',
    'SELF_CATERING',
    'SHORT_STAY',
    'RESORT',
    'HOSTEL',
    'OTHER',
  ];
  propertyTypes = [
    'HOUSE',
    'APARTMENT',
    'TOWNHOUSE',
    'FLAT',
    'LAND',
    'OFFICE',
    'SHOP',
    'WAREHOUSE',
    'COMMERCIAL',
    'OTHER',
  ];
  intake = [
    { key: 'business_name', label: 'Business name' },
    { key: 'town', label: 'Town' },
    { key: 'region', label: 'Region' },
    { key: 'contact_name', label: 'Private contact person' },
    { key: 'contact_email', label: 'Private contact email' },
    { key: 'contact_phone', label: 'Private contact phone' },
    { key: 'assigned_staff', label: 'Responsible staff user ID (optional)' },
    { key: 'next_action', label: 'Next action' },
  ];
  form = this.fb.nonNullable.group({
    kind: 'STAY',
    business_name: '',
    town: '',
    region: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    assigned_staff: '',
    next_action: '',
    consent_status: 'UNKNOWN',
    consent_evidence: '',
    source_evidence: '',
    notes: '',
    description: '',
    address: '',
    stay_type: 'GUEST_HOUSE',
    listing_type: 'RENT',
    property_type: 'HOUSE',
    price: '',
  });
  constructor() {
    this.load();
  }
  can(key: string) {
    const user = this.auth.user();
    return !!user?.is_superuser || !!user?.staff_permissions?.includes('core.' + key);
  }
  dirty = () => this.form.dirty;
  saveState = () => (this.busy() ? 'saving' : 'idle');
  closed() {
    return ['CLOSED', 'HANDED_OFF'].includes(this.selected()?.status || '');
  }
  load() {
    this.busy.set(true);
    this.api
      .list({
        search: this.search,
        town: this.town,
        kind: this.kind,
        status: this.status,
        page: String(this.page),
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (r) => {
          this.prospects.set(r.results);
          this.hasNext.set(!!(r as unknown as { next: string }).next);
        },
        error: (e) => this.fail(e),
      });
  }
  select(p: Prospect | null) {
    this.selected.set(p);
    this.previewLink.set('');
    this.error.set('');
    this.evidence = '';
    this.rights = false;
    this.form.reset();
    this.rooms = [];
    if (p) {
      this.form.patchValue({
        ...p,
        assigned_staff: p.assigned_staff || '',
        ...p.draft_payload,
      } as Partial<ReturnType<typeof this.form.getRawValue>>);
      this.rooms = structuredClone((p.draft_payload['room_types'] || []) as typeof this.rooms);
    }
  }
  save() {
    const v = this.form.getRawValue();
    const { description, address, stay_type, listing_type, property_type, price, ...intake } = v;
    const content: Record<string, unknown> = {
      ...this.selected()?.draft_payload,
      description,
      address,
      town: v.town,
      region: v.region,
    };
    if (v.kind === 'STAY') {
      Object.assign(content, {
        name: v.business_name,
        stay_type,
        room_types: this.rooms
          .map((r) => ({
            ...r,
            ...(r.base_price === '' ? {} : { base_price: String(r.base_price) }),
          }))
          .map((r) => {
            if (r.base_price === '') delete (r as Partial<typeof r>).base_price;
            return r;
          }),
      });
    } else {
      Object.assign(content, { title: v.business_name, listing_type, property_type });
      if (price !== '') content['price'] = String(price);
      else delete content['price'];
    }
    const body = {
      ...intake,
      assigned_staff: v.assigned_staff || null,
      draft_payload: content,
      version: this.selected()?.version,
    };
    this.perform(
      this.selected() ? this.api.update(this.selected()!.id, body) : this.api.create(body),
    );
  }
  run(action: string, data: Record<string, unknown> = {}) {
    const p = this.selected();
    if (p) this.perform(this.api.action(p.id, action, { ...data, version: p.version }));
  }
  perform(call: Observable<Prospect>) {
    this.busy.set(true);
    this.error.set('');
    call.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (p) => {
        this.select(p);
        this.notice.set('Saved. No messages have been sent.');
        this.load();
      },
      error: (e) => this.fail(e),
    });
  }
  issue() {
    const p = this.selected();
    if (!p) return;
    this.busy.set(true);
    this.api
      .issue(p.id, p.version)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (r) =>
          this.previewLink.set(environment.frontendOrigin + '/private-preview#' + r.token),
        error: (e) => this.fail(e),
      });
  }
  claimLink(p: Prospect) {
    return environment.frontendOrigin + '/account/onboarding-claim/' + p.id;
  }
  upload() {
    const p = this.selected();
    if (!p || !this.imageFile) return;
    const data = new FormData();
    data.set('version', String(p.version));
    data.set('image', this.imageFile);
    data.set('caption', this.imageCaption);
    data.set('source', this.imageSource);
    data.set('permission_evidence', this.imagePermission);
    this.perform(this.api.action(p.id, 'image', data));
  }
  async copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.notice.set('Link copied. Send it manually to the intended recipient.');
    } catch {
      this.notice.set('Select the link and copy it manually.');
    }
  }
  fail(e: unknown) {
    const error = normalizeApiError(e);
    this.error.set(
      error.message +
        ' ' +
        Object.values(error.errors || {})
          .flat()
          .join(' '),
    );
  }
}

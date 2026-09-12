import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { StaffApiService } from '../../core/api/staff-api.service';
import { StaffProperty } from '../../core/models/staff.models';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, SmartImageComponent],
  template: `<section class="staff-page">
    <a class="back" routerLink="/staff/listings"
      ><i class="fa-solid fa-chevron-left" aria-hidden="true"></i> Listings</a
    >

    @if (loading()) {
      <div class="skeleton"></div>
    } @else if (error()) {
      <div class="state">
        <p>{{ error() }}</p>
        <button type="button" (click)="load()">Retry</button>
      </div>
    } @else if (listing()) {
      <header>
        <div>
          <p class="eyebrow">{{ listing()!.public_id }}</p>
          <h1>{{ listing()!.title }}</h1>
          <p>
            {{ listing()!.suburb ? listing()!.suburb + ', ' : '' }}{{ listing()!.town }},
            {{ listing()!.region }}
          </p>
        </div>
        <span [class]="statusClass(listing()!.status)">{{ listing()!.status_label }}</span>
      </header>

      <div class="actions">
        @if (listing()!.status === 'SUBMITTED') {
          <button type="button" (click)="run('start')">
            <i class="fa-solid fa-eye" aria-hidden="true"></i> Start review
          </button>
        }
        @if (['SUBMITTED', 'UNDER_REVIEW'].includes(listing()!.status)) {
          <button class="primary" type="button" (click)="run('approve')">
            <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Approve
          </button>
          <button type="button" (click)="run('changes')">
            <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Request changes
          </button>
        }
        @if (['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(listing()!.status)) {
          <button class="danger" type="button" (click)="run('reject')">
            <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> Reject
          </button>
        }
        @if (listing()!.status === 'PUBLISHED') {
          <a [routerLink]="['/properties', listing()!.slug]" target="_blank">
            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Public listing
          </a>
          <button class="danger" type="button" (click)="run('suspend')">
            <i class="fa-solid fa-ban" aria-hidden="true"></i> Suspend
          </button>
        }
        @if (listing()!.status === 'SUSPENDED') {
          <button class="primary" type="button" (click)="run('restore')">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Restore
          </button>
        }
      </div>

      @if (needsFeedback()) {
        <section class="panel feedback">
          <h2>{{ feedbackTitle() }}</h2>
          <textarea
            rows="4"
            [(ngModel)]="feedback"
            placeholder="Write clear internal and advertiser-facing feedback"
          ></textarea>
          <div>
            <button type="button" (click)="cancelFeedback()">Cancel</button>
            <button class="primary" type="button" [disabled]="busy()" (click)="confirmFeedback()">
              Confirm
            </button>
          </div>
        </section>
      }

      <div class="grid">
        <section class="panel summary">
          <h2>Listing</h2>
          <dl>
            <div>
              <dt>Price</dt>
              <dd>{{ formatMoney(listing()!.price, listing()!.currency) }}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{{ listing()!.listing_type }} / {{ listing()!.property_type }}</dd>
            </div>
            <div>
              <dt>Rooms</dt>
              <dd>{{ listing()!.bedrooms || 0 }} bed · {{ listing()!.bathrooms || 0 }} bath</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{{ listing()!.verification_status }}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>{{ listing()!.availability_status }}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{{ listing()!.created_at | date: 'medium' }}</dd>
            </div>
          </dl>
          <p>{{ listing()!.description || 'No description supplied.' }}</p>
        </section>

        <section class="panel advertiser">
          <h2>Advertiser</h2>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{{ ownerName() }}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{{ listing()!.owner.email }}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{{ listing()!.owner.phone_number || 'Not provided' }}</dd>
            </div>
            <div>
              <dt>Email verified</dt>
              <dd>{{ listing()!.owner.is_email_verified ? 'Yes' : 'No' }}</dd>
            </div>
            @if (listing()!.agency) {
              <div>
                <dt>Agency</dt>
                <dd>{{ listing()!.agency!.name }}</dd>
              </div>
              <div>
                <dt>Agency verification</dt>
                <dd>{{ listing()!.agency!.verification_status }}</dd>
              </div>
            }
          </dl>
        </section>
      </div>

      <section class="panel">
        <h2>Photos</h2>
        @if (!listing()!.images.length) {
          <p class="muted">No photos have been uploaded.</p>
        } @else {
          <div class="photos">
            @for (image of listing()!.images; track image.id) {
              <figure>
                <sp-image
                  [src]="image.image"
                  [alt]="image.caption || listing()!.title"
                  ratio="4 / 3"
                />
                <figcaption>
                  @if (image.is_cover) {
                    Cover
                  } @else {
                    Photo {{ image.sort_order + 1 }}
                  }
                </figcaption>
              </figure>
            }
          </div>
        }
      </section>

      <div class="grid">
        <section class="panel map">
          <h2>Location</h2>
          @if (mapUrl()) {
            <iframe title="Listing map" [src]="mapUrl()"></iframe>
            <p class="muted">{{ listing()!.latitude }}, {{ listing()!.longitude }}</p>
          } @else {
            <p class="muted">No map location has been set.</p>
          }
        </section>

        <section class="panel">
          <h2>Open reports</h2>
          @if (!listing()!.reports?.length) {
            <p class="muted">No reports are attached to this listing.</p>
          } @else {
            <div class="events">
              @for (report of listing()!.reports; track report.id) {
                <article>
                  <strong>{{ report.reason }}</strong>
                  <p>{{ report.details || 'No extra detail.' }}</p>
                  <small
                    >{{ report.reporter_email }} · {{ report.created_at | date: 'medium' }}</small
                  >
                </article>
              }
            </div>
          }
        </section>
      </div>

      <section class="panel note-form">
        <h2>Internal note</h2>
        <textarea
          rows="3"
          [(ngModel)]="note"
          placeholder="Add a staff-only moderation note"
        ></textarea>
        <button type="button" [disabled]="busy() || !note.trim()" (click)="addNote()">
          Save note
        </button>
      </section>

      <section class="panel">
        <h2>Moderation history</h2>
        @if (!listing()!.audit_events?.length) {
          <p class="muted">No moderation history yet.</p>
        } @else {
          <div class="events">
            @for (event of listing()!.audit_events; track event.id) {
              <article>
                <strong>{{ event.action }}</strong>
                <p>{{ event.reason || 'No note supplied.' }}</p>
                <small>{{ event.actor_name }} · {{ event.created_at | date: 'medium' }}</small>
              </article>
            }
          </div>
        }
      </section>
    }
  </section>`,
  styles: [
    `
      .staff-page {
        display: grid;
        gap: 1rem;
      }
      .back,
      .actions a,
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        min-height: 40px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        color: var(--midnight);
        padding: 0 0.85rem;
        text-decoration: none;
        font-weight: 850;
      }
      header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: start;
      }
      h1,
      h2,
      p,
      dl,
      figure {
        margin: 0;
      }
      .eyebrow {
        color: var(--teal);
        font-weight: 850;
        text-transform: uppercase;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
      }
      .primary {
        background: var(--teal);
        border-color: var(--teal);
        color: #fff;
      }
      .danger {
        color: var(--danger);
      }
      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
        gap: 1rem;
      }
      .panel,
      .state,
      .skeleton {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
      }
      .panel {
        display: grid;
        gap: 0.85rem;
        padding: 1rem;
      }
      dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.65rem;
      }
      dt {
        color: var(--slate);
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
      }
      dd {
        margin: 0;
        font-weight: 850;
      }
      .status {
        padding: 0.35rem 0.6rem;
        border-radius: 999px;
        background: var(--mist);
        font-weight: 850;
      }
      .status.review {
        color: #6f5300;
        background: #fff4d8;
      }
      .status.live {
        color: #08705f;
        background: #ddf6ef;
      }
      .status.danger {
        color: var(--danger);
        background: #ffe8eb;
      }
      .muted,
      small,
      .summary p {
        color: var(--slate);
      }
      .photos {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 0.75rem;
      }
      figcaption {
        margin-top: 0.35rem;
        color: var(--slate);
        font-size: 0.85rem;
      }
      iframe {
        width: 100%;
        min-height: 260px;
        border: 0;
        border-radius: var(--radius-sm);
      }
      textarea {
        width: 100%;
        resize: vertical;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
      }
      .feedback div {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .note-form button {
        justify-self: start;
      }
      .events {
        display: grid;
        gap: 0.65rem;
      }
      .events article {
        display: grid;
        gap: 0.25rem;
        padding-top: 0.65rem;
        border-top: 1px solid var(--line);
      }
      .state {
        padding: 2rem;
        text-align: center;
      }
      .skeleton {
        height: 360px;
      }
      @media (max-width: 800px) {
        header,
        .grid {
          grid-template-columns: 1fr;
          display: grid;
        }
        dl {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StaffListingDetailComponent {
  private api = inject(StaffApiService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  listing = signal<StaffProperty | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  feedback = '';
  note = '';
  pendingAction = signal<'changes' | 'reject' | 'suspend' | null>(null);
  readonly formatMoney = formatMoney;
  mapUrl = computed<SafeResourceUrl | null>(() => {
    const listing = this.listing();
    if (!listing?.latitude || !listing.longitude) return null;
    const lat = listing.latitude;
    const lng = listing.longitude;
    const delta = 0.012;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .property(this.route.snapshot.paramMap.get('id') || '')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (listing) => this.listing.set(listing),
        error: () => this.error.set('Listing could not be loaded.'),
      });
  }

  ownerName() {
    const owner = this.listing()?.owner;
    return owner ? `${owner.first_name} ${owner.last_name}`.trim() || owner.email : '';
  }

  needsFeedback() {
    return this.pendingAction() !== null;
  }

  feedbackTitle() {
    return this.pendingAction() === 'changes'
      ? 'Request listing changes'
      : this.pendingAction() === 'reject'
        ? 'Reject listing'
        : 'Suspend listing';
  }

  cancelFeedback() {
    this.pendingAction.set(null);
    this.feedback = '';
  }

  run(action: 'start' | 'approve' | 'changes' | 'reject' | 'suspend' | 'restore') {
    const listing = this.listing();
    if (!listing) return;
    if (['changes', 'reject', 'suspend'].includes(action)) {
      this.pendingAction.set(action as 'changes' | 'reject' | 'suspend');
      return;
    }
    this.busy.set(true);
    const request =
      action === 'start'
        ? this.api.startReview(listing.id)
        : action === 'approve'
          ? this.api.approve(listing.id)
          : this.api.restore(listing.id);
    request
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe((updated) => this.listing.set(updated));
  }

  confirmFeedback() {
    const listing = this.listing();
    const action = this.pendingAction();
    const feedback = this.feedback.trim();
    if (!listing || !action || !feedback) return;
    this.busy.set(true);
    const request =
      action === 'changes'
        ? this.api.requestChanges(listing.id, feedback)
        : action === 'reject'
          ? this.api.reject(listing.id, feedback)
          : this.api.suspend(listing.id, feedback);
    request.pipe(finalize(() => this.busy.set(false))).subscribe((updated) => {
      this.listing.set(updated);
      this.cancelFeedback();
    });
  }

  addNote() {
    const listing = this.listing();
    const note = this.note.trim();
    if (!listing || !note) return;
    this.busy.set(true);
    this.api
      .addNote(listing.id, note)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe((updated) => {
        this.listing.set(updated);
        this.note = '';
      });
  }

  statusClass(status: string) {
    if (['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(status)) return 'status review';
    if (status === 'PUBLISHED') return 'status live';
    if (['REJECTED', 'SUSPENDED'].includes(status)) return 'status danger';
    return 'status';
  }
}

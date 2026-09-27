import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StaffApiService } from '../../core/api/staff-api.service';
import { StaffUserReview, StaffVerificationRequest } from '../../core/models/staff.models';
import { ToastService } from '../../core/services/toast.service';

type StaffOperation = 'agencies' | 'verification' | 'users';

type WorkspaceConfig = {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  queueLabel: string;
  queueDescription: string;
  workflow: { title: string; description: string; icon: string }[];
  safeguards: string[];
  dependency: string;
};

const WORKSPACES: Record<StaffOperation, WorkspaceConfig> = {
  agencies: {
    eyebrow: 'Marketplace integrity',
    title: 'Agency reviews',
    description: 'Review agency evidence and manage the trust signals shown to property seekers.',
    icon: 'fa-solid fa-building-shield',
    queueLabel: 'Agency review queue',
    queueDescription: 'Agency verification requests are grouped here for a documented decision.',
    workflow: [
      { title: 'Assess the agency', description: 'Check the business, its public profile and submitted evidence.', icon: 'fa-regular fa-building' },
      { title: 'Record a decision', description: 'Approve, request changes or decline with a clear internal audit entry.', icon: 'fa-solid fa-clipboard-check' },
      { title: 'Keep trust current', description: 'Review changes and suspend a trust signal when evidence no longer supports it.', icon: 'fa-solid fa-shield-halved' },
    ],
    safeguards: ['Evidence stays private to authorised reviewers.', 'Every decision should include a clear reason.', 'Verification supports trust; it does not guarantee a transaction.'],
    dependency: 'No agency verification requests are currently available to this staff account.',
  },
  verification: {
    eyebrow: 'Trust & safety',
    title: 'Verification queue',
    description: 'Work through identity, agency, property, stay and business evidence in one consistent review flow.',
    icon: 'fa-solid fa-shield-halved',
    queueLabel: 'Verification requests',
    queueDescription: 'Submitted verification requests will be prioritised here by status and submission date.',
    workflow: [
      { title: 'Check requirements', description: 'Confirm every required document is present and relates to the right entity.', icon: 'fa-solid fa-list-check' },
      { title: 'Review evidence', description: 'Inspect protected documents without exposing them outside the staff workspace.', icon: 'fa-regular fa-file-lines' },
      { title: 'Communicate clearly', description: 'Request only the missing evidence and leave an auditable outcome.', icon: 'fa-regular fa-message' },
    ],
    safeguards: ['Keep verification documents confidential.', 'Ask for the minimum additional evidence needed.', 'Use consistent notes so applicants understand the next step.'],
    dependency: 'No verification requests are currently available to this staff account.',
  },
  users: {
    eyebrow: 'Account safety',
    title: 'User review',
    description: 'Give staff one calm, accountable place to investigate account-level safety concerns.',
    icon: 'fa-solid fa-user-shield',
    queueLabel: 'Account safety cases',
    queueDescription: 'Browse the staff-only account directory when investigating a safety concern.',
    workflow: [
      { title: 'Understand the context', description: 'Review account history, reports and related listings before acting.', icon: 'fa-solid fa-magnifying-glass' },
      { title: 'Apply a proportionate action', description: 'Use warnings, restrictions or escalation only when the evidence supports it.', icon: 'fa-solid fa-scale-balanced' },
      { title: 'Leave an audit trail', description: 'Record what changed, why it changed and when it should be reconsidered.', icon: 'fa-solid fa-clock-rotate-left' },
    ],
    safeguards: ['Handle account information as confidential.', 'Use the least restrictive appropriate action.', 'Escalate urgent safety concerns through the team process.'],
    dependency: 'No user records are currently available to this staff account.',
  },
};

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @if (workspace(); as data) {
      <section class="operations-page">
        <header class="page-heading">
          <div>
            <p class="eyebrow"><i [class]="data.icon" aria-hidden="true"></i> {{ data.eyebrow }}</p>
            <h1>{{ data.title }}</h1>
            <p>{{ data.description }}</p>
          </div>
          <a routerLink="/staff/listings" class="listing-link">
            <i class="fa-solid fa-building-user" aria-hidden="true"></i> Listing moderation
          </a>
        </header>

        <section class="queue-card" aria-labelledby="queue-title">
          <div class="queue-icon"><i [class]="data.icon" aria-hidden="true"></i></div>
          <div>
            <p class="section-label">Review workspace</p>
            <h2 id="queue-title">{{ data.queueLabel }}</h2>
            <p>{{ data.queueDescription }}</p>
          </div>
          <span class="connection-status"><i class="fa-solid fa-plug-circle-check"></i> Live data source</span>
        </section>

        @if (loading()) {
          <section class="queue-state" role="status"><i class="fa-solid fa-spinner fa-spin"></i> Loading review cases…</section>
        } @else if (error()) {
          <section class="queue-state error" role="alert"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>Cases could not be loaded</strong><p>{{ error() }}</p></div><button type="button" (click)="load()">Try again</button></section>
        } @else if (workspaceKey() === 'users') {
          @if (users().length) {
            <section class="case-table" aria-label="User review cases">
              @for (user of users(); track user.id) {
                <article>
                  <span class="case-avatar">{{ initials(user.display_name) }}</span>
                  <div><h3><a [routerLink]="['/staff/users', user.id]">{{ user.display_name }}</a></h3><p>{{ user.email }}</p></div>
                  <span [class]="user.is_active ? 'status active' : 'status restricted'">{{ user.is_active ? 'Active account' : 'Restricted account' }}</span>
                  <small>Joined {{ user.date_joined | date: 'd MMM y' }}</small>
                  <span class="verification">{{ user.is_email_verified ? 'Email verified' : 'Email unverified' }}</span>
                </article>
              }
            </section>
          } @else {
            <section class="empty-queue"><span class="empty-icon"><i class="fa-solid fa-user-check"></i></span><h2>No users need review</h2><p>No user records were returned for this staff workspace.</p></section>
          }
        } @else if (requests().length) {
          <section class="case-table" aria-label="Verification review cases">
            @for (request of requests(); track request.id) {
              <article>
                <span class="case-avatar"><i [class]="typeIcon(request.verification_type)"></i></span>
                <div><h3><a [routerLink]="detailLink(request)">{{ request.entity_name }}</a></h3><p>{{ request.applicant_name }} · {{ request.applicant_email }}</p></div>
                <span [class]="'status ' + request.status.toLowerCase()">{{ statusLabel(request.status) }}</span>
                <small>{{ submittedLabel(request) }}</small>
                <span class="verification">{{ documentLabel(request) }}</span>
                <div class="case-actions">
                  @if (request.status === 'SUBMITTED') {
                    <button type="button" (click)="review(request, 'start')" [disabled]="busy() === request.id">{{ busy() === request.id ? 'Starting…' : 'Start review' }}</button>
                  }
                  @if (request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW') {
                    <button type="button" class="approve" (click)="review(request, 'approve')" [disabled]="busy() === request.id">{{ busy() === request.id ? 'Saving…' : 'Approve' }}</button>
                    <button type="button" class="reject" (click)="review(request, 'reject')" [disabled]="busy() === request.id">{{ busy() === request.id ? 'Saving…' : 'Reject' }}</button>
                  }
                </div>
              </article>
            }
          </section>
        } @else {
          <section class="empty-queue" aria-live="polite">
            <span class="empty-icon"><i class="fa-solid fa-inbox" aria-hidden="true"></i></span>
            <h2>No cases in this queue</h2>
            <p>{{ data.dependency }}</p>
            <small>There are no matching cases available to this staff account.</small>
          </section>
        }

        <section class="workflow-section" aria-labelledby="workflow-title">
          <div class="section-heading">
            <p class="section-label">Designed for careful decisions</p>
            <h2 id="workflow-title">A focused review flow</h2>
          </div>
          <div class="workflow-grid">
            @for (step of data.workflow; track step.title; let index = $index) {
              <article>
                <span class="step-number">0{{ index + 1 }}</span>
                <span class="step-icon"><i [class]="step.icon" aria-hidden="true"></i></span>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </article>
            }
          </div>
        </section>

        <aside class="safeguard-card">
          <span><i class="fa-solid fa-lock" aria-hidden="true"></i></span>
          <div>
            <h2>Review safeguards</h2>
            <ul>
              @for (item of data.safeguards; track item) {
                <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i>{{ item }}</li>
              }
            </ul>
          </div>
        </aside>
      </section>
    }
  `,
  styles: [
    `
      .operations-page { display: grid; gap: 1.25rem; max-width: 1180px; }
      .page-heading { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: 1.6rem; border: 1px solid var(--line); border-radius: 1rem; background: linear-gradient(135deg, #fff 55%, #e9f8f4); }
      .eyebrow, .section-label { margin: 0 0 .35rem; color: var(--teal); font-size: .72rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
      .page-heading h1, h2, h3, p { margin-top: 0; }
      .page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4vw, 3rem); }
      .page-heading > div > p:last-child { max-width: 620px; margin-bottom: 0; color: var(--slate); line-height: 1.55; }
      .listing-link { display: inline-flex; align-items: center; gap: .5rem; min-height: 42px; padding: 0 .9rem; border: 1px solid var(--line); border-radius: .65rem; color: var(--midnight); background: #fff; text-decoration: none; font-size: .85rem; font-weight: 800; white-space: nowrap; }
      .queue-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 1rem; padding: 1.25rem; border: 1px solid #bce8dc; border-radius: 1rem; background: #f4fcf9; }
      .queue-icon, .empty-icon, .step-icon, .safeguard-card > span { display: grid; place-items: center; flex: 0 0 auto; border-radius: .8rem; color: var(--teal); background: #dff5ee; }
      .queue-icon { width: 52px; height: 52px; font-size: 1.25rem; }
      .queue-card h2 { margin-bottom: .25rem; font-size: 1.15rem; }
      .queue-card p:last-child { margin-bottom: 0; color: var(--slate); font-size: .9rem; }
      .connection-status { display: inline-flex; align-items: center; gap: .4rem; padding: .4rem .6rem; border-radius: 999px; color: #17633b; background: #e1f5e9; font-size: .75rem; font-weight: 850; white-space: nowrap; }
      .queue-state { display: flex; align-items: center; justify-content: center; gap: .7rem; min-height: 140px; padding: 1.25rem; border: 1px solid var(--line); border-radius: 1rem; background: #fff; color: var(--slate); font-weight: 750; }
      .queue-state > i { color: var(--teal); font-size: 1.2rem; }
      .queue-state.error { justify-content: flex-start; color: var(--midnight); } .queue-state.error p { margin: .25rem 0 0; color: var(--slate); font-weight: 500; } .queue-state button { margin-left: auto; min-height: 38px; padding: 0 .75rem; border: 1px solid var(--line); border-radius: .55rem; background: #fff; color: var(--midnight); font: inherit; font-weight: 800; }
      .empty-queue { display: grid; justify-items: center; gap: .45rem; min-height: 235px; padding: 2rem; border: 1px dashed #b7cbc5; border-radius: 1rem; background: #fff; text-align: center; }
      .empty-icon { width: 48px; height: 48px; margin-bottom: .25rem; font-size: 1.2rem; }
      .empty-queue h2 { margin-bottom: 0; font-size: 1.08rem; }
      .empty-queue p { max-width: 560px; margin-bottom: 0; color: var(--slate); line-height: 1.55; }
      .empty-queue small { color: #60706f; font-size: .76rem; }
      .case-table { display: grid; overflow: hidden; border: 1px solid var(--line); border-radius: 1rem; background: #fff; }
      .case-table article { display: grid; grid-template-columns: auto minmax(190px, 1fr) auto minmax(120px, .45fr) minmax(110px, .4fr) auto; align-items: center; gap: .85rem; padding: 1rem 1.15rem; border-bottom: 1px solid var(--line); }
      .case-table article:last-child { border-bottom: 0; } .case-avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: #e1f5ef; color: var(--teal); font-size: .76rem; font-weight: 900; } .case-table h3, .case-table p { margin: 0; } .case-table h3 { font-size: .92rem; } .case-table h3 a { color: var(--midnight); text-decoration: none; } .case-table h3 a:hover { color: var(--teal); text-decoration: underline; } .case-table p, .case-table small { color: var(--slate); font-size: .76rem; } .status, .verification { width: max-content; padding: .28rem .5rem; border-radius: 999px; font-size: .72rem; font-weight: 850; } .status { color: #8a5a00; background: #fff4dd; } .status.under_review, .status.active { color: #17633b; background: #e6f7ef; } .status.approved { color: #17633b; background: #e6f7ef; } .status.rejected, .status.restricted { color: #9b2525; background: #fde8e8; } .verification { color: #235f9f; background: #e9f1fb; }
      .case-actions { display: flex; gap: .35rem; } .case-actions button { min-height: 32px; padding: 0 .55rem; border: 1px solid var(--line); border-radius: .45rem; background: #fff; color: var(--midnight); font: inherit; font-size: .72rem; font-weight: 850; } .case-actions .approve { border-color: var(--teal); color: var(--teal); } .case-actions .reject { color: #9b2525; } .case-actions button:disabled { opacity: .55; }
      .workflow-section { display: grid; gap: .8rem; }
      .section-heading h2 { margin-bottom: 0; font-size: 1.3rem; }
      .workflow-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .85rem; }
      .workflow-grid article { position: relative; min-height: 190px; padding: 1.15rem; border: 1px solid var(--line); border-radius: 1rem; background: #fff; }
      .step-number { position: absolute; top: 1rem; right: 1rem; color: #a0b5b0; font-size: .74rem; font-weight: 900; letter-spacing: .08em; }
      .step-icon { width: 40px; height: 40px; margin-bottom: 1rem; }
      .workflow-grid h3 { margin-bottom: .45rem; font-size: 1rem; }
      .workflow-grid p { margin-bottom: 0; color: var(--slate); font-size: .88rem; line-height: 1.55; }
      .safeguard-card { display: flex; gap: .9rem; padding: 1.2rem; border: 1px solid #d7e3df; border-radius: 1rem; background: #fff; }
      .safeguard-card > span { width: 40px; height: 40px; background: var(--midnight); color: #fff; }
      .safeguard-card h2 { margin-bottom: .55rem; font-size: 1rem; }
      .safeguard-card ul { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .45rem 1rem; margin: 0; padding: 0; list-style: none; color: var(--slate); font-size: .82rem; }
      .safeguard-card li { display: flex; gap: .45rem; align-items: flex-start; line-height: 1.45; }
      .safeguard-card li i { margin-top: .15rem; color: var(--teal); }
      @media (max-width: 760px) { .page-heading { align-items: stretch; flex-direction: column; } .listing-link { align-self: flex-start; } .queue-card { grid-template-columns: auto 1fr; } .connection-status { grid-column: 1 / -1; justify-self: start; } .workflow-grid, .safeguard-card ul { grid-template-columns: 1fr; } .case-table article { grid-template-columns: auto minmax(0, 1fr); } .case-table article > :nth-child(n + 3) { grid-column: 2; } .queue-state.error { align-items: flex-start; flex-wrap: wrap; } .queue-state.error button { margin-left: 0; } }
    `,
  ],
})
export class StaffOperationsComponent {
  private route = inject(ActivatedRoute);
  private api = inject(StaffApiService);
  private toast = inject(ToastService);
  workspaceKey = computed(
    () => (this.route.snapshot.data['workspace'] as StaffOperation) || 'verification',
  );
  workspace = computed(() => WORKSPACES[this.workspaceKey()]);
  requests = signal<StaffVerificationRequest[]>([]);
  users = signal<StaffUserReview[]>([]);
  loading = signal(true);
  error = signal('');
  busy = signal<string | null>(null);

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    if (this.workspaceKey() === 'users') {
      this.api.staffUsers().pipe(finalize(() => this.loading.set(false))).subscribe({
        next: (page) => this.users.set(page.results),
        error: () => this.error.set('Your account-safety permission may be missing, or the directory is unavailable.'),
      });
      return;
    }
    this.api.verificationRequests().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (page) => this.requests.set(page.results.filter((item) => this.workspaceKey() !== 'agencies' || item.verification_type === 'AGENCY')),
      error: () => this.error.set('Your verification-review permission may be missing, or the queue is unavailable.'),
    });
  }

  initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }
  typeIcon(type: string) { return ({ AGENCY: 'fa-solid fa-building-shield', IDENTITY: 'fa-solid fa-id-card', AGENT: 'fa-solid fa-user-tie', PROPERTY: 'fa-solid fa-house', STAY: 'fa-solid fa-bed', BUSINESS: 'fa-solid fa-briefcase' } as Record<string, string>)[type] || 'fa-solid fa-shield-halved'; }
  statusLabel(status: string) { return status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
  documentLabel(request: StaffVerificationRequest) { return `${request.documents?.length || 0} document${request.documents?.length === 1 ? '' : 's'}`; }
  submittedLabel(request: StaffVerificationRequest) { return request.submitted_at ? `Submitted ${new Date(request.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Draft request'; }
  detailLink(request: StaffVerificationRequest) { return [this.workspaceKey() === 'agencies' ? '/staff/agencies' : '/staff/verification', request.id]; }
  review(request: StaffVerificationRequest, action: 'start' | 'approve' | 'reject') {
    const notes = action === 'start' ? '' : window.prompt(action === 'approve' ? 'Approval note (optional)' : 'Rejection reason', '') ?? null;
    if (notes === null || (action === 'reject' && !notes.trim())) return;
    this.busy.set(request.id);
    const operation = action === 'start' ? this.api.startVerificationReview(request.id) : action === 'approve' ? this.api.approveVerification(request.id, notes) : this.api.rejectVerification(request.id, notes);
    operation.pipe(finalize(() => this.busy.set(null))).subscribe({
      next: (updated) => {
        this.requests.update((items) => items.map((item) => item.id === updated.id ? updated : item));
        this.toast.show({
          kind: 'success',
          title: action === 'start' ? 'Review started' : action === 'approve' ? 'Verification approved' : 'Verification rejected',
          message: 'The verification queue has been updated.',
        });
      },
      error: () => {
        const message = 'The review decision could not be saved. Please try again.';
        this.error.set(message);
        this.toast.show({ kind: 'error', title: 'Verification not updated', message });
      },
    });
  }
}

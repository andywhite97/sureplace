import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { StaffApiService } from '../../core/api/staff-api.service';
import { StaffUserReview, StaffVerificationRequest } from '../../core/models/staff.models';
import { ToastService } from '../../core/services/toast.service';

type DetailWorkspace = 'agencies' | 'verification' | 'users';

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
      <section class="detail-page">
      <a class="back" [routerLink]="backLink()"><i class="fa-solid fa-chevron-left"></i> {{ backLabel() }}</a>
      @if (loading()) {
        <div class="detail-skeleton" role="status" aria-label="Loading case details"><span class="skeleton-bar short"></span><span class="skeleton-card"></span><span class="skeleton-card"></span><div><span class="skeleton-card"></span><span class="skeleton-card"></span></div></div>
      } @else if (error()) {
        <section class="state error" role="alert"><h1>Details could not be loaded</h1><p>{{ error() }}</p><button type="button" (click)="load()">Try again</button></section>
      } @else if (user(); as account) {
        <header><div><p class="eyebrow">Account safety</p><h1>{{ account.display_name }}</h1><p>{{ account.email }}</p></div><span [class]="account.is_active ? 'status active' : 'status restricted'">{{ account.is_active ? 'Active account' : 'Restricted account' }}</span></header>
        <div class="grid">
          <section class="panel"><h2>Account profile</h2><dl><div><dt>Email</dt><dd>{{ account.email }}</dd></div><div><dt>Joined</dt><dd>{{ account.date_joined | date: 'mediumDate' }}</dd></div><div><dt>Last sign-in</dt><dd>{{ account.last_login ? (account.last_login | date: 'medium') : 'No recorded sign-in' }}</dd></div></dl></section>
          <section class="panel"><h2>Trust signals</h2><dl><div><dt>Email</dt><dd>{{ account.is_email_verified ? 'Verified' : 'Not verified' }}</dd></div><div><dt>Phone</dt><dd>{{ account.is_phone_verified ? 'Verified' : 'Not verified' }}</dd></div><div><dt>Account state</dt><dd>{{ account.is_active ? 'Active' : 'Restricted' }}</dd></div></dl></section>
        </div>
        <section class="panel account-actions"><h2>Account access</h2><p>Every restriction or reinstatement requires a reason and creates a permanent staff audit entry.</p>@if (!userAction()) { <button [class]="account.is_active ? 'restrict' : 'approve'" type="button" (click)="beginUserAction(account.is_active ? 'restrict' : 'reinstate')">{{ account.is_active ? 'Restrict account' : 'Reinstate account' }}</button> } @else { <textarea [(ngModel)]="userReason" rows="4" [placeholder]="userAction() === 'restrict' ? 'Explain why this account must be restricted' : 'Explain why access is being restored'"></textarea><div><button type="button" (click)="cancelUserAction()">Cancel</button><button [class]="userAction() === 'restrict' ? 'restrict' : 'approve'" type="button" [disabled]="busy() || !userReason.trim()" (click)="saveUserAction()">Confirm {{ userAction() === 'restrict' ? 'restriction' : 'reinstatement' }}</button></div> }</section>
        <section class="panel"><h2>Account moderation history</h2>@if (account.moderation_events.length) { <ol class="events">@for (event of account.moderation_events; track event.id) { <li><span [class]="event.action === 'RESTRICTED' ? 'event-icon restrict' : 'event-icon approve'"><i [class]="event.action === 'RESTRICTED' ? 'fa-solid fa-ban' : 'fa-solid fa-rotate-left'"></i></span><div><strong>{{ event.action === 'RESTRICTED' ? 'Account restricted' : 'Account reinstated' }}</strong><p>{{ event.reason }}</p><small>{{ event.actor_name }} · {{ event.created_at | date: 'medium' }}</small></div></li> }</ol> } @else { <p class="muted">No account-moderation actions have been recorded.</p> }</section>
        <aside class="notice"><i class="fa-solid fa-lock"></i><p>Restrictions never affect staff or superuser accounts, and staff cannot moderate their own account.</p></aside>
      } @else if (request(); as review) {
        @if (actionError()) { <section class="action-error" role="alert"><span>{{ actionError() }}</span><button type="button" (click)="load()">Refresh request</button></section> }
        <header class="review-heading"><div><p class="eyebrow">{{ workspaceKey() === 'agencies' ? 'Agency review' : 'Verification review' }}</p><h1>{{ review.verification_type === 'IDENTITY' ? 'Personal verification' : review.entity_name }}</h1><p>{{ typeLabel(review.verification_type) }} verification submitted by {{ review.applicant_name }}. Review the submitted documents and take action.</p></div><span [class]="'status ' + review.status.toLowerCase()">{{ statusLabel(review.status) }}</span></header>
        <section class="panel applicant-summary"><div class="applicant-primary"><span class="avatar" aria-hidden="true">{{ initials(review.applicant_name) }}</span><div><h2>{{ review.applicant_name }}</h2><span class="applicant-badge">Applicant</span><p>{{ review.applicant_email }}</p>@if (review.applicant_phone) { <p>{{ review.applicant_phone }}</p> }<small>Submitted {{ review.submitted_at ? (review.submitted_at | date: 'medium') : 'Not submitted' }}</small></div></div><div class="request-metadata"><div><span>Request ID</span><strong class="mono">{{ shortId(review.id) }}</strong><button type="button" class="copy-id" aria-label="Copy full request ID" title="Copy request ID" (click)="copyId(review.id)"><i class="fa-regular fa-copy" aria-hidden="true"></i></button></div><div><span>Verification type</span><strong>{{ typeLabel(review.verification_type) }}</strong></div><div><span>Current status</span><strong>{{ statusLabel(review.status) }}</strong></div></div></section>
        <nav class="review-tabs" role="tablist" aria-label="Verification review sections" (keydown)="handleTabKey($event)"><button type="button" role="tab" id="tab-requirements" aria-controls="panel-requirements" [attr.aria-selected]="activeTab() === 'requirements'" [class.selected]="activeTab() === 'requirements'" (click)="activeTab.set('requirements')">Requirements</button><button type="button" role="tab" id="tab-documents" aria-controls="panel-documents" [attr.aria-selected]="activeTab() === 'documents'" [class.selected]="activeTab() === 'documents'" (click)="activeTab.set('documents')">Documents <span>{{ review.documents?.length || 0 }}</span></button><button type="button" role="tab" id="tab-history" aria-controls="panel-history" [attr.aria-selected]="activeTab() === 'history'" [class.selected]="activeTab() === 'history'" (click)="activeTab.set('history')">History</button></nav>
        <div class="review-layout"><main class="review-content">
          @if (activeTab() === 'requirements') { <section class="panel tab-panel" id="panel-requirements" role="tabpanel" aria-labelledby="tab-requirements"><div class="panel-heading"><div><h2>Verification requirements</h2><p>Review each requirement and confirm the submitted evidence meets SurePlace standards.</p></div></div>@if (review.requirements?.length) { <div class="requirement-list">@for (requirement of review.requirements; track requirement.key; let index = $index) { <article class="requirement-card"><span class="requirement-number">{{ index + 1 }}</span><div class="requirement-copy"><div class="requirement-title"><h3>{{ requirement.label }}</h3><span [class]="'requirement-status ' + (requirement.review_status || (requirement.uploaded ? 'PENDING' : 'MISSING')).toLowerCase()">{{ requirementStatus(requirement) }}</span>@if (!requirement.required) { <small>Optional</small> }</div><p>{{ requirement.description }}</p>@if (requirement.alternatives?.length && requirement.alternatives!.length > 1) { <small>Accepted alternatives: {{ requirement.alternatives!.join(' or ') }}</small> }@if (!requirement.uploaded && requirement.required !== false) { <div class="evidence-alert"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div><strong>Evidence required</strong><p>{{ requirement.review_status === 'NEEDS_REPLACEMENT' ? 'The submitted document needs replacement before this requirement can be reviewed.' : 'The applicant has not yet uploaded a document for this requirement.' }}</p></div></div> }@if (requirement.reviewer_note) { <div class="requirement-note"><strong>Changes requested</strong><p>Reviewer note: “{{ requirement.reviewer_note }}”</p></div> }</div></article> }</div> } @else { <p class="muted">No requirement metadata is available for this request.</p> }</section> }
          @if (activeTab() === 'documents') { <section class="panel tab-panel" id="panel-documents" role="tabpanel" aria-labelledby="tab-documents"><div class="panel-heading"><div><h2><i class="fa-solid fa-lock" aria-hidden="true"></i> Protected documents</h2><p>These documents are visible only to authorised SurePlace reviewers.</p></div></div>@if (review.documents?.length) { <div class="documents">@for (document of review.documents; track document.id) { <article><i class="fa-regular fa-file-lines" aria-hidden="true"></i><div><strong>{{ matchingRequirement(review, document.document_type)?.label || typeLabel(document.document_type || 'Verification evidence') }}</strong><small>{{ document.file_name || 'Verification evidence' }}</small><small>{{ documentStatus(document.status) }}@if (document.uploaded_at) { · {{ document.uploaded_at | date: 'mediumDate' }} }</small>@if (document.rejection_reason) { <p class="document-rejection"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {{ document.rejection_reason }}</p> }<div class="document-actions"><button type="button" (click)="openDocument(document)" [disabled]="documentLoading()">@if (documentLoading()) { <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Opening… } @else { View protected document }</button>@if (canRejectDocument(review, document)) { <button class="reject-document" type="button" (click)="beginDocumentRejection(document.id)" [disabled]="busy()">Reject document</button> }</div>@if (documentDecision() === document.id) { <div class="document-decision"><label [for]="'document-reason-' + document.id">Why can’t this document be accepted?</label><textarea [id]="'document-reason-' + document.id" [(ngModel)]="documentReason" rows="3" placeholder="Give the applicant a clear, actionable reason"></textarea>@if (documentDecisionError()) { <p class="viewer-error" role="alert">{{ documentDecisionError() }}</p> }<div><button type="button" (click)="cancelDocumentRejection()">Cancel</button><button class="reject-document" type="button" [disabled]="busy() || !documentReason.trim()" (click)="saveDocumentRejection(document)">@if (busy()) { <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Saving… } @else { Confirm document rejection }</button></div></div> }</div></article> }</div> } @else { <div class="empty-state"><i class="fa-regular fa-folder-open" aria-hidden="true"></i><h3>No documents have been uploaded yet.</h3><p>Documents will appear here once the applicant uploads them.</p></div> }</section> }
          @if (activeTab() === 'history') { <section class="panel tab-panel" id="panel-history" role="tabpanel" aria-labelledby="tab-history"><div class="panel-heading"><div><h2>Review history</h2><p>Audited activity for this verification request.</p></div></div>@if (review.audit_events?.length) { <ol class="audit-timeline">@for (event of review.audit_events; track event.id) { <li><span class="timeline-dot" aria-hidden="true"></span><div><strong>{{ eventLabel(event.event_type) }}</strong><p>{{ statusLabel(event.previous_status) }} → {{ statusLabel(event.new_status) }}</p>@if (event.notes) { <blockquote>{{ event.notes }}</blockquote> }<small>{{ event.actor_name }} · {{ event.created_at | date: 'medium' }}</small></div></li> }</ol> } @else { <div class="empty-state"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><h3>No review history yet</h3><p>Recorded review activity will appear here.</p></div> }@if (review.rejection_reason) { <div class="rejection-note"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><div><strong>Rejection reason</strong><p>{{ review.rejection_reason }}</p></div></div> }</section> }
        </main><aside class="review-sidebar"><section class="panel progress-card"><h2>Verification progress</h2>@if (requirementsReady()) { <strong class="progress-percent">{{ progressPercent(review) }}%</strong><div class="progress-track" role="progressbar" [attr.aria-valuenow]="progressPercent(review)" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="progressPercent(review)"></span></div><p>{{ completedRequiredRequirements(review) }} of {{ totalRequiredRequirements(review) }} required requirements completed</p> } @else { <div class="sidebar-skeleton" role="status">Calculating requirements…</div> }</section>
          <section class="panel action-card"><h2>Moderation actions</h2>@if (canModerate(review)) { @if (review.status === 'SUBMITTED') { <button type="button" (click)="startReview()" [disabled]="busy()">@if (busy()) { Starting… } @else { Start review }</button> }<button class="approve" type="button" (click)="setDecision('approve')" [disabled]="busy() || !canApprove(review)">@if (busy() && decision() === 'approve') { Approving… } @else { Approve verification }</button>@if (!canApprove(review)) { <small>Complete all required evidence and prerequisites before approval.</small> }<button type="button" (click)="setDecision('request_changes')" [disabled]="busy()">Request changes</button><button class="reject" type="button" (click)="setDecision('reject')" [disabled]="busy()">Reject verification</button> } @else { <p class="muted">This request is read-only in its current status.</p> }</section>
          <section class="panel help-card"><h2>Need help?</h2><p>Check verification requirements and evidence guidance before making a decision.</p><a routerLink="/help">Open Help Centre <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></section></aside></div>
        @if (decision()) { <div class="modal-backdrop"><section class="panel decision" role="alertdialog" aria-modal="true" aria-labelledby="decision-title" tabindex="-1" (keydown)="trapDialogFocus($event)"><h2 id="decision-title">{{ decision() === 'approve' ? 'Approve verification' : decision() === 'reject' ? 'Reject verification' : 'Request changes' }}</h2>@if (decision() === 'approve') { <p>Approve {{ review.applicant_name }}’s {{ typeLabel(review.verification_type).toLowerCase() }} verification? This decision will be recorded in the audit history.</p> } @else if (decision() === 'request_changes') { <p>Select the affected requirement(s) and explain exactly what the applicant needs to fix.</p><fieldset class="requirement-select"><legend>Affected requirements</legend>@for (requirement of review.requirements || []; track requirement.key) { <label><input type="checkbox" [checked]="selectedRequirementKeys().includes(requirement.key)" (change)="toggleRequirement(requirement.key, $any($event.target).checked)">{{ requirement.label }}</label> }</fieldset><label for="moderation-notes">Change request reason</label><textarea id="moderation-notes" [(ngModel)]="notes" rows="4" placeholder="Explain exactly what the applicant needs to fix."></textarea> } @else { <p>This verification request will not be approved. Provide a reason for the applicant and audit record.</p><label for="moderation-notes">Rejection reason</label><textarea id="moderation-notes" [(ngModel)]="notes" rows="4" placeholder="Explain why this verification cannot be approved."></textarea> }<div><button type="button" class="secondary" (click)="cancelDecision()">Cancel</button><button [class]="decision() === 'reject' ? 'reject' : 'approve'" type="button" [disabled]="busy() || ((decision() === 'reject' || decision() === 'request_changes') && !notes.trim()) || (decision() === 'request_changes' && !selectedRequirementKeys().length)" (click)="submitDecision()">@if (busy()) { <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Saving… } @else { {{ decision() === 'approve' ? 'Approve verification' : decision() === 'reject' ? 'Reject verification' : 'Send change request' }} }</button></div></section></div> }
        @if (documentLoading() || documentViewer() || documentImage() || documentError()) { <section class="panel document-viewer"><div class="viewer-heading"><div><h2>Protected document</h2><p class="muted">{{ documentName() }}</p></div><button type="button" (click)="closeDocument()" aria-label="Close document viewer"><i class="fa-solid fa-xmark"></i></button></div>@if (documentLoading()) { <div class="viewer-state" role="status"><i class="fa-solid fa-spinner fa-spin"></i> Opening protected document…</div> } @else if (documentImage(); as source) { <div class="image-preview"><img [src]="source" [alt]="'Protected document: ' + documentName()"></div> } @else if (documentViewer(); as source) { <iframe [src]="source" [title]="'Protected document: ' + documentName()"></iframe> } @else { <p class="viewer-error" role="alert">{{ documentError() }}</p><button type="button" (click)="retryDocument()">Retry secure preview</button> }</section> }
      }
    </section>
  `,
  styles: [`
    .detail-page { display: grid; gap: 1.1rem; width:100%; min-width:0; max-width: 1120px; }.back { width: max-content; color: var(--slate); text-decoration: none; font-size: .84rem; font-weight: 800; }.back:hover { color: var(--teal); }header { display:flex; align-items:start; justify-content:space-between; gap:1rem; padding:1.45rem; border:1px solid var(--line); border-radius:1rem; background:linear-gradient(135deg,#fff,#eefaf7); }.eyebrow { margin:0 0 .35rem; color:var(--teal); font-size:.72rem; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }h1 { margin:.2rem 0 .45rem; font-size:clamp(1.75rem,4vw,2.6rem); } header p:last-child,.muted { margin:0; color:var(--slate); }.status { width:max-content; padding:.32rem .58rem; border-radius:999px; background:#fff4dd; color:#8a5a00; font-size:.75rem; font-weight:850; white-space:nowrap; }.status.under_review,.status.active,.status.approved { background:#e6f7ef; color:#17633b; }.status.rejected,.status.restricted { background:#fde8e8; color:#9b2525; }.actions { display:flex; gap:.55rem; flex-wrap:wrap; }.actions button,.decision button,.state button,.account-actions button,.documents button,.viewer-heading button,.document-decision button { min-height:40px; padding:0 .85rem; border:1px solid var(--line); border-radius:.6rem; background:#fff; color:var(--midnight); font:inherit; font-weight:850; cursor:pointer; transition:transform .15s ease,box-shadow .15s ease,background .15s ease; }.actions button:hover:not(:disabled),.decision button:hover:not(:disabled),.account-actions button:hover:not(:disabled),.documents button:hover:not(:disabled),.viewer-heading button:hover:not(:disabled),.document-decision button:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 12px rgba(7,43,54,.12); }.actions button:disabled,.decision button:disabled,.account-actions button:disabled,.documents button:disabled,.document-decision button:disabled { cursor:not-allowed; opacity:.55; }.actions .approve,.decision .approve,.account-actions .approve { border-color:var(--teal); background:var(--teal); color:#fff; }.actions .reject,.account-actions .restrict,.reject-document { border-color:#c85a5a !important; background:#fff4f4 !important; color:#9b2525 !important; }.grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }.panel { min-width:0; padding:1.2rem; border:1px solid var(--line); border-radius:1rem; background:#fff; }.panel h2 { margin:0 0 1rem; font-size:1.05rem; }dl { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; margin:0; }dt { color:var(--slate); font-size:.72rem; font-weight:800; }dd { margin:.25rem 0 0; color:var(--midnight); font-size:.88rem; font-weight:700; overflow-wrap:anywhere; }.mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.72rem; }.notice,.rejection-note { display:flex; align-items:flex-start; gap:.7rem; padding:1rem 1.15rem; border:1px solid #d7e3df; border-radius:1rem; background:#f4fcf9; color:var(--slate); }.notice i { color:var(--teal); }.notice p,.rejection-note p { margin:.2rem 0 0; line-height:1.5; }.rejection-note { border-color:#f1cccc; background:#fff7f7; }.rejection-note i,.rejection-note strong { color:#9b2525; }.decision,.account-actions { display:grid; gap:.75rem; }.decision h2 { margin-bottom:0; }.decision textarea,.account-actions textarea,.document-decision textarea { width:100%; box-sizing:border-box; padding:.75rem; border:1px solid var(--line); border-radius:.6rem; font:inherit; resize:vertical; }.decision > div,.account-actions > div,.document-decision > div { display:flex; justify-content:flex-end; gap:.5rem; }.account-actions p { margin:0; color:var(--slate); line-height:1.5; }.account-actions > button { justify-self:start; }.requirements { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.6rem; margin:0; padding:0; list-style:none; color:var(--slate); font-size:.86rem; }.requirements li { display:flex; align-items:center; gap:.5rem; }.requirements .good { color:var(--teal); }.documents { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; min-width:0; }.documents article { display:flex; min-width:0; gap:.65rem; padding:.8rem; border:1px solid var(--line); border-radius:.65rem; }.documents article > div { min-width:0; flex:1; }.documents i { flex:0 0 auto; color:var(--teal); }.documents strong,.documents small { display:block; overflow-wrap:anywhere; }.documents small { margin:.2rem 0 .6rem; color:var(--slate); font-size:.76rem; }.documents button { min-height:34px; color:var(--teal); border-color:var(--teal); }.document-actions { display:flex; gap:.45rem; flex-wrap:wrap; }.document-rejection { margin:.5rem 0; color:#9b2525; font-size:.78rem; line-height:1.4; }.document-decision { display:grid; gap:.55rem; margin-top:.7rem; padding:.7rem; border:1px solid #f1cccc; border-radius:.6rem; background:#fffafa; }.document-decision label { color:var(--midnight); font-size:.78rem; font-weight:800; }.document-viewer { display:grid; gap:1rem; }.viewer-heading { display:flex; align-items:start; justify-content:space-between; gap:1rem; }.viewer-heading h2 { margin-bottom:.25rem; }.viewer-heading button { display:grid; place-items:center; min-height:34px; width:34px; padding:0; }.document-viewer iframe { display:block; width:100%; min-height:480px; border:1px solid var(--line); border-radius:.65rem; background:#f5f8f7; }.image-preview { display:grid; place-items:center; max-height:520px; overflow:auto; padding:.75rem; border:1px solid var(--line); border-radius:.65rem; background:#f5f8f7; }.image-preview img { display:block; max-width:100%; max-height:480px; object-fit:contain; border-radius:.35rem; }.viewer-state { display:grid; place-items:center; min-height:180px; color:var(--slate); }.viewer-state i { margin-right:.45rem; color:var(--teal); }.viewer-error { margin:0; color:#9b2525; }.events { display:grid; gap:.9rem; margin:0; padding:0; list-style:none; }.events li { display:flex; gap:.65rem; }.event-icon { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; }.event-icon.restrict { color:#9b2525; background:#fde8e8; }.event-icon.approve { color:#17633b; background:#e6f7ef; }.events strong,.events small { display:block; }.events p { margin:.25rem 0; color:var(--slate); }.events small { color:var(--slate); font-size:.75rem; }.state { display:grid; place-items:center; gap:.6rem; min-height:260px; padding:1.5rem; border:1px solid var(--line); border-radius:1rem; background:#fff; text-align:center; }.state i { color:var(--teal); font-size:1.5rem; }.state h1,.state p { margin:0; }@media (max-width:700px) { header { flex-direction:column; }.grid,.requirements,.documents { grid-template-columns:1fr; }dl { grid-template-columns:1fr; }.status { align-self:flex-start; }.document-viewer iframe { min-height:400px; }.image-preview img { max-height:360px; } }
  `,
    `
      .review-heading { padding:1rem 1.2rem; background:#fff; align-items:center; }
      .review-heading h1 { font-size:clamp(1.5rem,3vw,2rem); margin:.1rem 0 .35rem; }
      .review-heading .status { align-self:center; }
      .applicant-summary { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr); gap:1rem; align-items:center; }
      .applicant-primary { display:flex; gap:1rem; align-items:flex-start; min-width:0; }
      .applicant-primary h2 { margin:0 0 .25rem; font-size:1.1rem; }
      .applicant-primary p { margin:.22rem 0; color:var(--slate); overflow-wrap:anywhere; }
      .applicant-primary small { color:var(--slate); display:block; margin-top:.4rem; }
      .avatar { width:52px; height:52px; display:grid; place-items:center; border-radius:50%; background:#e2f5ef; color:var(--teal); font-weight:900; flex:none; }
      .applicant-badge { display:inline-flex; padding:.16rem .45rem; border-radius:99px; background:#edf4f2; color:#4b6664; font-size:.7rem; font-weight:800; }
      .request-metadata { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.7rem; padding-left:1rem; border-left:1px solid var(--line); }
      .request-metadata > div { min-width:0; position:relative; }
      .request-metadata > div:first-child { grid-column:1/-1; }
      .request-metadata span,.request-metadata strong { display:block; }
      .request-metadata span { margin-bottom:.2rem; color:var(--slate); font-size:.72rem; font-weight:750; }
      .request-metadata strong { font-size:.83rem; overflow-wrap:anywhere; }
      .request-metadata .mono { display:inline; font-size:.76rem; }
      .copy-id { margin-left:.35rem; border:0; background:transparent; color:var(--teal); cursor:pointer; }
      .review-tabs { display:flex; gap:.3rem; overflow:auto; border-bottom:1px solid var(--line); }
      .review-tabs button { display:flex; align-items:center; gap:.45rem; flex:none; padding:.75rem .9rem; border:0; border-bottom:3px solid transparent; background:transparent; color:var(--slate); font:inherit; font-size:.86rem; font-weight:800; cursor:pointer; }
      .review-tabs button.selected { color:var(--teal); border-bottom-color:var(--teal); }
      .review-tabs button:focus-visible,.detail-page button:focus-visible,.detail-page a:focus-visible { outline:3px solid #48c5b0; outline-offset:2px; }
      .review-tabs span { padding:.1rem .4rem; border-radius:99px; background:#edf3f1; font-size:.7rem; }
      .review-layout { display:grid; grid-template-columns:minmax(0,2.55fr) minmax(245px,.95fr); gap:1rem; align-items:start; }
      .review-content,.review-sidebar { min-width:0; display:grid; gap:1rem; align-content:start; }
      .review-sidebar { position:sticky; top:82px; }
      .tab-panel { min-height:280px; }
      .panel-heading { display:flex; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
      .panel-heading h2 { margin:0 0 .3rem; }
      .panel-heading p { margin:0; color:var(--slate); font-size:.86rem; line-height:1.45; }
      .requirement-list { display:grid; gap:.7rem; }
      .requirement-card { display:grid; grid-template-columns:36px minmax(0,1fr); gap:.75rem; padding:.9rem; border:1px solid var(--line); border-radius:.75rem; }
      .requirement-number { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; background:#e1f5ef; color:var(--teal); font-weight:900; }
      .requirement-title { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; }
      .requirement-title h3 { margin:0; font-size:.95rem; }
      .requirement-title > small { color:var(--slate); }
      .requirement-copy > p { margin:.35rem 0; color:var(--slate); font-size:.84rem; line-height:1.45; }
      .requirement-copy > small { display:block; color:var(--slate); font-size:.74rem; }
      .requirement-status { padding:.2rem .5rem; border-radius:99px; background:#fff4dd; color:#865b00; font-size:.7rem; font-weight:850; }
      .requirement-status.accepted { background:#e6f7ef; color:#17633b; }
      .requirement-status.needs_replacement { background:#fff0e5; color:#9c4b05; }
      .requirement-status.missing { background:#f0f3f2; color:#576b69; }
      .evidence-alert,.requirement-note { display:flex; gap:.55rem; margin-top:.65rem; padding:.65rem .75rem; border-radius:.6rem; background:#fff7e8; color:#765400; }
      .evidence-alert > i { margin-top:.12rem; }
      .evidence-alert strong,.requirement-note strong { font-size:.8rem; }
      .evidence-alert p,.requirement-note p { margin:.2rem 0 0; font-size:.78rem; line-height:1.4; }
      .requirement-note { display:block; border:1px solid #f3d89f; background:#fffaf0; }
      .empty-state { display:grid; justify-items:center; gap:.45rem; min-height:180px; align-content:center; padding:1rem; text-align:center; }
      .empty-state > i { color:var(--teal); font-size:1.6rem; }
      .empty-state h3,.empty-state p { margin:0; }
      .empty-state h3 { font-size:.95rem; }
      .empty-state p { color:var(--slate); font-size:.84rem; }
      .progress-card h2,.action-card h2,.help-card h2 { margin-bottom:.2rem; }
      .progress-percent { color:var(--teal); font-size:1.8rem; }
      .progress-track { height:8px; overflow:hidden; border-radius:9px; background:#e8efed; }
      .progress-track span { display:block; height:100%; border-radius:inherit; background:var(--teal); transition:width .2s ease; }
      .progress-card > p,.help-card p { margin:0; color:var(--slate); font-size:.8rem; line-height:1.45; }
      .action-card { display:grid; gap:.6rem; }
      .action-card button,.decision button,.document-actions button,.document-decision button,.viewer-heading button,.action-error button { min-height:40px; padding:.55rem .75rem; border:1px solid var(--line); border-radius:.55rem; background:#fff; color:var(--midnight); font:inherit; font-size:.83rem; font-weight:800; cursor:pointer; transition:transform .15s ease,box-shadow .15s ease,background .15s ease; }
      .action-card button:hover:not(:disabled),.decision button:hover:not(:disabled),.document-actions button:hover:not(:disabled),.document-decision button:hover:not(:disabled),.viewer-heading button:hover:not(:disabled),.action-error button:hover { transform:translateY(-1px); box-shadow:0 4px 12px #072b361f; }
      .action-card button:disabled,.decision button:disabled,.document-actions button:disabled { opacity:.55; cursor:not-allowed; }
      .action-card .approve,.decision .approve { background:var(--teal); border-color:var(--teal); color:#fff; }
      .action-card .reject,.decision .reject { background:#fff5f5; border-color:#d98484; color:#9b2525; }
      .action-card small { color:var(--slate); font-size:.74rem; line-height:1.4; }
      .help-card a { width:max-content; color:var(--teal); font-size:.82rem; font-weight:800; text-decoration:none; }
      .modal-backdrop { position:fixed; z-index:1100; inset:0; display:grid; place-items:center; padding:1rem; background:#0b222cb3; }
      .decision { display:grid; gap:.75rem; width:min(520px,100%); max-height:min(88vh,760px); overflow:auto; box-shadow:0 18px 65px #061f2b55; }
      .decision h2 { margin:0; }
      .decision > p { margin:0; color:var(--slate); line-height:1.5; }
      .decision label,.requirement-select legend { font-size:.82rem; font-weight:800; }
      .decision textarea { width:100%; box-sizing:border-box; padding:.75rem; border:1px solid var(--line); border-radius:.6rem; font:inherit; resize:vertical; }
      .requirement-select { display:grid; gap:.45rem; margin:0; padding:.7rem; border:1px solid var(--line); border-radius:.6rem; }
      .requirement-select label { display:flex; gap:.5rem; align-items:center; font-weight:600; }
      .decision > div { display:flex; justify-content:flex-end; gap:.5rem; }
      .decision button.secondary { background:#fff; }
      .audit-timeline { display:grid; gap:0; margin:0; padding:0; list-style:none; }
      .audit-timeline li { position:relative; display:grid; grid-template-columns:18px minmax(0,1fr); gap:.65rem; padding-bottom:1.1rem; }
      .audit-timeline li:not(:last-child)::before { position:absolute; top:15px; bottom:0; left:6px; width:2px; background:#dce8e5; content:''; }
      .timeline-dot { z-index:1; width:12px; height:12px; margin-top:4px; border:2px solid var(--teal); border-radius:50%; background:#fff; }
      .audit-timeline strong,.audit-timeline small { display:block; }
      .audit-timeline p { margin:.2rem 0; color:var(--slate); font-size:.8rem; }
      .audit-timeline blockquote { margin:.5rem 0; padding:.55rem .7rem; border-left:3px solid #b8dcd3; background:#f5faf8; color:var(--midnight); font-size:.82rem; white-space:pre-wrap; }
      .audit-timeline small { color:var(--slate); font-size:.74rem; }
      .action-error { display:flex; justify-content:space-between; align-items:center; gap:.75rem; padding:.7rem .9rem; border:1px solid #e8b8b8; border-radius:.7rem; background:#fff5f5; color:#8b2828; font-size:.84rem; }
      .sidebar-skeleton { min-height:45px; color:var(--slate); font-size:.8rem; }
      .detail-skeleton { display:grid; gap:1rem; }
      .skeleton-bar,.skeleton-card { display:block; border-radius:.8rem; background:linear-gradient(100deg,#edf2f0 25%,#f8fbfa 45%,#edf2f0 65%); background-size:300% 100%; animation:review-shimmer 1.25s infinite; }
      .skeleton-bar { width:10rem; height:1rem; }.skeleton-card { min-height:105px; }.detail-skeleton > div:last-child { display:grid; grid-template-columns:2fr 1fr; gap:1rem; }
      @keyframes review-shimmer { to { background-position:-100% 0; } }
      .document-viewer { grid-column:1/-1; }
      .document-viewer .viewer-error + button { justify-self:start; }
      .status.changes_requested { background:#fff2dc; color:#865b00; }
      .status.under_review { background:#fff4dd; color:#8a5a00; }
      .status.draft,.status.cancelled,.status.expired { background:#edf1f0; color:#576b69; }
      @media (max-width:850px) { .review-layout { grid-template-columns:1fr; }.review-sidebar { position:static; grid-template-columns:repeat(2,minmax(0,1fr)); }.help-card { grid-column:1/-1; }.applicant-summary { grid-template-columns:1fr; }.request-metadata { border-left:0; border-top:1px solid var(--line); padding:1rem 0 0; } }
      @media (max-width:600px) { .review-sidebar { grid-template-columns:1fr; }.help-card { grid-column:auto; }.request-metadata { grid-template-columns:1fr; }.request-metadata > div:first-child { grid-column:auto; }.applicant-primary { gap:.7rem; }.action-error { align-items:flex-start; flex-direction:column; }.review-heading { align-items:flex-start; }.detail-skeleton > div:last-child { grid-template-columns:1fr; } }
    `,
  ],
})
export class StaffOperationDetailComponent {
  private route = inject(ActivatedRoute);
  private api = inject(StaffApiService);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(ToastService);
  workspaceKey = computed(() => (this.route.snapshot.data['workspace'] as DetailWorkspace) || 'verification');
  id = this.route.snapshot.paramMap.get('id') || '';
  loading = signal(true); error = signal(''); busy = signal(false); notes = ''; decision = signal<'approve' | 'reject' | 'request_changes' | null>(null); userAction = signal<'restrict' | 'reinstate' | null>(null); userReason = '';
  activeTab = signal<'requirements' | 'documents' | 'history'>('requirements');
  selectedRequirementKeys = signal<string[]>([]);
  actionError = signal('');
  private decisionTrigger: HTMLElement | null = null;
  request = signal<StaffVerificationRequest | null>(null); user = signal<StaffUserReview | null>(null);
  documentViewer = signal<SafeResourceUrl | null>(null); documentName = signal(''); documentLoading = signal(false); documentError = signal('');
  documentImage = signal<SafeUrl | null>(null);
  documentDecision = signal<string | null>(null); documentDecisionError = signal(''); documentReason = '';
  private documentObjectUrl: string | null = null;
  private lastDocument: NonNullable<StaffVerificationRequest['documents']>[number] | null = null;
  constructor() { this.load(); }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.actionError.set('');
    const fail = () => this.error.set('You may not have permission to view this case, or it no longer exists.');
    if (this.workspaceKey() === 'users') {
      this.api.staffUser(this.id).pipe(finalize(() => this.loading.set(false))).subscribe({
        next: (item) => this.user.set(item),
        error: fail,
      });
      return;
    }
    this.api.verificationRequest(this.id).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (item) => this.request.set(item),
      error: fail,
    });
  }
  backLink() { return this.workspaceKey() === 'users' ? '/staff/users' : this.workspaceKey() === 'agencies' ? '/staff/agencies' : '/staff/verification'; }
  backLabel() { return this.workspaceKey() === 'users' ? 'User review' : this.workspaceKey() === 'agencies' ? 'Agency reviews' : 'Verification queue'; }
  typeLabel(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
  statusLabel(value: string) { return value ? this.typeLabel(value) : 'New request'; }
  completedRequirements(item: StaffVerificationRequest) { return this.completedRequiredRequirements(item); }
  totalRequiredRequirements(item: StaffVerificationRequest) { return item.requirements?.filter((requirement) => requirement.required !== false).length || 0; }
  completedRequiredRequirements(item: StaffVerificationRequest) { return item.requirements?.filter((requirement) => requirement.required !== false && requirement.uploaded).length || 0; }
  progressPercent(item: StaffVerificationRequest) { const total = this.totalRequiredRequirements(item); return total ? Math.round(this.completedRequiredRequirements(item) * 100 / total) : 0; }
  requirementsReady() { return !!this.request()?.requirements; }
  canModerate(item: StaffVerificationRequest) { return ['SUBMITTED', 'UNDER_REVIEW'].includes(item.status); }
  canApprove(item: StaffVerificationRequest) { return this.canModerate(item) && this.totalRequiredRequirements(item) > 0 && this.completedRequiredRequirements(item) === this.totalRequiredRequirements(item); }
  initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join(''); }
  shortId(id: string) { return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id; }
  async copyId(id: string) { try { await navigator.clipboard.writeText(id); this.toast.show({ kind: 'success', title: 'Request ID copied' }); } catch { this.toast.show({ kind: 'error', title: 'Could not copy request ID', message: 'Clipboard access is unavailable in this browser.' }); } }
  requirementStatus(requirement: NonNullable<StaffVerificationRequest['requirements']>[number]) { const status = requirement.review_status || (requirement.uploaded ? 'PENDING' : 'MISSING'); return ({ ACCEPTED: 'Accepted', PENDING: 'Evidence received', NEEDS_REPLACEMENT: 'Needs replacement', MISSING: 'Evidence missing' } as Record<string, string>)[status] || this.statusLabel(status); }
  documentStatus(value: string) { return ({ PENDING: 'Pending review', ACCEPTED: 'Accepted', REJECTED: 'Changes requested' } as Record<string, string>)[value] || this.statusLabel(value); }
  matchingRequirement(item: StaffVerificationRequest, documentType?: string) { return item.requirements?.find((requirement) => requirement.key === documentType || requirement.alternatives?.includes(documentType || '')); }
  eventLabel(value: string) { return ({ SUBMITTED: 'Request submitted', UNDER_REVIEW: 'Review started', APPROVED: 'Verification approved', REJECTED: 'Verification rejected', CHANGES_REQUESTED: 'Changes requested', DOCUMENT_REJECTED: 'Evidence rejected', SUSPENDED: 'Verification suspended' } as Record<string, string>)[value] || this.statusLabel(value); }
  handleTabKey(event: KeyboardEvent) { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; const tabs = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]')); const current = tabs.indexOf(document.activeElement as HTMLButtonElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; event.preventDefault(); tabs[next]?.focus(); tabs[next]?.click(); }
  toggleRequirement(key: string, selected: boolean) { this.selectedRequirementKeys.update((keys) => selected ? [...new Set([...keys, key])] : keys.filter((item) => item !== key)); }
  canRejectDocument(request: StaffVerificationRequest, document: NonNullable<StaffVerificationRequest['documents']>[number]) { return document.status !== 'REJECTED' && ['SUBMITTED', 'UNDER_REVIEW'].includes(request.status); }
  beginDocumentRejection(id: string) { this.documentReason = ''; this.documentDecisionError.set(''); this.documentDecision.set(id); }
  cancelDocumentRejection() { this.documentReason = ''; this.documentDecisionError.set(''); this.documentDecision.set(null); }
  saveDocumentRejection(document: NonNullable<StaffVerificationRequest['documents']>[number]) {
    const item = this.request();
    if (!item || !this.documentReason.trim()) return;
    this.busy.set(true);
    this.api.rejectVerificationDocument(item.id, document.id, this.documentReason).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (updated) => {
        this.request.set(updated);
        this.cancelDocumentRejection();
        this.toast.show({ kind: 'success', title: 'Document rejected', message: 'The applicant has been asked to replace the document and has received your reason.' });
        this.refreshVerificationRequest();
      },
      error: () => {
        const message = 'The document rejection could not be saved. Please try again.';
        this.documentDecisionError.set(message);
        this.toast.show({ kind: 'error', title: 'Document not rejected', message });
      },
    });
  }
  private refreshVerificationRequest() {
    this.api.verificationRequest(this.id).subscribe({ next: (item) => this.request.set(item) });
  }
  openDocument(document: NonNullable<StaffVerificationRequest['documents']>[number]) {
    this.closeDocument();
    this.lastDocument = document;
    this.documentLoading.set(true);
    this.documentName.set(document.file_name || 'Verification evidence');
    this.api.verificationDocument(document.id).pipe(finalize(() => this.documentLoading.set(false))).subscribe({
      next: (file) => {
        this.documentObjectUrl = URL.createObjectURL(file);
        if (file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(document.file_name || '')) {
          this.documentImage.set(this.sanitizer.bypassSecurityTrustUrl(this.documentObjectUrl));
        } else {
          this.documentViewer.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.documentObjectUrl));
        }
      },
      error: () => this.documentError.set('This document could not be opened. Confirm that you still have permission to review it, then try again.'),
    });
  }
  closeDocument() {
    if (this.documentObjectUrl) URL.revokeObjectURL(this.documentObjectUrl);
    this.documentObjectUrl = null;
    this.documentViewer.set(null);
    this.documentImage.set(null);
    this.documentName.set('');
    this.documentLoading.set(false);
    this.documentError.set('');
  }
  retryDocument() { if (this.lastDocument) this.openDocument(this.lastDocument); }
  setDecision(value: 'approve' | 'reject' | 'request_changes') { this.notes = ''; this.selectedRequirementKeys.set([]); this.decisionTrigger = document.activeElement as HTMLElement; this.decision.set(value); setTimeout(() => document.querySelector<HTMLElement>('.modal-backdrop [role="alertdialog"]')?.focus()); }
  cancelDecision() { if (this.busy()) return; this.decision.set(null); this.notes = ''; this.selectedRequirementKeys.set([]); this.decisionTrigger?.focus(); }
  private closeDecision() { this.decision.set(null); this.notes = ''; this.selectedRequirementKeys.set([]); this.decisionTrigger?.focus(); }
  trapDialogFocus(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); this.cancelDecision(); return; }
    if (event.key !== 'Tab') return;
    const dialog = event.currentTarget as HTMLElement;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'));
    if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  startReview() { const item = this.request(); if (!item) return; this.save(this.api.startVerificationReview(item.id)); }
  submitDecision() { const item = this.request(); const choice = this.decision(); if (!item || !choice || ((choice === 'reject' || choice === 'request_changes') && !this.notes.trim()) || (choice === 'request_changes' && !this.selectedRequirementKeys().length) || (choice === 'approve' && !this.canApprove(item))) return; const operation = choice === 'approve' ? this.api.approveVerification(item.id) : choice === 'reject' ? this.api.rejectVerification(item.id, this.notes.trim()) : this.api.requestVerificationChanges(item.id, this.selectedRequirementKeys(), this.notes.trim()); this.save(operation); }
  private save(operation: ReturnType<StaffApiService['approveVerification']>) { this.busy.set(true); this.actionError.set(''); operation.pipe(finalize(() => this.busy.set(false))).subscribe({ next: (item) => { this.request.set(item); this.closeDecision(); this.toast.show({ kind: 'success', title: 'Verification updated', message: 'The review decision was saved.' }); this.refreshVerificationRequest(); }, error: (error: { status?: number; error?: { detail?: unknown } }) => { const detail = error.error?.detail; const validation = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.join(' ') : detail && typeof detail === 'object' ? Object.values(detail).flat().join(' ') : ''; const message = error.status === 409 ? 'This verification request was updated by another staff member. Refresh to review the latest status.' : validation || (error.status === 400 ? 'The request could not be approved or updated. Check required evidence and the current request status.' : 'The review decision could not be saved. Please try again.'); this.actionError.set(message); this.toast.show({ kind: 'error', title: 'Verification not updated', message }); } }); }
  beginUserAction(action: 'restrict' | 'reinstate') { this.userReason = ''; this.userAction.set(action); }
  cancelUserAction() { this.userReason = ''; this.userAction.set(null); }
  saveUserAction() { const account = this.user(); const action = this.userAction(); if (!account || !action || !this.userReason.trim()) return; const operation = action === 'restrict' ? this.api.restrictUser(account.id, this.userReason) : this.api.reinstateUser(account.id, this.userReason); this.busy.set(true); operation.pipe(finalize(() => this.busy.set(false))).subscribe({ next: (item) => { this.user.set(item); this.cancelUserAction(); }, error: () => this.error.set('The account access update could not be saved. Please try again.') }); }
}

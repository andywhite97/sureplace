import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, Observable, of, shareReplay, tap } from 'rxjs';
import { VerificationApiService } from '../../core/api/manage-api.services';
import { AuthService } from '../../core/auth/auth.service';
import {
  VerificationDefinition,
  VerificationEligibility,
  VerificationEvidence,
  VerificationRequestCreate,
  VerificationRequestSummary,
  VerificationRequirement,
} from '../../core/models/manage.models';
import { ManageStatusComponent } from './manage-ui';

type UploadState = 'uploading' | 'uploaded' | 'failed';
interface LocalFile {
  requirementKey: string;
  documentType: string;
  file: File;
  state: UploadState;
  evidence?: VerificationEvidence;
  error?: string;
}

@Component({
  standalone: true,
  imports: [DatePipe, TitleCasePipe, FormsModule, ManageStatusComponent],
  templateUrl: './verification.component.html',
  styleUrl: './verification.component.scss',
})
export class VerificationComponent {
  private api = inject(VerificationApiService);
  private draftCreation$?: Observable<VerificationRequestSummary>;
  readonly auth = inject(AuthService);
  definitions = signal<VerificationDefinition[]>([]);
  requests = signal<VerificationRequestSummary[]>([]);
  eligibility = signal<VerificationEligibility>({
    agencies: [],
    agents: [],
    properties: [],
    stays: [],
  });
  active = signal<VerificationDefinition | null>(null);
  draft = signal<VerificationRequestSummary | null>(null);
  step = signal(0);
  selectedEntity = signal('');
  files = signal<LocalFile[]>([]);
  preferredTypes = signal<Record<string, string>>({});
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  confirmed = false;
  currentRequest = computed(() => (this.active() ? this.latest(this.active()!.type) : null));
  entityOptions = computed(() => {
    const key = this.entityCollection(this.active()?.type || '');
    return key ? this.eligibility()[key] : [];
  });
  blockedDependencies = computed(() =>
    (this.active()?.prerequisites || []).filter(
      (x) => x.required && this.status(x.type) !== 'APPROVED',
    ),
  );
  ready = computed(() =>
    (this.active()?.requirements || []).filter((x) => x.required).every((x) => this.hasEvidence(x)),
  );
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      types: this.api.types(),
      requests: this.api.list(),
      eligibility: this.api.eligible(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ types, requests, eligibility }) => {
          this.definitions.set(types as VerificationDefinition[]);
          this.requests.set(requests.results);
          this.eligibility.set(eligibility);
        },
        error: () => this.error.set("Couldn't load verification details."),
      });
  }
  latest(type: string) {
    return this.requests().find((x) => x.verification_type === type) || null;
  }
  status(type: string) {
    return this.latest(type)?.status || 'NOT_STARTED';
  }
  cta(type: string) {
    const s = this.status(type);
    return s === 'DRAFT'
      ? 'Continue'
      : s === 'CHANGES_REQUESTED'
        ? 'Fix changes'
        : s === 'NOT_STARTED'
          ? 'Get started'
          : 'View details';
  }
  verificationIcon(type: string) {
    const file = type.toLowerCase();
    return `/verification icons/verified_${file}.png`;
  }
  open(definition: VerificationDefinition) {
    this.active.set(definition);
    this.error.set('');
    this.confirmed = false;
    const request = this.latest(definition.type);
    this.draft.set(request);
    const collection = this.entityCollection(definition.type);
    this.selectedEntity.set(
      this.requestEntity(request) ||
        (collection ? this.eligibility()[collection][0]?.id : '') ||
        '',
    );
    this.files.set(
      (request?.documents || []).map((document) => ({
        requirementKey: this.requirementFor(document.document_type)?.key || document.document_type,
        documentType: document.document_type,
        file: new File([], document.file_name),
        state: 'uploaded',
        evidence: document,
      })),
    );
    this.step.set(
      request && !['DRAFT', 'CHANGES_REQUESTED'].includes(request.status) ? 3 : request ? 1 : 0,
    );
  }
  close() {
    this.active.set(null);
    this.draft.set(null);
    this.files.set([]);
    this.step.set(0);
    this.error.set('');
  }
  back() {
    this.error.set('');
    this.step.update((x) => Math.max(0, x - 1));
  }
  next() {
    if (
      this.step() === 0 &&
      (this.blockedDependencies().length ||
        (this.entityCollection(this.active()!.type) && !this.selectedEntity()))
    )
      return;
    if (this.step() === 1 && !this.ready()) return;
    this.step.update((x) => Math.min(2, x + 1));
  }
  entityCollection(type: string): keyof VerificationEligibility | null {
    return (
      (
        { AGENCY: 'agencies', AGENT: 'agents', PROPERTY: 'properties', STAY: 'stays' } as Record<
          string,
          keyof VerificationEligibility
        >
      )[type] || null
    );
  }
  entityField(type: string) {
    return (
      (
        { AGENCY: 'agency', AGENT: 'agent_profile', PROPERTY: 'property', STAY: 'stay' } as Record<
          string,
          string
        >
      )[type] || ''
    );
  }
  requestEntity(request: VerificationRequestSummary | null) {
    if (!request) return '';
    const field = this.entityField(request.verification_type) as keyof VerificationRequestSummary;
    return String(request[field] || '');
  }
  entityName() {
    return (
      this.entityOptions().find((x) => x.id === this.selectedEntity())?.name || 'Personal identity'
    );
  }
  requirementFor(type: string) {
    return this.active()?.requirements.find(
      (x) => x.key === type || x.alternatives?.includes(type),
    );
  }
  selectedDocumentType(requirement: VerificationRequirement) {
    return (
      this.preferredTypes()[requirement.key] || requirement.alternatives?.[0] || requirement.key
    );
  }
  setPreferredType(key: string, type: string) {
    this.preferredTypes.update((value) => ({ ...value, [key]: type }));
  }
  hasEvidence(requirement: VerificationRequirement) {
    const accepted = requirement.alternatives || [requirement.key];
    return this.files().some(
      (x) =>
        x.state === 'uploaded' &&
        accepted.includes(x.documentType) &&
        x.evidence?.status !== 'REJECTED',
    );
  }
  requirementFiles(requirement: VerificationRequirement) {
    return this.files().filter((x) => x.requirementKey === requirement.key);
  }
  choose(requirement: VerificationRequirement, list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (!requirement.accepted_file_types.includes(file.type)) {
      this.error.set('Choose a PDF, JPG or PNG document.');
      return;
    }
    if (file.size > this.active()!.max_file_size_mb * 1024 * 1024) {
      this.error.set(`Choose a file smaller than ${this.active()!.max_file_size_mb} MB.`);
      return;
    }
    const item: LocalFile = {
      requirementKey: requirement.key,
      documentType: this.selectedDocumentType(requirement),
      file,
      state: 'uploading',
    };
    this.files.update((xs) => [
      ...xs.filter((x) => x.requirementKey !== requirement.key || x.evidence),
      item,
    ]);
    this.upload(item);
  }
  drop(requirement: VerificationRequirement, event: DragEvent) {
    event.preventDefault();
    this.choose(requirement, event.dataTransfer?.files || null);
  }
  drag(event: DragEvent) {
    event.preventDefault();
  }
  retry(item: LocalFile) {
    this.upload(item);
  }
  remove(item: LocalFile) {
    if (item.evidence)
      this.api.deleteDocument(item.evidence.id).subscribe({
        next: () => this.files.update((xs) => xs.filter((x) => x !== item)),
        error: () => this.error.set('Document could not be removed.'),
      });
    else this.files.update((xs) => xs.filter((x) => x !== item));
  }
  private upload(item: LocalFile) {
    item.state = 'uploading';
    this.files.update((xs) => [...xs]);
    const existing = this.draft();
    const type = this.active()!.type,
      body: VerificationRequestCreate = { verification_type: type },
      field = this.entityField(type);
    if (field) body[field as keyof VerificationRequestCreate] = this.selectedEntity();
    const request$ = existing
      ? of(existing)
      : (this.draftCreation$ ??= this.api.create(body).pipe(
          tap((request) => {
            this.draft.set(request);
            this.requests.update((xs) => [request, ...xs]);
          }),
          finalize(() => (this.draftCreation$ = undefined)),
          shareReplay({ bufferSize: 1, refCount: true }),
        ));
    request$.subscribe({
      next: (request) => this.uploadTo(request, item),
      error: (r) => {
        item.state = 'failed';
        item.error = r?.error?.detail || 'Could not create verification draft.';
        this.files.update((xs) => [...xs]);
      },
    });
  }
  private uploadTo(request: VerificationRequestSummary, item: LocalFile) {
    const data = new FormData();
    data.set('document_type', item.documentType);
    data.set('file', item.file);
    this.api.uploadDocument(request.id, data).subscribe({
      next: (evidence) => {
        item.state = 'uploaded';
        item.evidence = evidence;
        this.files.update((xs) => [...xs]);
      },
      error: (r) => {
        item.state = 'failed';
        item.error = r?.error?.file?.[0] || 'Upload failed.';
        this.files.update((xs) => [...xs]);
      },
    });
  }
  submit() {
    const request = this.draft();
    if (!request || this.busy() || !this.confirmed || !this.ready()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .submit(request.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.draft.set(updated);
          this.requests.update((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
          this.step.set(3);
        },
        error: (r) =>
          this.error.set(
            r?.error?.detail ||
              r?.error?.non_field_errors?.[0] ||
              'Verification could not be submitted.',
          ),
      });
  }
  fileSize(size: number) {
    return size < 1048576
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / 1048576).toFixed(1)} MB`;
  }
}

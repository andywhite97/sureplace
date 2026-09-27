import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { StaffApiService } from '../../core/api/staff-api.service';
import { ToastService } from '../../core/services/toast.service';
import { StaffOperationDetailComponent } from './staff-operation-detail.component';

const request = {
  id: '12345678-1234-1234-1234-123456789abc',
  verification_type: 'IDENTITY',
  status: 'UNDER_REVIEW',
  applicant_name: 'Andile Hlophe',
  applicant_email: 'andile@example.com',
  applicant_phone: '+26876123456',
  entity_name: 'Personal verification',
  submitted_at: '2026-09-13T18:59:00Z',
  created_at: '2026-09-13T18:50:00Z',
  requirements: [
    { key: 'NATIONAL_ID', label: 'Proof of identity', description: 'Government photo ID.', required: true, mode: 'ONE_OF', alternatives: ['NATIONAL_ID', 'PASSPORT'], uploaded: false, review_status: 'NEEDS_REPLACEMENT', reviewer_note: 'Please upload a clearer copy.' },
  ],
  documents: [],
  audit_events: [{ id: 'event-1', event_type: 'CHANGES_REQUESTED', previous_status: 'UNDER_REVIEW', new_status: 'CHANGES_REQUESTED', notes: 'Please upload a clearer copy.', actor_name: 'Staff reviewer', created_at: '2026-09-13T19:00:00Z' }],
};

describe('StaffOperationDetailComponent verification workspace', () => {
  const api = {
    verificationRequest: vi.fn(() => of(request)),
    verificationDocument: vi.fn(() => of(new Blob(['private'], { type: 'application/pdf' }))),
    startVerificationReview: vi.fn(() => of(request)),
    approveVerification: vi.fn(() => of(request)),
    rejectVerification: vi.fn(() => of(request)),
    requestVerificationChanges: vi.fn(() => of(request)),
    rejectVerificationDocument: vi.fn(() => of(request)),
  };
  const toast = { show: vi.fn() };
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StaffOperationDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { workspace: 'verification' }, paramMap: { get: () => request.id } } } },
        { provide: StaffApiService, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(StaffOperationDetailComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('shows applicant summary, request ID, status and requirement-specific change notes', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Andile Hlophe');
    expect(fixture.nativeElement.textContent).toContain('12345678…789abc');
    expect(fixture.nativeElement.textContent).toContain('Under review');
    expect(fixture.nativeElement.textContent).toContain('Please upload a clearer copy.');
    expect(fixture.nativeElement.querySelector('[aria-label="Copy full request ID"]')).toBeTruthy();
  });
  it('calculates progress from required requirement state and prevents incomplete approval', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('0%');
    expect(fixture.nativeElement.textContent).toContain('0 of 1 required requirements completed');
    expect(fixture.nativeElement.querySelector('.action-card .approve').disabled).toBe(true);
  });
  it('shows protected document empty state and renders existing audit history', () => {
    const fixture = create();
    fixture.componentInstance.activeTab.set('documents');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No documents have been uploaded yet.');
    fixture.componentInstance.activeTab.set('history');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Changes requested');
    expect(fixture.nativeElement.textContent).toContain('Staff reviewer');
  });
  it('requires selected requirement and reason before sending a change request', () => {
    const fixture = create();
    fixture.componentInstance.setDecision('request_changes');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.decision button.approve').disabled).toBe(true);
    fixture.componentInstance.toggleRequirement('NATIONAL_ID', true);
    fixture.componentInstance.notes = 'Please provide a clearer copy.';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.decision button.approve').disabled).toBe(false);
    fixture.componentInstance.submitDecision();
    expect(api.requestVerificationChanges).toHaveBeenCalledWith(request.id, ['NATIONAL_ID'], 'Please provide a clearer copy.');
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { VerificationApiService } from '../../core/api/manage-api.services';
import { AuthService } from '../../core/auth/auth.service';
import {
  VerificationDefinition,
  VerificationRequestSummary,
} from '../../core/models/manage.models';
import { VerificationComponent } from './verification.component';

const definition = (
  type: string,
  overrides: Partial<VerificationDefinition> = {},
): VerificationDefinition => ({
  type,
  label: type[0] + type.slice(1).toLowerCase(),
  title: `${type[0] + type.slice(1).toLowerCase()} verification`,
  description: `Verify ${type.toLowerCase()} details.`,
  disclaimer: 'No guarantee.',
  max_file_size_mb: 10,
  scope: ['Supporting information is consistent'],
  badge_meaning: `Scoped ${type.toLowerCase()} evidence was reviewed.`,
  badge_disclaimer: 'Verification does not guarantee a transaction.',
  prerequisites: [],
  requirements: [
    {
      key: 'NATIONAL_ID',
      label: 'National ID or passport',
      description: 'Government ID.',
      required: true,
      mode: 'ONE_OF',
      alternatives: ['NATIONAL_ID', 'PASSPORT'],
      accepted_file_types: ['application/pdf', 'image/jpeg', 'image/png'],
    },
  ],
  ...overrides,
});
const definitions = ['IDENTITY', 'AGENT', 'AGENCY', 'PROPERTY', 'STAY', 'BUSINESS'].map((type) =>
  definition(type),
);
const request: VerificationRequestSummary = {
  id: 'request-1',
  verification_type: 'IDENTITY',
  status: 'DRAFT',
  agency: null,
  agent_profile: null,
  property: null,
  stay: null,
  submitted_at: null,
  reviewed_at: null,
  reviewer_notes: '',
  rejection_reason: '',
  created_at: '2026-09-13T10:00:00Z',
  updated_at: '2026-09-13T10:00:00Z',
  documents: [],
};

describe('VerificationComponent', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(() => {
    api = {
      types: vi.fn(() => of(definitions)),
      list: vi.fn(() => of({ count: 0, next: null, previous: null, results: [] })),
      eligible: vi.fn(() =>
        of({
          agencies: [{ id: 'a1', name: 'Sure Agency' }],
          agents: [],
          properties: [{ id: 'p1', name: 'Mbabane Home', public_id: 'SP-1' }],
          stays: [],
        }),
      ),
      create: vi.fn(() => of(request)),
      uploadDocument: vi.fn(() =>
        of({
          id: 'doc-1',
          document_type: 'NATIONAL_ID',
          status: 'PENDING',
          file_name: 'id.pdf',
          file_size: 1200,
          uploaded_at: '',
          rejection_reason: '',
        }),
      ),
      deleteDocument: vi.fn(() => of(undefined)),
      submit: vi.fn(() =>
        of({ ...request, status: 'SUBMITTED', submitted_at: '2026-09-13T11:00:00Z' }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [VerificationComponent],
      providers: [
        { provide: VerificationApiService, useValue: api },
        {
          provide: AuthService,
          useValue: { user: signal({ first_name: 'Andile', last_name: 'Hlophe' }) },
        },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(VerificationComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('renders all six categories with not-started actions', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelectorAll('.category-card')).toHaveLength(6);
    const icons = Array.from(
      fixture.nativeElement.querySelectorAll('.category-icon img'),
    ) as HTMLImageElement[];
    expect(icons).toHaveLength(6);
    expect(icons.map((icon) => decodeURI(icon.src))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/verification icons/verified_identity.png'),
        expect.stringContaining('/verification icons/verified_agent.png'),
        expect.stringContaining('/verification icons/verified_agency.png'),
        expect.stringContaining('/verification icons/verified_property.png'),
        expect.stringContaining('/verification icons/verified_stay.png'),
        expect.stringContaining('/verification icons/verified_business.png'),
      ]),
    );
    expect(fixture.nativeElement.textContent).toContain('Get started');
    expect(fixture.nativeElement.textContent).not.toContain('Status unavailable');
  });
  it('shows backend scope, badge meaning and privacy on overview', () => {
    const fixture = create();
    fixture.componentInstance.open(definitions[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Supporting information is consistent');
    expect(fixture.nativeElement.textContent).toContain('Scoped identity evidence was reviewed');
    expect(fixture.nativeElement.textContent).toContain('Your documents are private');
    expect(decodeURI(fixture.nativeElement.querySelector('.meaning-icon').src)).toContain(
      '/verification icons/verified_identity.png',
    );
  });
  it('shows only eligible entities and sends the selected entity when creating a draft', () => {
    const fixture = create(),
      component = fixture.componentInstance;
    const property = definition('PROPERTY', { requirements: definitions[0].requirements });
    component.open(property);
    expect(component.entityOptions()[0].name).toBe('Mbabane Home');
    component.step.set(1);
    component.choose(property.requirements[0], {
      0: new File(['x'], 'id.pdf', { type: 'application/pdf' }),
      length: 1,
      item: () => null,
    } as unknown as FileList);
    expect(api['create']).toHaveBeenCalledWith({ verification_type: 'PROPERTY', property: 'p1' });
  });
  it('does not create another draft when one already exists', () => {
    api['list'].mockReturnValue(of({ count: 1, next: null, previous: null, results: [request] }));
    const component = create().componentInstance;
    component.open(definitions[0]);
    component.choose(definitions[0].requirements[0], {
      0: new File(['x'], 'id.pdf', { type: 'application/pdf' }),
      length: 1,
      item: () => null,
    } as unknown as FileList);
    expect(api['create']).not.toHaveBeenCalled();
    expect(api['uploadDocument']).toHaveBeenCalled();
  });
  it('requires consent and shows pending details after submission', () => {
    api['list'].mockReturnValue(
      of({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            ...request,
            documents: [
              {
                id: 'doc-1',
                document_type: 'NATIONAL_ID',
                status: 'PENDING',
                file_name: 'id.pdf',
                file_size: 1200,
                uploaded_at: '',
                rejection_reason: '',
              },
            ],
          },
        ],
      }),
    );
    const fixture = create(),
      component = fixture.componentInstance;
    component.open(definitions[0]);
    component.step.set(2);
    component.submit();
    expect(api['submit']).not.toHaveBeenCalled();
    component.confirmed = true;
    component.submit();
    fixture.detectChanges();
    expect(api['submit']).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('pending review');
  });
  it('keeps an upload failure available for retry', () => {
    const pending = new Subject<never>();
    api['uploadDocument'].mockReturnValue(pending);
    const component = create().componentInstance;
    component.open(definitions[0]);
    component.choose(definitions[0].requirements[0], {
      0: new File(['x'], 'id.pdf', { type: 'application/pdf' }),
      length: 1,
      item: () => null,
    } as unknown as FileList);
    expect(component.files()[0].state).toBe('uploading');
  });

  it('uses contextual actions for draft, pending, changes, verified and rejected states', () => {
    const statuses = ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'];
    api['list'].mockReturnValue(
      of({
        count: statuses.length,
        next: null,
        previous: null,
        results: statuses.map((status, index) => ({
          ...request,
          id: `request-${index}`,
          verification_type: definitions[index].type,
          status,
        })),
      }),
    );
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Continue');
    expect(fixture.nativeElement.textContent).toContain('Fix changes');
    expect(fixture.nativeElement.textContent.match(/View details/g)).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Get started');
  });

  it('opens changes requested at evidence and shows the reviewer note', () => {
    api['list'].mockReturnValue(
      of({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            ...request,
            status: 'CHANGES_REQUESTED',
            reviewer_notes: 'Please upload a clearer image showing all corners.',
          },
        ],
      }),
    );
    const fixture = create();
    fixture.componentInstance.open(definitions[0]);
    fixture.detectChanges();
    expect(fixture.componentInstance.step()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Changes requested');
    expect(fixture.nativeElement.textContent).toContain('Please upload a clearer image');
  });

  it('shows the scoped badge meaning for an approved request', () => {
    api['list'].mockReturnValue(
      of({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            ...request,
            status: 'APPROVED',
            reviewed_at: '2026-09-13T12:00:00Z',
          },
        ],
      }),
    );
    const fixture = create();
    fixture.componentInstance.open(definitions[0]);
    fixture.detectChanges();
    expect(fixture.componentInstance.step()).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Verified Identity');
    expect(fixture.nativeElement.textContent).toContain('Scoped identity evidence was reviewed');
  });

  it('rejects an oversized file before creating a draft', () => {
    const component = create().componentInstance;
    component.open(definitions[0]);
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', {
      type: 'application/pdf',
    });
    component.choose(definitions[0].requirements[0], {
      0: file,
      length: 1,
      item: () => file,
    } as unknown as FileList);
    expect(api['create']).not.toHaveBeenCalled();
    expect(component.error()).toContain('smaller than 10 MB');
  });
});

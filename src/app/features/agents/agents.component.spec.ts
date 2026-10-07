import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AgentsComponent } from './agents.component';
import { AgentsApiService } from '../../core/api/agents-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { MessagingApiService } from '../../core/api/messaging-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';

describe('AgentsComponent', () => {
  let fixture: ComponentFixture<AgentsComponent>;
  const api = {
    list: vi.fn(() =>
      of({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 'a1',
            name: 'Thandiwe Dlamini',
            avatar: null,
            bio: 'Residential sales & rentals.',
            agency: {
              id: 'g1',
              name: 'Sizulu Properties',
              slug: 'sizulu-properties',
              logo: null,
              verification_status: 'VERIFIED',
            },
            verified_agent: true,
            verified_agency: true,
            service_areas: ['Mbabane', 'Ezulwini'],
            active_listings_count: 24,
            is_favourited: false,
          },
        ],
      }),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentsComponent],
      providers: [
        provideRouter([]),
        { provide: AgentsApiService, useValue: api },
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
        { provide: MessagingApiService, useValue: { createForAgent: vi.fn() } },
        { provide: ReferenceApiService, useValue: { data: () => ({ regions: [] }), load: () => of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentsComponent);
    fixture.detectChanges();
  });

  it('renders the agents heading and result summary', () => {
    expect(fixture.nativeElement.textContent).toContain('Find an agent');
    expect(fixture.nativeElement.textContent).toContain('1 agent found');
  });

  it('opens the filters separately, shows active filters, and resets them without clearing search', () => {
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const showModal = vi.fn(() => dialog.setAttribute('open', ''));
    const close = vi.fn(() => dialog.removeAttribute('open'));
    Object.defineProperty(dialog, 'showModal', { value: showModal });
    Object.defineProperty(dialog, 'close', { value: close });
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(fixture.nativeElement.querySelector('.toolbar .filters')).toBeNull();
    fixture.nativeElement.querySelector('.filter-trigger').click();
    expect(showModal).toHaveBeenCalled();
    fixture.componentInstance.form.patchValue({ search: 'Thandiwe', agency: 'g1', verifiedOnly: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.filter-count').textContent.trim()).toBe('2');
    fixture.componentInstance.load();
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Thandiwe', agency: 'g1', verified: 'true' }));
    fixture.nativeElement.querySelector('.filter-reset').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.search.value).toBe('Thandiwe');
    expect(fixture.componentInstance.activeFilterCount()).toBe(0);
    fixture.nativeElement.querySelector('.filter-dialog-actions .primary').click();
    expect(close).toHaveBeenCalled();
  });
});

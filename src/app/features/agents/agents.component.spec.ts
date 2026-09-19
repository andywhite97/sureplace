import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AgentsComponent } from './agents.component';
import { AgentsApiService } from '../../core/api/agents-api.service';

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentsComponent);
    fixture.detectChanges();
  });

  it('renders the agents heading and result summary', () => {
    expect(fixture.nativeElement.textContent).toContain('Find an agent');
    expect(fixture.nativeElement.textContent).toContain('1 agent found');
  });
});

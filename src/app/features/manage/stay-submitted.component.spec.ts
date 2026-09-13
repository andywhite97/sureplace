import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StayManagementApiService } from '../../core/api/manage-api.services';
import { StaySubmittedComponent } from './stay-submitted.component';

describe('Stay submission confirmation', () => {
  function setup(status: string) {
    TestBed.configureTestingModule({
      imports: [StaySubmittedComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'stay' }) } },
        },
        {
          provide: StayManagementApiService,
          useValue: {
            detail: () =>
              of({
                id: 'stay',
                status,
                name: 'Lodge',
                room_types: [],
                submitted_at: '2026-09-13T06:00:00Z',
              }),
          },
        },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(StaySubmittedComponent);
    fixture.detectChanges();
    return { fixture, navigate };
  }
  it('confirms persisted status, shows a date and offers management, another stay and private preview', () => {
    const { fixture } = setup('UNDER_REVIEW');
    expect(fixture.nativeElement.textContent).toContain('Stay submitted!');
    expect(fixture.nativeElement.textContent).toContain('Go to My Stays');
    expect(fixture.nativeElement.textContent).toContain('Add Another Stay');
    expect(fixture.nativeElement.textContent).toContain('Preview Stay');
    expect(fixture.nativeElement.querySelector('a[href^="/stays/"]')).toBeNull();
  });
  it('does not show success for a draft opened directly on the success route', () => {
    const { fixture, navigate } = setup('DRAFT');
    expect(fixture.nativeElement.textContent).not.toContain('Stay submitted!');
    expect(navigate).toHaveBeenCalledWith(['/account/manage/stays']);
  });
});

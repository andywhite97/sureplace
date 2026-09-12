import { TestBed } from '@angular/core/testing';
import { ManageStatusComponent, QualityScoreComponent } from './manage-ui';

describe('management ui helpers', () => {
  it('renders friendly workflow statuses', () => {
    const f = TestBed.configureTestingModule({ imports: [ManageStatusComponent] }).createComponent(
      ManageStatusComponent,
    );
    f.componentRef.setInput('status', 'UNDER_REVIEW');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Pending review');
  });

  it('renders listing quality suggestions', () => {
    const f = TestBed.configureTestingModule({ imports: [QualityScoreComponent] }).createComponent(
      QualityScoreComponent,
    );
    f.componentRef.setInput('score', 82);
    f.componentRef.setInput('suggestions', ['Add more photos to improve your listing']);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('82%');
    expect(f.nativeElement.textContent).toContain('Add more photos to improve your listing');
  });
});

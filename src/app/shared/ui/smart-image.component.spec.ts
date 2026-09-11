import { TestBed } from '@angular/core/testing';
import { SmartImageComponent } from './smart-image.component';

describe('SmartImageComponent', () => {
  it('applies Cloudinary card transforms centrally', () => {
    const fixture = TestBed.createComponent(SmartImageComponent);
    fixture.componentRef.setInput('src', 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
    fixture.componentRef.setInput('alt', 'Sample home');
    fixture.componentRef.setInput('width', 360);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_360,c_fill/sample.jpg',
    );
  });

  it('shows a deterministic fallback after image load failure', () => {
    const fixture = TestBed.createComponent(SmartImageComponent);
    fixture.componentRef.setInput('src', 'https://example.com/missing.jpg');
    fixture.componentRef.setInput('alt', 'Missing home');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.fallback').getAttribute('aria-label')).toBe(
      'Missing home',
    );
  });
});

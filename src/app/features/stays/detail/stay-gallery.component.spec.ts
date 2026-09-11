import { TestBed } from '@angular/core/testing';
import { StayImage } from '../../../core/models/listing.models';
import { StayGalleryComponent } from './stay-gallery.component';

describe('StayGalleryComponent', () => {
  const images: StayImage[] = Array.from({ length: 6 }, (_, index) => ({
    id: `image-${index}`,
    image: `/stay-${index}.jpg`,
    caption: `Stay photo ${index + 1}`,
    sort_order: index,
    is_cover: index === 0,
    created_at: '',
  }));

  it('renders a desktop mosaic from the first five stay photos', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [StayGalleryComponent],
    }).createComponent(StayGalleryComponent);
    fixture.componentRef.setInput('title', 'Valley Guest House');
    fixture.componentRef.setInput('location', 'Ezulwini, Hhohho, Eswatini');
    fixture.componentRef.setInput('images', images);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.mosaic .tile').length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('View all photos');
  });

  it('opens the existing photo viewer affordance from the gallery', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [StayGalleryComponent],
    }).createComponent(StayGalleryComponent);
    fixture.componentRef.setInput('title', 'Valley Guest House');
    fixture.componentRef.setInput('images', images);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.mosaic .tile')
      ?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lightboxOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeTruthy();
  });

  it('uses the fallback image state when a stay has no photos', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [StayGalleryComponent],
    }).createComponent(StayGalleryComponent);
    fixture.componentRef.setInput('title', 'Valley Guest House');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fallback sp-image')).toBeTruthy();
  });
});

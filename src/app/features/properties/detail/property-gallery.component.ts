import { isPlatformBrowser } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { PropertyImage } from '../../../core/models/listing.models';
import { SmartImageComponent } from '../../../shared/ui/smart-image.component';
@Component({
  selector: 'sp-property-gallery',
  standalone: true,
  imports: [SmartImageComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<section class="gallery" aria-label="Property gallery">
    @if (images().length) {
      <swiper-container
        #main
        keyboard="true"
        navigation="true"
        (swiperslidechange)="changed($event)"
      >
        @for (image of images().slice(0, 12); track image.id; let first = $first) {
          <swiper-slide
            ><sp-image
              [src]="image.image"
              [alt]="image.caption || title()"
              ratio="16 / 10"
              [priority]="first"
          /></swiper-slide>
        }</swiper-container
      ><span class="counter">{{ selected() + 1 }} / {{ images().length }}</span>
      @if (images().length > 1) {
        <div class="thumbs" role="list" aria-label="Select image">
          @for (image of images().slice(0, 12); track image.id; let i = $index) {
            <button
              type="button"
              [class.active]="selected() === i"
              (click)="select(i)"
              [attr.aria-label]="'Show image ' + (i + 1)"
            >
              <sp-image [src]="image.image" alt="" ratio="4 / 3" />
            </button>
          }
        </div>
      }
    } @else {
      <sp-image [src]="null" [alt]="title()" ratio="16 / 9" [priority]="true" />
    }
  </section>`,
  styleUrl: './property-gallery.component.scss',
})
export class PropertyGalleryComponent {
  private platformId = inject(PLATFORM_ID);
  images = input<PropertyImage[]>([]);
  title = input.required<string>();
  main = viewChild<ElementRef & { nativeElement: { swiper: { slideTo: (i: number) => void } } }>(
    'main',
  );
  selected = signal(0);
  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId))
        void import('swiper/element/bundle').then(({ register }) => register());
    });
  }
  select(i: number) {
    this.selected.set(i);
    this.main()?.nativeElement.swiper?.slideTo(i);
  }
  changed(event: Event) {
    const detail = (event as CustomEvent).detail;
    const swiper = Array.isArray(detail) ? detail[0] : detail;
    this.selected.set(swiper?.activeIndex || 0);
  }
}

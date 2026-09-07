import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { register } from 'swiper/element/bundle';
import { StayImage } from '../../../core/models/listing.models';
import { SmartImageComponent } from '../../../shared/ui/smart-image.component';
register();
@Component({
  selector: 'sp-stay-gallery',
  standalone: true,
  imports: [SmartImageComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<section class="gallery" aria-label="Stay gallery">
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
              ratio="16 / 9"
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
              [attr.aria-pressed]="selected() === i"
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
  styles: [
    `
      :host {
        display: block;
      }
      .gallery {
        position: relative;
      }
      swiper-container {
        border-radius: var(--radius);
        overflow: hidden;
        background: #dce8e5;
      }
      .counter {
        position: absolute;
        right: 1rem;
        top: 1rem;
        z-index: 2;
        background: #102d2dcc;
        color: #fff;
        padding: 0.35rem 0.65rem;
        border-radius: 2rem;
      }
      .thumbs {
        display: flex;
        gap: 0.55rem;
        overflow: auto;
        padding: 0.7rem 0;
      }
      .thumbs button {
        flex: 0 0 92px;
        border: 2px solid transparent;
        border-radius: 0.55rem;
        padding: 0;
        overflow: hidden;
        background: none;
      }
      .thumbs button.active {
        border-color: var(--teal);
      }
      @media (max-width: 650px) {
        .thumbs button {
          flex-basis: 72px;
        }
      }
    `,
  ],
})
export class StayGalleryComponent {
  images = input<StayImage[]>([]);
  title = input.required<string>();
  main = viewChild<ElementRef & { nativeElement: { swiper: { slideTo: (i: number) => void } } }>(
    'main',
  );
  selected = signal(0);
  select(i: number) {
    this.selected.set(i);
    this.main()?.nativeElement.swiper?.slideTo(i);
  }
  changed(e: Event) {
    const d = (e as CustomEvent).detail,
      s = Array.isArray(d) ? d[0] : d;
    this.selected.set(s?.activeIndex || 0);
  }
}

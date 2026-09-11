import { isPlatformBrowser } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { StayImage } from '../../../core/models/listing.models';
import { SmartImageComponent } from '../../../shared/ui/smart-image.component';

@Component({
  selector: 'sp-stay-gallery',
  standalone: true,
  imports: [SmartImageComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<section class="gallery" aria-label="Stay gallery">
      @if (images().length) {
        <div class="mosaic" [class.single]="visibleImages().length === 1">
          @for (image of visibleImages(); track image.id; let i = $index; let last = $last) {
            <button
              type="button"
              class="tile"
              [class.primary]="i === 0"
              [attr.aria-label]="'Open photo ' + (i + 1) + ' of ' + images().length"
              (click)="open(i)"
            >
              <sp-image
                [src]="image.image"
                [alt]="image.caption || title() + ' in ' + location()"
                ratio="16 / 10"
                [priority]="i === 0"
                [width]="i === 0 ? 960 : 520"
                [height]="i === 0 ? 620 : 360"
              />
              @if (last && images().length > 1) {
                <span class="view-all"
                  ><i class="fa-regular fa-images" aria-hidden="true"></i> View all photos</span
                >
              }
            </button>
          }
        </div>
        <div class="mobile-swiper">
          <swiper-container
            #main
            keyboard="true"
            navigation="true"
            (swiperslidechange)="changed($event)"
          >
            @for (
              image of images().slice(0, 12);
              track image.id;
              let first = $first;
              let i = $index
            ) {
              <swiper-slide
                ><button type="button" (click)="open(i)">
                  <sp-image
                    [src]="image.image"
                    [alt]="image.caption || title() + ' in ' + location()"
                    ratio="4 / 3"
                    [priority]="first"
                    [width]="760"
                    [height]="570"
                  /></button
              ></swiper-slide>
            }
          </swiper-container>
          <span class="counter">{{ selected() + 1 }} / {{ images().length }}</span>
          <button type="button" class="mobile-all" (click)="open(selected())">
            <i class="fa-regular fa-images" aria-hidden="true"></i> View all photos
          </button>
        </div>
      } @else {
        <div class="fallback">
          <sp-image [src]="null" [alt]="title()" ratio="16 / 9" [priority]="true" />
        </div>
      }
    </section>

    @if (lightboxOpen()) {
      <div
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Stay photos"
        (click)="close()"
      >
        <div class="lightbox-panel" (click)="$event.stopPropagation()">
          <button type="button" class="close" aria-label="Close photos" (click)="close()">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="nav previous"
            aria-label="Previous photo"
            (click)="previous()"
          >
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <sp-image
            [src]="activeImage()?.image || null"
            [alt]="activeImage()?.caption || title() + ' in ' + location()"
            ratio="16 / 10"
            [priority]="true"
            [width]="1200"
            [height]="750"
          />
          <button type="button" class="nav next" aria-label="Next photo" (click)="next()">
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
          <p>{{ selected() + 1 }} / {{ images().length }}</p>
        </div>
      </div>
    }`,
  styles: [
    `
      :host {
        display: block;
      }
      .gallery {
        position: relative;
      }
      .mosaic {
        display: grid;
        grid-template-columns: minmax(0, 1.18fr) minmax(0, 1fr) minmax(0, 1fr);
        grid-auto-rows: 1fr;
        gap: 0.45rem;
        height: clamp(360px, 38vw, 460px);
        overflow: hidden;
        border-radius: 1.25rem;
        background: var(--line);
      }
      .mosaic.single {
        grid-template-columns: 1fr;
      }
      .tile {
        position: relative;
        min-width: 0;
        padding: 0;
        border: 0;
        background: #dce8e5;
        cursor: pointer;
        overflow: hidden;
      }
      .tile.primary {
        grid-row: span 2;
      }
      .tile sp-image,
      .fallback sp-image,
      .mobile-swiper sp-image {
        display: block;
        height: 100%;
      }
      .tile:hover sp-image {
        transform: scale(1.015);
      }
      .tile sp-image {
        transition:
          transform 180ms ease,
          filter 180ms ease;
      }
      .view-all,
      .mobile-all,
      .counter {
        position: absolute;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        border-radius: 999px;
        background: rgba(21, 43, 42, 0.86);
        color: #fff;
        font-weight: 800;
        line-height: 1;
        box-shadow: 0 12px 30px rgba(21, 43, 42, 0.2);
      }
      .view-all {
        right: 1rem;
        bottom: 1rem;
        padding: 0.72rem 0.9rem;
      }
      .mobile-swiper {
        display: none;
        position: relative;
      }
      .mobile-swiper button {
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
      }
      swiper-container {
        overflow: hidden;
        border-radius: 1rem;
        background: #dce8e5;
      }
      .counter {
        right: 0.75rem;
        top: 0.75rem;
        padding: 0.45rem 0.7rem;
        font-size: 0.82rem;
      }
      .mobile-all {
        right: 0.75rem;
        bottom: 0.75rem;
        width: auto;
        padding: 0.65rem 0.8rem;
        font-size: 0.82rem;
      }
      .fallback {
        overflow: hidden;
        border-radius: 1.25rem;
      }
      .lightbox {
        position: fixed;
        inset: 0;
        z-index: 120;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgba(10, 24, 24, 0.86);
      }
      .lightbox-panel {
        position: relative;
        width: min(1040px, 100%);
        display: grid;
        gap: 0.8rem;
      }
      .lightbox-panel sp-image {
        overflow: hidden;
        border-radius: 1rem;
        background: #dce8e5;
      }
      .lightbox-panel p {
        margin: 0;
        text-align: center;
        color: #fff;
        font-weight: 800;
      }
      .close,
      .nav {
        position: absolute;
        z-index: 3;
        display: grid;
        place-items: center;
        width: 2.75rem;
        height: 2.75rem;
        border: 0;
        border-radius: 999px;
        background: #fff;
        color: var(--midnight);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
      }
      .close {
        top: 0.75rem;
        right: 0.75rem;
      }
      .nav {
        top: 50%;
        transform: translateY(-50%);
      }
      .previous {
        left: 0.75rem;
      }
      .next {
        right: 0.75rem;
      }
      @media (max-width: 760px) {
        .mosaic {
          display: none;
        }
        .mobile-swiper {
          display: block;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .tile sp-image {
          transition: none;
        }
        .tile:hover sp-image {
          transform: none;
        }
      }
    `,
  ],
})
export class StayGalleryComponent {
  private platformId = inject(PLATFORM_ID);
  images = input<StayImage[]>([]);
  title = input.required<string>();
  location = input('');
  main = viewChild<ElementRef & { nativeElement: { swiper: { slideTo: (i: number) => void } } }>(
    'main',
  );
  selected = signal(0);
  lightboxOpen = signal(false);
  visibleImages = computed(() => this.images().slice(0, 5));
  activeImage = computed(() => this.images()[this.selected()] || null);

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId))
        void import('swiper/element/bundle').then(({ register }) => register());
    });
  }

  open(index: number) {
    this.selected.set(index);
    this.main()?.nativeElement.swiper?.slideTo(index);
    this.lightboxOpen.set(true);
  }

  close() {
    this.lightboxOpen.set(false);
  }

  previous() {
    const total = this.images().length;
    if (!total) return;
    this.selected.set((this.selected() - 1 + total) % total);
  }

  next() {
    const total = this.images().length;
    if (!total) return;
    this.selected.set((this.selected() + 1) % total);
  }

  changed(e: Event) {
    const detail = (e as CustomEvent).detail;
    const swiper = Array.isArray(detail) ? detail[0] : detail;
    this.selected.set(swiper?.activeIndex || 0);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape() {
    this.close();
  }

  @HostListener('document:keydown.arrowleft')
  previousOnArrow() {
    if (this.lightboxOpen()) this.previous();
  }

  @HostListener('document:keydown.arrowright')
  nextOnArrow() {
    if (this.lightboxOpen()) this.next();
  }
}

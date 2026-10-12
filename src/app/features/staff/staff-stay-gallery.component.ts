import { Component, ElementRef, computed, effect, input, signal, viewChild } from '@angular/core';
import { StayImage } from '../../core/models/listing.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';

@Component({
  selector: 'sp-staff-stay-gallery',
  standalone: true,
  imports: [SmartImageComponent],
  template: `
    <section class="gallery" [attr.aria-label]="title() + ' photos'">
      <div class="primary-photo">
        <button
          class="photo-open"
          type="button"
          [disabled]="!photos().length"
          aria-label="Open full-screen photos"
          (click)="open()"
        >
          <sp-image
            [src]="active()?.image || null"
            [alt]="active()?.caption || title()"
            ratio="16 / 10"
            [width]="800"
            [height]="500"
            [priority]="true"
          />
        </button>
        @if (photos().length > 1) {
          <button
            class="arrow previous"
            type="button"
            aria-label="Previous photo"
            (click)="move(-1)"
          >
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <button class="arrow next" type="button" aria-label="Next photo" (click)="move(1)">
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        }
        <span class="counter" aria-live="polite"
          ><i class="fa-regular fa-image" aria-hidden="true"></i>
          {{ photos().length ? index() + 1 : 0 }} / {{ photos().length }}</span
        >
      </div>
      @if (photos().length > 1) {
        <div class="thumbnails" aria-label="Choose a photo">
          @for (photo of photos(); track photo.id; let i = $index) {
            <button
              type="button"
              [class.selected]="index() === i"
              [attr.aria-label]="'View photo ' + (i + 1)"
              [attr.aria-pressed]="index() === i"
              (click)="index.set(i)"
            >
              <sp-image
                [src]="photo.image"
                [alt]="photo.caption || title() + ' photo ' + (i + 1)"
                ratio="4 / 3"
                [width]="180"
                [height]="135"
              />
            </button>
          }
        </div>
      }
    </section>
    <dialog #lightbox [attr.aria-labelledby]="labelId" (keydown)="key($event)">
      <header>
        <h2 [id]="labelId">{{ title() }} photos</h2>
        <button type="button" aria-label="Close photos" (click)="close()">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </header>
      <sp-image
        [src]="active()?.image || null"
        [alt]="active()?.caption || title()"
        ratio="16 / 10"
        fit="contain"
        [width]="1400"
        [height]="875"
        [priority]="true"
      />
      <footer>
        <button type="button" [disabled]="photos().length < 2" (click)="move(-1)">Previous</button
        ><span aria-live="polite">{{ index() + 1 }} / {{ photos().length }}</span
        ><button type="button" [disabled]="photos().length < 2" (click)="move(1)">Next</button>
      </footer>
    </dialog>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .primary-photo {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        background: var(--mist);
      }
      button {
        font: inherit;
        cursor: pointer;
      }
      .photo-open {
        display: block;
        width: 100%;
        border: 0;
        padding: 0;
        background: transparent;
      }
      .arrow {
        position: absolute;
        top: 45%;
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border: 0;
        border-radius: 50%;
        background: white;
        color: var(--midnight);
        box-shadow: 0 2px 9px #162e2a22;
      }
      .previous {
        left: 10px;
      }
      .next {
        right: 10px;
      }
      .counter {
        position: absolute;
        right: 10px;
        bottom: 10px;
        background: #163532df;
        color: white;
        border-radius: 7px;
        padding: 6px 9px;
        font-size: 0.75rem;
        pointer-events: none;
      }
      .thumbnails {
        display: flex;
        gap: 7px;
        overflow: auto;
        padding: 9px 2px 3px;
        scrollbar-width: thin;
      }
      .thumbnails button {
        flex: 0 0 72px;
        overflow: hidden;
        border: 2px solid transparent;
        border-radius: 7px;
        padding: 0;
        background: var(--mist);
      }
      .thumbnails button.selected {
        border-color: var(--teal);
      }
      button:focus-visible {
        outline: 3px solid var(--teal);
        outline-offset: 2px;
      }
      button:disabled {
        cursor: default;
      }
      dialog {
        width: min(940px, calc(100vw - 32px));
        max-height: 90dvh;
        overflow: auto;
        padding: 16px;
        border: 0;
        border-radius: 16px;
        box-sizing: border-box;
        color: var(--midnight);
      }
      dialog::backdrop {
        background: #112923d9;
      }
      header,
      footer {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      }
      header {
        margin-bottom: 12px;
      }
      h2 {
        margin: 0;
        font-size: 1rem;
      }
      dialog button {
        min-height: 44px;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px 12px;
        background: white;
      }
      footer {
        margin-top: 12px;
      }
    `,
  ],
})
export class StaffStayGalleryComponent {
  private static sequence = 0;
  labelId = `stay-gallery-${++StaffStayGalleryComponent.sequence}`;
  images = input<StayImage[]>([]);
  title = input('Stay');
  index = signal(0);
  lightbox = viewChild.required<ElementRef<HTMLDialogElement>>('lightbox');
  photos = computed(() =>
    [...this.images()].sort(
      (a, b) =>
        Number(b.is_cover) - Number(a.is_cover) || (a.sort_order || 0) - (b.sort_order || 0),
    ),
  );
  active = computed(() => this.photos()[this.index()] || this.photos()[0] || null);
  constructor() {
    effect(() => {
      if (this.index() >= this.photos().length && this.index() !== 0) this.index.set(0);
    });
  }
  move(delta: number) {
    const length = this.photos().length;
    if (length) this.index.set((this.index() + delta + length) % length);
  }
  open() {
    if (this.photos().length) this.lightbox().nativeElement.showModal();
  }
  close() {
    this.lightbox().nativeElement.close();
  }
  key(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }
}

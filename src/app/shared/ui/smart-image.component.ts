import { Component, computed, effect, input, signal } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'sp-image',
  standalone: true,
  imports: [IconComponent],
  template: `<div [style.aspect-ratio]="ratio()" [class.is-loading]="displaySrc() && !loaded()">
    @if (displaySrc(); as source) {
      <img
        [class.is-loaded]="loaded()"
        [src]="source"
        [alt]="alt()"
        [attr.loading]="priority() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : 'auto'"
        [attr.width]="width()"
        [attr.height]="height()"
        (load)="loaded.set(true)"
        (error)="failedSource.set(source)"
      />
    } @else {
      <span class="fallback" role="img" [attr.aria-label]="alt()"><sp-icon name="home" /></span>
    }
  </div>`,
  styles: [
    `div{position:relative;display:grid;place-items:center;background:#e7eeec;overflow:hidden}div.is-loading::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,#e7eeec 30%,#f7fbfa 46%,#e7eeec 62%);background-size:220% 100%;animation:sp-image-shimmer 1.15s linear infinite;pointer-events:none}img{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .18s ease}img.is-loaded{opacity:1}.fallback{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#e7eeec,#f8fbfa)}sp-icon{font-size:2rem;color:var(--slate)}@keyframes sp-image-shimmer{to{background-position:-220% 0}}@media(prefers-reduced-motion:reduce){div.is-loading::after{animation:none}img{transition:none}}`,
  ],
})
export class SmartImageComponent {
  src = input<string | null>();
  alt = input.required<string>();
  ratio = input('4 / 3');
  priority = input(false);
  width = input(640);
  height = input(480);
  failedSource = signal<string | null>(null);
  loaded = signal(false);
  displaySrc = computed(() => {
    const source = this.optimizedSource(this.src());
    return source && source !== this.failedSource() ? source : null;
  });

  constructor() {
    effect(() => {
      this.displaySrc();
      this.loaded.set(false);
    });
  }

  private optimizedSource(source: string | null | undefined) {
    if (!source || !source.includes('res.cloudinary.com') || !source.includes('/image/upload/')) {
      return source || null;
    }
    if (/\/image\/upload\/[^/]*f_auto/.test(source)) return source;
    return source.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${this.width()},c_fill/`);
  }
}

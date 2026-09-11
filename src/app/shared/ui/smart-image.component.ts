import { Component, computed, input, signal } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'sp-image',
  standalone: true,
  imports: [IconComponent],
  template: `<div [style.aspect-ratio]="ratio()">
    @if (displaySrc(); as source) {
      <img
        [src]="source"
        [alt]="alt()"
        [attr.loading]="priority() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : 'auto'"
        [attr.width]="width()"
        [attr.height]="height()"
        (error)="failedSource.set(source)"
      />
    } @else {
      <span class="fallback" role="img" [attr.aria-label]="alt()"><sp-icon name="home" /></span>
    }
  </div>`,
  styles: [
    `div{display:grid;place-items:center;background:#e7eeec;overflow:hidden}img{width:100%;height:100%;object-fit:cover}.fallback{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#e7eeec,#f8fbfa)}sp-icon{font-size:2rem;color:var(--slate)}`,
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
  displaySrc = computed(() => {
    const source = this.optimizedSource(this.src());
    return source && source !== this.failedSource() ? source : null;
  });

  private optimizedSource(source: string | null | undefined) {
    if (!source || !source.includes('res.cloudinary.com') || !source.includes('/image/upload/')) {
      return source || null;
    }
    if (/\/image\/upload\/[^/]*f_auto/.test(source)) return source;
    return source.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${this.width()},c_fill/`);
  }
}

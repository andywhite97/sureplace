import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostBinding,
  Input,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';

@Directive({
  selector: '[spRevealOnScroll]',
  standalone: true,
})
export class RevealOnScrollDirective implements OnInit {
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private observer: IntersectionObserver | null = null;

  @Input() revealDelay = '';

  @HostBinding('class.motion-reveal') readonly revealClass = true;
  @HostBinding('class.is-visible') visible = false;
  @HostBinding('style.--reveal-delay') get delay() {
    return this.revealDelay || '0ms';
  }

  ngOnInit() {
    if (this.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      this.visible = true;
      this.cdr.markForCheck();
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          this.observer?.disconnect();
          this.observer = null;
          this.zone.run(() => {
            this.visible = true;
            this.cdr.markForCheck();
          });
        },
        { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
      );
      this.observer.observe(this.element.nativeElement);
    });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );
  }
}

import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { MobileIntroService } from '../../core/services/mobile-intro.service';
import { SuriGuideComponent, SuriPose } from '../../shared/ui/suri-guide.component';

@Component({
  selector: 'sp-mobile-intro',
  standalone: true,
  imports: [SuriGuideComponent],
  template: `<main
    class="tour-page"
    aria-label="Welcome to SurePlace"
    (keydown)="onKey($event)"
    (touchstart)="touchStart($event)"
    (touchend)="touchEnd($event)"
  >
    <header class="tour-header">
      <img src="/logo_dark.png" alt="SurePlace" width="420" height="140" /><button
        type="button"
        (click)="intro.finish()"
        aria-label="Skip introduction"
      >
        Skip
      </button>
    </header>
    <div class="tour-body">
      @for (slide of [current()]; track slide.title) {
        <div class="tour-slide">
          <div class="tour-visual" aria-hidden="true">
            <sp-suri-guide variant="illustration" [pose]="slide.pose" /><span class="tour-icon"
              ><i [class]="slide.icon"></i
            ></span>
          </div>
          <div class="tour-story">
            <p class="tour-eyebrow">{{ slide.eyebrow }}</p>
            <h1 #heading tabindex="-1">{{ slide.title }}</h1>
            <p class="tour-description">{{ slide.description }}</p>
            <sp-suri-guide variant="tip" [message]="slide.note" />
          </div>
        </div>
      }
    </div>
    <footer class="tour-footer">
      <div class="tour-progress" aria-label="Introduction progress">
        @for (slide of slides; track slide.title; let i = $index) {
          <span [class.active]="intro.step() === i" aria-hidden="true"></span>
        }
        <span class="tour-step" aria-live="polite"
          >Step {{ intro.step() + 1 }} of {{ slides.length }}</span
        >
      </div>
      <div class="tour-actions">
        @if (intro.step() > 0) {
          <button class="tour-back" type="button" (click)="intro.back()">Back</button>
        }
        <button class="tour-next" type="button" (click)="next()">
          {{ last() ? 'Explore SurePlace' : 'Next' }}
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
      <p class="tour-footnote">Explore first. Sign in when you’re ready.</p>
    </footer>
  </main>`,
  styleUrl: './mobile-intro.component.scss',
})
export class MobileIntroComponent {
  readonly intro = inject(MobileIntroService);
  readonly heading = viewChild<ElementRef<HTMLHeadingElement>>('heading');
  readonly slides: {
    eyebrow: string;
    title: string;
    description: string;
    note: string;
    icon: string;
    pose: SuriPose;
  }[] = [
    {
      eyebrow: 'Discover properties',
      title: 'Your next place starts here.',
      description: 'Explore homes, land and commercial spaces for rent or sale across Eswatini.',
      note: 'Finding your next place starts with a simple search.',
      pose: 'search',
      icon: 'fa-solid fa-house',
    },
    {
      eyebrow: 'Explore stays',
      title: 'Find your perfect stay.',
      description:
        'Explore guesthouses, lodges and hotels. Compare rooms, check availability and request bookings.',
      note: 'Planning a getaway? Your next stay could be just a few taps away.',
      pose: 'welcome',
      icon: 'fa-solid fa-bed',
    },
    {
      eyebrow: 'Save & connect',
      title: 'Save places you love.',
      description: 'Keep your favourites, contact owners or agents and arrange property viewings.',
      note: 'Found something interesting? Save it and connect when you’re ready.',
      pose: 'favourite',
      icon: 'fa-solid fa-heart',
    },
    {
      eyebrow: 'List with SurePlace',
      title: 'Your property belongs here, too.',
      description:
        'Owners, agents and hospitality operators can reach potential customers and manage their listings.',
      note: 'Have a place to share? SurePlace can help people discover it.',
      pose: 'home',
      icon: 'fa-solid fa-key',
    },
  ];
  readonly current = computed(() => this.slides[this.intro.step()]);
  readonly last = computed(() => this.intro.step() === this.slides.length - 1);
  private start: { x: number; y: number } | null = null;
  constructor() {
    afterRenderEffect(() => {
      this.intro.step();
      this.heading()?.nativeElement.focus({ preventScroll: true });
    });
  }
  next() {
    if (this.last()) this.intro.finish();
    else this.intro.step.update((step) => step + 1);
  }
  onKey(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (!this.last()) this.next();
    }
    if (event.key === 'ArrowLeft' && this.intro.step() > 0) {
      event.preventDefault();
      this.intro.back();
    }
  }
  touchStart(event: TouchEvent) {
    const t = event.changedTouches[0];
    this.start = t ? { x: t.clientX, y: t.clientY } : null;
  }
  touchEnd(event: TouchEvent) {
    const t = event.changedTouches[0],
      start = this.start;
    this.start = null;
    if (!t || !start) return;
    const dx = t.clientX - start.x,
      dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && !this.last()) this.next();
    else if (dx > 0 && this.intro.step() > 0) this.intro.back();
  }
}

import { Component, computed, input } from '@angular/core';

export type SuriPose = 'welcome' | 'search' | 'favourite' | 'support' | 'home';
// Pixel bounds select only the official illustration, excluding captions in the brand sheet.
const POSES: Record<SuriPose, [number, number, number, number]> = {
  welcome: [478, 242, 178, 188],
  search: [685, 242, 183, 188],
  favourite: [478, 535, 178, 191],
  support: [586, 828, 171, 181],
  home: [767, 830, 145, 180],
};
@Component({
  selector: 'sp-suri-guide',
  standalone: true,
  template: `<div
    class="suri-guide"
    [class.artwork]="variant() === 'illustration'"
    [class.tip]="variant() === 'tip'"
    [class.small]="size() === 'small'"
  >
    <span
      class="suri-art"
      [style.aspect-ratio]="bounds()[2] + '/' + bounds()[3]"
      aria-hidden="true"
    >
      <img
        src="/suri-brand-reference.png"
        alt=""
        width="1122"
        height="1400"
        [style.width.%]="(1122 / bounds()[2]) * 100"
        [style.left.%]="(-bounds()[0] / bounds()[2]) * 100"
        [style.top.%]="(-bounds()[1] / bounds()[3]) * 100"
      />
    </span>
    @if (variant() !== 'illustration') {
      <div class="suri-copy">
        <span class="suri-name">{{
          variant() === 'tip' ? 'Suri says' : 'Suri · Your SurePlace guide'
        }}</span>
        <p>{{ message() }}</p>
      </div>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        margin: 0 0 1rem;
      }
      .suri-guide {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        color: var(--midnight);
        padding: 0.65rem 0.75rem;
        background: var(--ux-tint, #edf8f3);
        border-radius: 14px;
      }
      .suri-art {
        position: relative;
        display: block;
        width: 54px;
        flex: 0 0 54px;
        overflow: hidden;
        border-radius: 16px;
        background: white;
        isolation: isolate;
      }
      .suri-art img {
        position: absolute;
        display: block;
        max-width: none;
        height: auto;
        pointer-events: none;
      }
      .suri-copy {
        min-width: 0;
      }
      .suri-name {
        display: block;
        font-size: 0.66rem;
        font-weight: 650;
        line-height: 1.4;
        color: var(--ux-muted, #506861);
      }
      p {
        font-size: 0.82rem;
        line-height: 1.45;
        margin: 0.15rem 0 0;
        overflow-wrap: anywhere;
      }
      .small {
        padding: 0.5rem 0.65rem;
      }
      .small .suri-art {
        width: 40px;
        flex-basis: 40px;
      }
      .small p {
        font-size: 0.78rem;
      }
      .artwork {
        justify-content: center;
        background: transparent;
        padding: 0;
      }
      .artwork .suri-art {
        width: 100%;
        max-width: 220px;
        flex: 0 1 220px;
        border-radius: 30%;
      }
      .tip {
        background: transparent;
        padding: 0.5rem 0;
      }
      .tip .suri-art {
        display: none;
      }
      .tip p {
        font-size: 0.8rem;
      }
      .tip .suri-name {
        color: var(--ux-primary, #007e6c);
      }
    `,
  ],
})
export class SuriGuideComponent {
  pose = input<SuriPose>('welcome');
  variant = input<'inline' | 'support' | 'illustration' | 'tip'>('inline');
  size = input<'small' | 'medium'>('medium');
  message = input('Hi, I’m Suri. Let’s find your SurePlace.');
  bounds = computed(() => POSES[this.pose()]);
}

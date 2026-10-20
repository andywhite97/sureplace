import { Component, input } from '@angular/core';

/** Decorative poses from the existing brand sheet; accompanying text introduces Suri. */
@Component({
  selector: 'sp-suri-guide',
  standalone: true,
  template: `<div class="greeting">
    <span class="portrait" [class.support]="pose() === 'support'" aria-hidden="true"></span>
    <div class="copy"><span class="name">Suri · Your SurePlace guide</span><p>{{ message() }}</p></div>
  </div>`,
  styles: [`
    :host { display:block; margin:0 0 1rem; max-width:100%; }
    .greeting { display:flex; align-items:center; gap:.75rem; padding:.65rem .85rem;
      border:1px solid #d5ebe5; border-radius:18px; background:#f2faf7; color:#153b38; }
    .portrait { display:block; flex:0 0 62px; width:62px; aspect-ratio:180/195;
      background-image:url('/suri-brand-reference.png'); background-repeat:no-repeat;
      background-size:623.333% 717.949%; background-position:50.425% 19.917%;
      border-radius:12px; }
    .portrait.support { aspect-ratio:175/195; background-size:641.143% 717.949%;
      background-position:61.774% 68.05%; }
    .copy { min-width:0; }
    .name { display:block; font-size:.7rem; font-weight:650; color:#446c63; line-height:1.4; }
    p { margin:.2rem 0 0; font-size:.88rem; font-weight:550; line-height:1.45; overflow-wrap:anywhere; }
    @media(max-width:560px) {
      .greeting { gap:.6rem; padding:.5rem .65rem; border-radius:14px; }
      .portrait { flex-basis:48px; width:48px; }
      p { font-size:.8rem; }
      .name { font-size:.65rem; }
    }
  `],
})
export class SuriGuideComponent {
  pose = input<'welcome' | 'support'>('welcome');
  message = input("Hi, I’m Suri. Let’s find your SurePlace.");
}

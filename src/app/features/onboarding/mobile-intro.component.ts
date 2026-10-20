import { Component, computed, inject } from '@angular/core';
import { MobileIntroService } from '../../core/services/mobile-intro.service';

@Component({
  selector: 'sp-mobile-intro',
  standalone: true,
  template: `<main class="intro" aria-label="Welcome to SurePlace">
    <header><span class="brand">Sure<span>Place</span></span>
      <button type="button" (click)="intro.finish()" aria-label="Skip introduction">Skip</button>
    </header>
    <div class="body">
      <div class="illustration" aria-hidden="true">
        <div class="halo"></div><div class="suri"></div>
        <span class="feature-icon"><i [class]="current().icon"></i></span>
      </div>
      <div class="story" aria-live="polite" aria-atomic="true">
        <p class="eyebrow">{{ current().eyebrow }}</p>
        <h1>{{ current().title }}</h1>
        <p class="description">{{ current().description }}</p>
        <p class="suri-note"><span>Suri says</span> {{ current().note }}</p>
      </div>
    </div>
    <footer>
      <div class="progress" aria-label="Introduction progress">
        @for (slide of slides; track slide.title; let i = $index) {
          <span [class.active]="intro.step() === i" aria-hidden="true"></span>
        }
        <span class="step-label">Step {{ intro.step() + 1 }} of {{ slides.length }}</span>
      </div>
      <div class="actions">
        @if (intro.step() > 0) {<button class="back" type="button" (click)="intro.back()">Back</button>}
        <button class="next" type="button" (click)="next()">{{ last() ? 'Explore SurePlace' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>
      <p class="footnote">Explore first. Sign in when you’re ready.</p>
    </footer>
  </main>`,
  styles: [`
    :host{display:block;background:#f6faf8;color:#123c38}
    .intro{box-sizing:border-box;min-height:100dvh;max-width:680px;margin:auto;
      padding:max(1rem,env(safe-area-inset-top)) max(1.25rem,env(safe-area-inset-right)) max(1rem,env(safe-area-inset-bottom)) max(1.25rem,env(safe-area-inset-left));
      display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 28%,#e0f6ef 0,transparent 60%)}
    header{display:flex;align-items:center;justify-content:space-between;gap:1rem}
    .brand{font-size:1.3rem;font-weight:850;letter-spacing:-.04em}.brand>span{color:#009d8c}
    button{font:inherit;cursor:pointer;min-height:44px;border:0;border-radius:14px;padding:.7rem 1rem}
    header button,.back{background:transparent;color:#39665e}
    button:focus-visible{outline:3px solid #00695c;outline-offset:4px}
    .body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:1rem 0}
    .illustration{position:relative;width:190px;height:220px;margin:0 auto .5rem}
    .halo{position:absolute;inset:30px -25px 0;border-radius:50%;background:#d3f1e7}
    .suri{position:relative;width:180px;height:210px;margin:auto;background:url('/suri-brand-reference.png') no-repeat;
      background-size:623.333% 666.667%;background-position:50.425% 20.168%;border-radius:40%}
    .feature-icon{position:absolute;bottom:12px;right:-8px;background:white;box-shadow:0 8px 24px #174f3920;
      border:1px solid #cce9df;border-radius:20px;width:54px;height:54px;display:grid;place-items:center;font-size:1.4rem;color:#008878}
    .story{text-align:center;max-width:440px;margin:auto;animation:arrive .25s ease-out}
    .eyebrow{font-size:.7rem;font-weight:750;letter-spacing:.14em;text-transform:uppercase;color:#07816f;margin:.7rem 0}
    h1{font-size:clamp(1.65rem,7vw,2.25rem);line-height:1.13;letter-spacing:-.04em;margin:0 0 .9rem;text-wrap:balance}
    .description{font-size:.95rem;line-height:1.6;color:#486961;margin:0}
    .suri-note{font-size:.82rem;line-height:1.5;background:#fff;border:1px solid #dcece5;border-radius:14px;padding:.75rem;margin:1rem 0}
    .suri-note>span{display:block;font-weight:750;color:#007a6c;margin-bottom:.2rem}
    footer{padding-top:.5rem}.progress{display:flex;justify-content:center;align-items:center;gap:.4rem;margin-bottom:1rem}
    .progress>span:not(.step-label){width:7px;height:7px;background:#bdd7ce;border-radius:10px}
    .progress>span.active{width:22px;background:#009b87}.step-label{margin-left:.4rem;font-size:.72rem;color:#527269}
    .actions{display:flex;gap:.75rem}.next{flex:1;background:#008f7c;color:white;font-weight:700;display:flex;align-items:center;justify-content:center;gap:1rem;min-height:52px}
    .footnote{text-align:center;color:#58776e;font-size:.72rem;margin:.75rem 0 0}
    @media(max-height:700px){.illustration{width:130px;height:145px}.suri{width:120px;height:140px}.feature-icon{width:40px;height:40px;font-size:1rem}.body{padding:.5rem 0}.suri-note{margin:.6rem 0}}
    @media(min-width:700px) and (orientation:landscape){.body{flex-direction:row;gap:2rem}.illustration{flex-shrink:0}.story{text-align:left}}
    @keyframes arrive{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){.story{animation:none}}
  `],
})
export class MobileIntroComponent {
  readonly intro = inject(MobileIntroService);
  readonly slides = [
    { eyebrow: 'Welcome to SurePlace', title: 'Your next place starts here.',
      description: 'Discover homes, land and commercial property to rent or buy across Eswatini. Search by location and explore the details that matter to you.',
      note: 'Hi, I’m Suri — your friendly SurePlace guide.', icon: 'fa-solid fa-house' },
    { eyebrow: 'Stays & getaways', title: 'A stay for every kind of trip.',
      description: 'Explore guest houses, lodges and hotels. Compare rooms, check your dates and request a booking from the stay’s page.',
      note: 'A weekend away or a longer visit? Start with Stays.', icon: 'fa-solid fa-bed' },
    { eyebrow: 'Save & connect', title: 'Keep your favourites close.',
      description: 'Sign in to save places, message owners or agents, and request property viewings. Keep your conversations and plans together.',
      note: 'Take your time, ask questions and confirm the details.', icon: 'fa-solid fa-heart' },
    { eyebrow: 'List & manage', title: 'Your place belongs here, too.',
      description: 'Owners, agents and hospitality operators can create listings and manage enquiries or booking requests. Complete the review steps before going live.',
      note: 'Need a hand? You’ll find practical guidance in the Help Centre.', icon: 'fa-solid fa-key' },
  ];
  readonly current = computed(() => this.slides[this.intro.step()]);
  readonly last = computed(() => this.intro.step() === this.slides.length - 1);
  next() {
    if (this.last()) this.intro.finish();
    else this.intro.step.update(step => step + 1);
  }
}

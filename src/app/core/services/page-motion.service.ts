import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Router, ViewTransitionInfo } from '@angular/router';
import { Capacitor } from '@capacitor/core';

const tabs = new Set(['/', '/properties', '/stays', '/account', '/account/saved', '/account/messages']);
const pathOf = (url: string) => url.split(/[?#]/)[0].replace(/\/$/, '') || '/';
const depth = (path: string) => path.split('/').filter(Boolean).length;

@Injectable({ providedIn: 'root' })
export class PageMotionService {
  private document = inject(DOCUMENT);
  private router = inject(Router);
  private active?: ViewTransition;

  created({ transition }: ViewTransitionInfo) {
    const browser = this.document.defaultView;
    const navigation = this.router.currentNavigation();
    const from = pathOf(this.router.url);
    const to = navigation?.finalUrl ? pathOf(this.router.serializeUrl(navigation.finalUrl)) : from;
    if (!browser || browser.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to ||
        (!Capacitor.isNativePlatform() && !browser.matchMedia('(max-width: 767px)').matches)) {
      transition.skipTransition();
      return;
    }

    // Tab destinations are peers; detail screens use a small directional slide.
    const motion = tabs.has(from) && tabs.has(to) ? 'tab' :
      navigation?.trigger === 'popstate' || depth(to) < depth(from) ? 'back' : 'forward';
    this.active = transition;
    this.document.documentElement.setAttribute('data-page-motion', motion);
    const clean = () => {
      if (this.active !== transition) return;
      this.document.documentElement.removeAttribute('data-page-motion');
      this.active = undefined;
    };
    void transition.finished.then(clean, clean);
  }
}

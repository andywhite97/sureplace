import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export const MOBILE_INTRO_NATIVE = new InjectionToken<boolean>('Mobile intro platform', {
  providedIn: 'root', factory: () => Capacitor.isNativePlatform(),
});
export const MOBILE_INTRO_KEY = 'sureplace.mobile-intro.v1';

@Injectable({ providedIn: 'root' })
export class MobileIntroService {
  readonly native = inject(MOBILE_INTRO_NATIVE);
  private document = inject(DOCUMENT);
  readonly visible = signal(this.shouldShow());
  readonly step = signal(0);

  private shouldShow() {
    if (!this.native || !this.document.defaultView) return false;
    try { return this.document.defaultView.localStorage.getItem(MOBILE_INTRO_KEY) !== 'complete'; }
    catch { return true; }
  }
  finish() {
    try { this.document.defaultView?.localStorage.setItem(MOBILE_INTRO_KEY, 'complete'); }
    catch { /* Storage restrictions must never block entry to the app. */ }
    this.visible.set(false);
    this.step.set(0);
  }
  replay() {
    if (!this.native) return;
    this.step.set(0);
    this.visible.set(true);
  }
  back() {
    if (!this.visible()) return false;
    if (this.step() > 0) this.step.update(value => value - 1);
    else this.finish();
    return true;
  }
}

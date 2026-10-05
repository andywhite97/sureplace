import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

@Injectable({ providedIn: 'root' })
export class NativeAppService {
  private document = inject(DOCUMENT);
  private router = inject(Router);
  private started = false;
  private keyboardOpen = false;

  async start() {
    if (this.started || !Capacitor.isNativePlatform()) return;
    this.started = true;
    this.document.documentElement.classList.add('native-app');
    await Keyboard.addListener('keyboardDidShow', () => { this.keyboardOpen = true; });
    await Keyboard.addListener('keyboardDidHide', () => { this.keyboardOpen = false; });
    await App.addListener('backButton', ({ canGoBack }) => {
      if (this.keyboardOpen) { void Keyboard.hide(); return; }
      // Dismiss foreground overlays before leaving their underlying screen.
      const close = this.document.querySelector<HTMLButtonElement>(
        '.lightbox button[aria-label="Close photos"], .sheet-backdrop button[aria-label="Close filters"], [role="dialog"] button[aria-label^="Close"]',
      );
      if (close) { close.click(); return; }
      if (canGoBack) this.document.defaultView?.history.back();
      else if (this.router.url !== '/') void this.router.navigateByUrl('/');
      else void App.minimizeApp();
    });
  }
}

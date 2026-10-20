import { MobileIntroService } from './mobile-intro.service';
import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { Browser } from '@capacitor/browser';
import { environment } from '../../../environments/environment';
import { AppStateService } from './app-state.service';
import { nativeLinkRoute } from './native-links';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class NativeAppService {
  private intro = inject(MobileIntroService);
  private document = inject(DOCUMENT);
  private router = inject(Router);
  private state = inject(AppStateService);
  private zone = inject(NgZone);
  private destroy = inject(DestroyRef);
  private auth = inject(AuthService);
  private started = false;
  private keyboardOpen = false;
  private handles: PluginListenerHandle[] = [];
  readonly error = signal('');

  async start() {
    if (this.started || !Capacitor.isNativePlatform()) return;
    this.started = true;
    this.document.documentElement.classList.add('native-app');
    const open = (url: string) => {
      const route = nativeLinkRoute(url, environment.frontendOrigin);
      if (route) this.zone.run(() => void this.router.navigateByUrl(route));
    };
    const refresh = () => {
      if (this.state.active() && this.state.online()) {
        this.auth.restore().subscribe((user) => {
          if (user && this.router.url.split('?')[0] === '/login') void this.router.navigateByUrl('/account');
        });
        this.document.defaultView?.dispatchEvent(new Event('online'));
        this.document.dispatchEvent(new Event('visibilitychange'));
      }
    };
    const track = async (handle: Promise<PluginListenerHandle>) => { this.handles.push(await handle); };
    const setup = await Promise.allSettled([
      track(Keyboard.addListener('keyboardDidShow', () => { this.keyboardOpen = true; })),
      track(Keyboard.addListener('keyboardDidHide', () => { this.keyboardOpen = false; })),
      track(Network.addListener('networkStatusChange', ({ connected }) => this.zone.run(() => {
        const reconnected = connected && !this.state.online();
        this.state.online.set(connected);
        if (reconnected) refresh();
      }))),
      Network.getStatus().then(({ connected }) => this.zone.run(() => this.state.online.set(connected))),
      track(App.addListener('appStateChange', ({ isActive }) => this.zone.run(() => {
        this.state.active.set(isActive);
        if (isActive) refresh();
      }))),
      App.getState().then(({ isActive }) => this.zone.run(() => this.state.active.set(isActive))),
      track(App.addListener('appUrlOpen', ({ url }) => open(url))),
      App.getLaunchUrl().then((launch) => { if (launch?.url) open(launch.url); }),
      track(App.addListener('backButton', ({ canGoBack }) => {
      if (this.intro.back()) return;
      if (this.keyboardOpen) { void Keyboard.hide(); return; }
      // Dismiss foreground overlays before leaving their underlying screen.
      const close = this.document.querySelector<HTMLButtonElement>(
        '.lightbox button[aria-label="Close photos"], .sheet-backdrop button[aria-label="Close filters"], [role="dialog"] button[aria-label^="Close"]',
      );
      if (close) { close.click(); return; }
      if (canGoBack) this.document.defaultView?.history.back();
      else if (this.router.url !== '/') void this.router.navigateByUrl('/');
      else void App.minimizeApp();
      })),
    ]);
    if (setup.some((result) => result.status === 'rejected')) {
      this.zone.run(() => this.error.set('Some device features could not start. Close and reopen SurePlace to retry.'));
    }
    const externalLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!target || target.hasAttribute('download')) return;
      const url = new URL(target.href, this.document.baseURI);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin === this.document.location.origin) return;
      event.preventDefault();
      void Browser.open({ url: url.href }).catch(() => this.zone.run(() => this.error.set('Could not open this link. Please try again.')));
    };
    this.document.addEventListener('click', externalLink);
    this.destroy.onDestroy(() => {
      this.document.removeEventListener('click', externalLink);
      for (const handle of this.handles) void handle.remove();
    });
  }
}

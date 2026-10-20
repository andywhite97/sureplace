import { MobileIntroService } from './core/services/mobile-intro.service';
import { MobileIntroComponent } from './features/onboarding/mobile-intro.component';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { AccountActivityStore } from './core/services/account-activity.store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PublicHeaderComponent } from './layout/public-header.component';
import { FooterComponent } from './layout/footer.component';
import { MobileNavigationComponent } from './layout/mobile-navigation.component';
import { ToastRegionComponent } from './layout/toast-region.component';
import { CookieConsentComponent } from './layout/cookie-consent.component';
import { BackendKeepAliveService } from './core/services/backend-keep-alive.service';
import { Capacitor } from '@capacitor/core';
import { NativeAppService } from './core/services/native-app.service';
import { AppStateService } from './core/services/app-state.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MobileIntroComponent,
    RouterOutlet,
    PublicHeaderComponent,
    FooterComponent,
    MobileNavigationComponent,
    ToastRegionComponent,
    CookieConsentComponent,
  ],
  template: `@if (intro.visible()) {<sp-mobile-intro />}
    <div [hidden]="intro.visible()" [attr.inert]="intro.visible() ? '' : null">
    @if (!privatePreview()) {<sp-header [staffWorkspace]="staffWorkspace()" />}
    @if (nativeApp && (!state.online() || native.error())) {
      <aside class="connection-status" role="status">{{ !state.online() ? 'You are offline. Reconnect to load listings and send messages.' : native.error() }}</aside>
    }
    <div class="route-viewport"><router-outlet /></div>
    @if (!staffWorkspace() && !privatePreview()) {
      @if (!nativeApp) {
        <sp-footer />
      }
      <sp-mobile-nav />
    }
    <sp-toast-region /><sp-cookie-consent /></div>`,
})
export class App {
  readonly intro = inject(MobileIntroService);
  readonly nativeApp = Capacitor.isNativePlatform();
  private router = inject(Router);
  private keepAlive = inject(BackendKeepAliveService);
  readonly native = inject(NativeAppService);
  readonly state = inject(AppStateService);
  private activity = inject(AccountActivityStore);
  private url = signal(this.router.url);
  privatePreview = computed(() => /^\/private-preview(?:[?#]|$)/.test(this.url()));
  staffWorkspace = computed(() => /^\/staff(?:\/|[?#]|$)/.test(this.url()));
  constructor() {
    afterNextRender(() => this.activity.startGlobalUpdates());
    afterNextRender(() => void this.native.start());
    this.keepAlive.start();
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.url.set(event.urlAfterRedirects);
    });
  }
}

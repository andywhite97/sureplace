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
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    PublicHeaderComponent,
    FooterComponent,
    MobileNavigationComponent,
    ToastRegionComponent,
    CookieConsentComponent,
  ],
  template: `<sp-header [staffWorkspace]="staffWorkspace()" />
    <div class="route-viewport"><router-outlet /></div>
    @if (!staffWorkspace()) {
      @if (!nativeApp) {
        <sp-footer />
      }
      <sp-mobile-nav />
    }
    <sp-toast-region /><sp-cookie-consent />`,
})
export class App {
  readonly nativeApp = Capacitor.isNativePlatform();
  private router = inject(Router);
  private keepAlive = inject(BackendKeepAliveService);
  private native = inject(NativeAppService);
  private activity = inject(AccountActivityStore);
  private url = signal(this.router.url);
  staffWorkspace = computed(() => /^\/staff(?:\/|[?#]|$)/.test(this.url()));
  constructor() {
    afterNextRender(() => this.activity.startGlobalUpdates());
    void this.native.start();
    this.keepAlive.start();
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.url.set(event.urlAfterRedirects);
    });
  }
}

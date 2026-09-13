import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PublicHeaderComponent } from './layout/public-header.component';
import { FooterComponent } from './layout/footer.component';
import { MobileNavigationComponent } from './layout/mobile-navigation.component';
import { ToastRegionComponent } from './layout/toast-region.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    PublicHeaderComponent,
    FooterComponent,
    MobileNavigationComponent,
    ToastRegionComponent,
  ],
  template: `<sp-header [staffWorkspace]="staffWorkspace()" /><router-outlet />
    @if (!staffWorkspace()) {
      <sp-footer /><sp-mobile-nav />
    }
    <sp-toast-region />`,
})
export class App {
  private router = inject(Router);
  private url = signal(this.router.url);
  staffWorkspace = computed(() => /^\/staff(?:\/|[?#]|$)/.test(this.url()));
  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.url.set(event.urlAfterRedirects);
    });
  }
}

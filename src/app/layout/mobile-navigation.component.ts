import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { ConfigApiService } from '../core/api/config-api.service';
import { AuthService } from '../core/auth/auth.service';
import { AccountActivityStore } from '../core/services/account-activity.store';

@Component({
  selector: 'sp-mobile-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `@if(auth.isAuthenticated() && !hidden()){
    <nav aria-label="Mobile bottom navigation">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}"><span aria-hidden="true">&#8962;</span><small>Explore</small></a>
      <a routerLink="/account/saved" routerLinkActive="active"><span aria-hidden="true">&#9825;</span><small>Saved</small></a>
      @if(config.config().features.internal_messaging){<a routerLink="/account/messages" routerLinkActive="active"><span aria-hidden="true">&#9993;</span>@if(messagesBadge()){<b>{{messagesBadge()}}</b>}<small>Messages</small></a>}
      <a routerLink="/account" routerLinkActive="active"><span aria-hidden="true">&#9675;</span><small>Account</small></a>
    </nav>
  }`,
  styles: [
    `nav{display:none}@media(max-width:700px){nav{position:fixed;z-index:30;bottom:0;left:0;right:0;display:flex;justify-content:space-around;background:white;border-top:1px solid var(--line);padding:.5rem env(safe-area-inset-right) calc(.5rem + env(safe-area-inset-bottom)) env(safe-area-inset-left)}a{position:relative;display:grid;min-width:4rem;min-height:44px;justify-items:center;align-content:center;gap:.1rem;color:var(--slate);text-decoration:none;font-size:1.1rem}small{font-size:.68rem}.active{color:var(--teal);font-weight:800}b{position:absolute;top:.2rem;right:.9rem;min-width:1.25rem;text-align:center;border-radius:999px;background:var(--teal);color:#fff;font-size:.65rem;padding:.1rem .3rem}}`,
  ],
})
export class MobileNavigationComponent {
  auth = inject(AuthService);
  config = inject(ConfigApiService);
  private router = inject(Router);
  private activity = inject(AccountActivityStore);
  currentUrl = signal(this.router.url);
  hidden = computed(() => /^\/account\/messages\/[^/]+/.test(this.currentUrl()) || /^\/account\/manage\/(properties|stays)\/.+/.test(this.currentUrl()));
  messagesBadge = computed(() => {
    const value = this.activity.unreadMessages();
    return value > 99 ? '99+' : value ? String(value) : '';
  });
  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }
}

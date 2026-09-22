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
  template: `@if(visible()){
    <nav aria-label="Mobile bottom navigation">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}"><i class="fa-solid fa-house" aria-hidden="true"></i><small>Home</small></a>
      <a routerLink="/properties" routerLinkActive="active"><i class="fa-solid fa-compass" aria-hidden="true"></i><small>Explore</small></a>
      <a [routerLink]="auth.isAuthenticated() ? '/account/saved' : '/login'" routerLinkActive="active"><i class="fa-regular fa-heart" aria-hidden="true"></i><small>Saved</small></a>
      @if(config.config().features.internal_messaging){<a [routerLink]="auth.isAuthenticated() ? '/account/messages' : '/login'" routerLinkActive="active"><i class="fa-regular fa-message" aria-hidden="true"></i>@if(auth.isAuthenticated() && messagesBadge()){<b>{{messagesBadge()}}</b>}<small>{{ auth.isAuthenticated() ? 'Messages' : 'Sign in' }}</small></a>}
      <a [routerLink]="auth.isAuthenticated() ? '/account' : registrationRoute()" routerLinkActive="active" class="account-link">@if(auth.isAuthenticated() && auth.user()?.avatar){<img [src]="auth.user()?.avatar" alt="" />}@else if(auth.isAuthenticated()) {<span class="profile-initials" aria-hidden="true">{{ profileInitials() }}</span>}@else {<i class="fa-solid fa-user-plus" aria-hidden="true"></i>}<small>{{ auth.isAuthenticated() ? 'Account' : 'Join' }}</small></a>
    </nav>
  }`,
  styles: [
    `nav{display:none}@media(max-width:700px){nav{position:fixed;z-index:30;bottom:0;left:0;right:0;display:flex;justify-content:space-around;background:#fff;border-top:1px solid var(--line);padding:.45rem env(safe-area-inset-right) calc(.45rem + env(safe-area-inset-bottom)) env(safe-area-inset-left);box-shadow:0 -8px 24px rgba(21,43,42,.07)}a{position:relative;display:grid;flex:1;min-width:0;min-height:48px;justify-items:center;align-content:center;gap:.18rem;color:var(--slate);text-decoration:none;font-size:1rem}a>i,.profile-initials,a>img{width:34px;height:30px;display:grid;place-items:center;border-radius:.7rem;font-style:normal}a>img{width:30px;height:30px;border-radius:50%;object-fit:cover}.profile-initials{width:30px;height:30px;border-radius:50%;background:var(--mist);color:var(--teal);font-size:.68rem;font-weight:850}.active{color:var(--teal);font-weight:800}.active>i{background:color-mix(in srgb,var(--teal) 12%,white)}small{font-size:.68rem}b{position:absolute;top:.05rem;right:.85rem;min-width:1.2rem;text-align:center;border:2px solid #fff;border-radius:999px;background:var(--teal);color:#fff;font-size:.62rem;padding:.06rem .25rem}}`,
  ],
})
export class MobileNavigationComponent {
  auth = inject(AuthService);
  config = inject(ConfigApiService);
  private router = inject(Router);
  private activity = inject(AccountActivityStore);
  currentUrl = signal(this.router.url);
  hidden = computed(() => /^\/account\/messages\/[^/]+/.test(this.currentUrl()) || /^\/account\/manage\/(properties|stays)\/.+/.test(this.currentUrl()) || /^\/(login|register|forgot-password|reset-password|verify-email)(?:\/|[?#]|$)/.test(this.currentUrl()));
  visible = computed(() => this.auth.status() !== 'initializing' && !this.hidden());
  profileInitials = computed(() => [this.auth.user()?.first_name, this.auth.user()?.last_name].filter(Boolean).map((name) => name![0]).join('').slice(0, 2) || 'SP');
  registrationRoute = computed(() => this.config.config().features.registration ? '/register' : '/login');
  messagesBadge = computed(() => {
    const value = this.activity.unreadMessages();
    return value > 99 ? '99+' : value ? String(value) : '';
  });
  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }
}

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Params, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import {
  accountNavigation,
  mobileAccountNavigation,
  mobileRouteSection,
  navigationActive,
  unreadBadgeLabel,
  MobileSectionId,
} from '../core/services/account-navigation.config';
import { AgencyNavigationService } from '../core/services/agency-navigation.service';
import { ConfigApiService } from '../core/api/config-api.service';
import { AuthService } from '../core/auth/auth.service';
import { AccountActivityStore } from '../core/services/account-activity.store';
import { UserCapabilityService } from '../core/services/user-capability.service';
import { ListingEntryService } from '../core/services/listing-entry.service';
import { ProfileImageComponent } from '../shared/ui/profile-image.component';

type NavItem = {
  label: string;
  commands: string | unknown[];
  queryParams?: Params;
  feature?: 'stays' | 'bookings' | 'internal_messaging' | 'registration';
  badge?: 'messages' | 'notifications';
  action?: 'logout';
  icon?: string;
  exact?: boolean;
  activePaths?: string[];
  cta?: 'primary' | 'secondary';
};
type SectionId = MobileSectionId;
type NavSection = { title: string; items: NavItem[]; id?: SectionId; icon?: string };
type MenuState = 'closed' | 'open' | 'closing';

@Component({
  selector: 'sp-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ProfileImageComponent],
  template: `<header [class.staff-header]="staffWorkspace()">
      <a routerLink="/" class="logo" aria-label="SurePlace home" (click)="closeMenu()">
        <img src="/logo_dark.png" alt="SurePlace" width="420" height="140" />
      </a>
      @if (staffWorkspace()) {
        <span class="console-label">Staff Console</span>
        <form class="staff-search" role="search" (submit)="searchStaff($event, staffSearch.value)">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input
            #staffSearch
            type="search"
            aria-label="Search property listings"
            placeholder="Search listings by title, ID or agency"
          />
          <button type="submit" aria-label="Search listings">
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </form>
        <div class="staff-identity">
          <span class="staff-avatar" aria-hidden="true">{{ staffInitials() }}</span
          ><span
            >{{ auth.user()?.first_name || 'Staff'
            }}<small>{{ auth.user()?.is_superuser ? 'Superuser' : 'Staff member' }}</small></span
          >
        </div>
        <a class="exit-console" aria-label="Exit Console" routerLink="/account"
          ><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i
          ><span>Exit Console</span></a
        >
      } @else {
        <nav class="desktop-nav" aria-label="Main navigation">
          <a
            routerLink="/properties"
            routerLinkActive="active"
            [attr.aria-current]="isPropertiesActive() ? 'page' : null"
            >Properties</a
          >
          @if (config.config().features.stays) {
            <a routerLink="/stays" routerLinkActive="active">Stays</a>
          }
          <a routerLink="/agents" routerLinkActive="active">Agents</a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/account/saved" routerLinkActive="active">Saved</a>
            @if (config.config().features.internal_messaging) {
              <a
                class="desktop-messages"
                routerLink="/account/messages"
                routerLinkActive="active"
                [attr.aria-label]="
                  badge('messages') ? badgeLabel('messages', badge('messages')) : 'Messages'
                "
              >
                Messages
                @if (badge('messages')) {
                  <b class="message-badge" aria-hidden="true">{{ badge('messages') }}</b>
                }
              </a>
            }
          }
        </nav>
        <div class="actions">
          @if (auth.isAuthenticated()) {
            <a
              class="notification-link desktop-notification"
              routerLink="/account/notifications"
              routerLinkActive="active"
              [attr.aria-label]="
                badge('notifications')
                  ? badgeLabel('notifications', badge('notifications'))
                  : 'Notifications'
              "
            >
              <svg class="notification-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              @if (badge('notifications')) {
                <b aria-hidden="true">{{ badge('notifications') }}</b>
              }
            </a>
            <div #accountControl class="account-control" (focusout)="accountFocusOut($event)">
              <button
                #accountButton
                class="account-trigger"
                type="button"
                [attr.aria-label]="'Account pages for ' + accountName()"
                aria-controls="account-dropdown"
                [attr.aria-expanded]="accountOpen()"
                (click)="accountOpen.set(!accountOpen())"
              >
                <sp-profile-image
                  [src]="auth.user()?.avatar"
                  [name]="accountName()"
                  aria-hidden="true"
                />
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  [class.expanded]="accountOpen()"
                >
                  <path
                    d="m4 6 4 4 4-4"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              @if (accountOpen()) {
                <div id="account-dropdown" class="account-dropdown">
                  <div class="account-identity">
                    <sp-profile-image
                      [src]="auth.user()?.avatar"
                      [name]="accountName()"
                      aria-hidden="true"
                    />
                    <div>
                      <strong>{{ accountName() }}</strong
                      ><small>{{ auth.user()?.email }}</small>
                    </div>
                  </div>
                  <nav aria-label="Account pages">
                    @for (section of accountDropdownSections(); track section.id) {
                      <section>
                        <h2>{{ section.title }}</h2>
                        @for (item of section.items; track item.commands) {
                          <a
                            [routerLink]="item.commands"
                            [class.current]="isActive(item)"
                            [attr.aria-current]="isActive(item) ? 'page' : null"
                            (click)="closeAccount()"
                          >
                            <i [class]="item.icon" aria-hidden="true"></i
                            ><span>{{ item.label }}</span>
                            @if (badge(item.badge)) {
                              <b [attr.aria-label]="badgeLabel(item.badge, badge(item.badge))">{{
                                badge(item.badge)
                              }}</b>
                            }
                          </a>
                        }
                      </section>
                    }
                  </nav>
                  <div class="account-logout">
                    <button type="button" (click)="logout()">
                      <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>Log out
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else if (auth.status() === 'unauthenticated') {
            <a routerLink="/login">Log in</a>
            @if (config.config().features.registration) {
              <a routerLink="/register">Create account</a>
            }
          }
          @if (auth.status() === 'initializing') {
            <span class="auth-placeholder" role="status" aria-label="Loading account"></span>
          } @else {
            <a class="cta" [routerLink]="primaryCta().commands">{{ primaryCta().label }}</a>
          }
        </div>
        <div class="mobile-shortcuts" aria-label="Quick account actions">
          @if (auth.status() !== 'initializing') {
            <a
              class="notification-link"
              [routerLink]="auth.isAuthenticated() ? '/account/notifications' : '/login'"
              [attr.aria-label]="
                auth.isAuthenticated()
                  ? badge('notifications')
                    ? badgeLabel('notifications', badge('notifications'))
                    : 'Notifications'
                  : 'Sign in to view notifications'
              "
            >
              <svg class="notification-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              @if (auth.isAuthenticated() && badge('notifications')) {
                <b aria-hidden="true">{{ badge('notifications') }}</b>
              }
            </a>
          }
        </div>
      }
      <button
        #menuButton
        class="menu-button"
        type="button"
        aria-label="Open menu"
        aria-controls="mobile-menu"
        [attr.aria-expanded]="menuExpanded()"
        (click)="openMenu()"
      >
        <i class="fa-solid fa-bars" aria-hidden="true"></i>
      </button>
    </header>
    @if (menuRendered()) {
      <div
        class="backdrop"
        [class.is-closing]="menuState() === 'closing'"
        (click)="closeMenu()"
        aria-hidden="true"
      ></div>
      <aside
        #drawer
        id="mobile-menu"
        class="drawer"
        [class.is-closing]="menuState() === 'closing'"
        role="dialog"
        aria-modal="true"
        aria-label="SurePlace navigation"
        tabindex="-1"
        (keydown)="trapFocus($event)"
        (transitionend)="finishClose($event)"
      >
        <div class="drawer-head">
          <a routerLink="/" class="logo" aria-label="SurePlace home" (click)="closeMenu()">
            <img src="/logo_dark.png" alt="SurePlace" width="420" height="140" />
          </a>
          <button class="icon-button" type="button" aria-label="Close menu" (click)="closeMenu()">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          @if (auth.status() === 'initializing') {
            <span class="auth-placeholder" role="status" aria-label="Loading account"></span>
          }
          @for (section of mobileSections(); track section.title) {
            <section>
              @if (section.id) {
                <button
                  type="button"
                  class="accordion-toggle"
                  [class.context-active]="
                    currentSection() === section.id && expandedSection() !== section.id
                  "
                  [attr.aria-expanded]="expandedSection() === section.id"
                  [attr.aria-controls]="'mobile-section-' + section.id"
                  (click)="toggleSection(section.id)"
                >
                  <span><i [class]="section.icon" aria-hidden="true"></i>{{ section.title }}</span>
                  @if (
                    section.id === 'account' &&
                    expandedSection() !== section.id &&
                    badge('notifications')
                  ) {
                    <b [attr.aria-label]="badgeLabel('notifications', badge('notifications'))">{{
                      badge('notifications')
                    }}</b>
                  }
                  <i
                    class="fa-solid fa-chevron-right chevron"
                    [class.expanded]="expandedSection() === section.id"
                    aria-hidden="true"
                  ></i>
                </button>
              } @else if (section.title) {
                <h2>{{ section.title }}</h2>
              }
              <div
                class="section-panel"
                [class.accordion-panel]="!!section.id"
                [class.expanded]="!section.id || expandedSection() === section.id"
                [id]="section.id ? 'mobile-section-' + section.id : null"
                [attr.inert]="section.id && expandedSection() !== section.id ? '' : null"
                [attr.aria-hidden]="section.id && expandedSection() !== section.id ? 'true' : null"
              >
                <div class="section-children">
                  @for (item of visible(section.items); track item.label; let row = $index) {
                    @if (item.action === 'logout') {
                      <button
                        type="button"
                        class="drawer-row logout-row"
                        [style.animation-delay.ms]="drawerRowDelay(row)"
                        (click)="logout()"
                      >
                        <span>
                          <i
                            [class]="item.icon || 'fa-solid fa-right-from-bracket'"
                            aria-hidden="true"
                          ></i>
                          {{ item.label }}
                        </span>
                      </button>
                    } @else {
                      <a
                        class="drawer-row"
                        [routerLink]="item.commands"
                        [queryParams]="item.queryParams"
                        [class.current]="isActive(item)"
                        [class.secondary-cta]="item.cta === 'secondary'"
                        [class.primary-cta]="item.cta === 'primary'"
                        [style.animation-delay.ms]="drawerRowDelay(row)"
                        [attr.aria-current]="isActive(item) ? 'page' : null"
                        (click)="closeMenu()"
                      >
                        <span>
                          <i [class]="item.icon || 'fa-regular fa-circle'" aria-hidden="true"></i>
                          {{ item.label }}
                        </span>
                        @if (badge(item.badge)) {
                          <b [attr.aria-label]="badgeLabel(item.badge, badge(item.badge))">{{
                            badge(item.badge)
                          }}</b>
                        }
                      </a>
                    }
                  }
                </div>
              </div>
            </section>
          }
        </nav>
      </aside>
    }`,
  styles: [
    `
      header {
        height: 72px;
        display: flex;
        align-items: center;
        gap: 2rem;
        padding: 0 max(1.25rem, calc((100vw - 1200px) / 2));
        background: white;
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 80;
      }
      .logo {
        display: flex;
        align-items: center;
        min-height: 44px;
      }
      .logo img {
        display: block;
        width: auto;
        height: 42px;
        max-width: 170px;
        object-fit: contain;
      }
      .desktop-nav,
      .actions {
        display: flex;
        align-items: center;
        gap: 1.3rem;
      }
      .actions {
        margin-left: auto;
      }
      .account-control {
        position: relative;
      }
      .account-trigger {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        min-height: 44px;
        padding: 3px;
        border-radius: 999px;
      }
      .account-trigger sp-profile-image {
        --profile-image-size: 38px;
      }
      .account-trigger svg {
        width: 14px;
        height: 14px;
        transition: transform 150ms ease;
      }
      .account-trigger svg.expanded {
        transform: rotate(180deg);
      }
      .account-trigger:hover,
      .account-trigger[aria-expanded='true'] {
        background: var(--mist);
      }
      .account-control :is(a, button):focus-visible {
        outline: 3px solid color-mix(in srgb, var(--teal) 38%, transparent);
        outline-offset: 2px;
      }
      .account-dropdown {
        position: absolute;
        top: calc(100% + 12px);
        right: 0;
        width: 280px;
        max-height: calc(100dvh - 100px);
        overflow-y: auto;
        overscroll-behavior: contain;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: 0 16px 48px rgb(21 43 42 / 16%);
        padding: 8px;
        box-sizing: border-box;
        white-space: normal;
      }
      .account-identity {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 8px 16px;
        border-bottom: 1px solid var(--line);
      }
      .account-identity sp-profile-image {
        --profile-image-size: 42px;
      }
      .account-identity div {
        min-width: 0;
      }
      .account-identity strong {
        display: block;
        font-size: 0.95rem;
        overflow-wrap: anywhere;
      }
      .account-identity small {
        display: block;
        color: var(--slate);
        font-size: 0.75rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-top: 3px;
      }
      .account-dropdown h2 {
        margin: 12px 10px 4px;
        color: var(--slate);
        font-size: 0.65rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .account-dropdown a,
      .account-logout button {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        min-height: 40px;
        box-sizing: border-box;
        border-radius: 8px;
        font-size: 0.875rem;
        width: 100%;
        text-align: left;
      }
      .account-dropdown i {
        width: 18px;
        text-align: center;
        color: var(--slate);
      }
      .account-dropdown a:hover,
      .account-logout button:hover {
        background: var(--mist);
      }
      .account-dropdown a.current {
        background: #e6f7f1;
        color: var(--teal);
        font-weight: 750;
      }
      .account-dropdown a.current i {
        color: var(--teal);
      }
      .account-dropdown b {
        margin-left: auto;
        border-radius: 999px;
        background: var(--teal);
        color: #fff;
        font-size: 0.7rem;
        padding: 2px 6px;
      }
      .account-logout {
        border-top: 1px solid var(--line);
        margin-top: 8px;
        padding-top: 8px;
      }
      .account-logout button,
      .account-logout i {
        color: #955050;
      }
      .cta {
        background: var(--teal);
        color: white !important;
        padding: 0.7rem 1rem;
        border-radius: var(--radius-sm);
      }
      a,
      button {
        color: var(--midnight);
        font-weight: 650;
        text-decoration: none;
        background: none;
        border: 0;
        font: inherit;
        cursor: pointer;
        transition:
          color var(--motion-fast) var(--ease-sureplace),
          background-color var(--motion-fast) var(--ease-sureplace),
          transform var(--motion-fast) var(--ease-sureplace);
      }
      .staff-header {
        gap: 1rem;
        padding-inline: clamp(1rem, 2.5vw, 2.5rem);
      }
      .console-label {
        font-size: 0.75rem;
        font-weight: 800;
        color: var(--teal);
        background: var(--mist);
        padding: 0.4rem 0.6rem;
        border-radius: 0.5rem;
        white-space: nowrap;
      }
      .staff-search {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex: 1;
        max-width: 460px;
        min-width: 120px;
        padding: 0.2rem 0.6rem;
        background: var(--mist);
        border: 1px solid var(--line);
        border-radius: 0.7rem;
        color: var(--slate);
      }
      .staff-search input {
        min-width: 0;
        width: 100%;
        border: 0;
        background: transparent;
        padding: 0.6rem 0;
        font: inherit;
        font-size: 0.85rem;
      }
      .staff-search button {
        min-width: 44px;
        min-height: 44px;
      }
      .staff-identity {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-left: auto;
        font-size: 0.85rem;
      }
      .staff-identity small {
        display: block;
        color: var(--slate);
        font-size: 0.7rem;
      }
      .staff-avatar {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        background: var(--mist);
        color: var(--teal);
        border-radius: 50%;
        font-weight: 800;
      }
      .exit-console {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 44px;
        font-size: 0.8rem;
        white-space: nowrap;
      }
      @media (max-width: 1100px) {
        .staff-search {
          display: none;
        }
      }
      @media (max-width: 850px) {
        .staff-identity {
          display: none;
        }
        .staff-header .exit-console {
          margin-left: auto;
        }
        .staff-header {
          gap: 0.6rem;
        }
      }
      @media (max-width: 560px) {
        .staff-header .logo img {
          max-width: 100px;
          height: auto;
        }
        .staff-header .exit-console span {
          display: none;
        }
        .staff-header .exit-console {
          width: 44px;
          justify-content: center;
        }
        .console-label {
          font-size: 0.65rem;
          padding: 0.3rem 0.4rem;
        }
      }
      .auth-placeholder {
        display: block;
        width: 7rem;
        height: 2rem;
        border-radius: 0.5rem;
        background: var(--mist);
      }
      .active {
        color: var(--teal);
      }
      .menu-button {
        display: none;
        margin-left: auto;
        width: 44px;
        height: 44px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        place-items: center;
        background: #fff;
        font-size: 1.2rem;
      }
      .mobile-shortcuts {
        display: none;
        margin-left: auto;
        align-items: center;
        gap: 0.35rem;
      }
      .mobile-shortcuts a,
      .desktop-notification {
        position: relative;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        font-size: 1rem;
        color: var(--midnight);
        box-sizing: border-box;
        text-decoration: none;
      }
      .notification-icon {
        width: 21px;
        height: 21px;
      }
      .notification-link b {
        position: absolute;
        top: 2px;
        right: 2px;
        min-width: 16px;
        height: 16px;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        padding: 0 3px;
        border: 2px solid #fff;
        border-radius: 999px;
        background: var(--teal);
        color: #fff;
        font-size: 9px;
        line-height: 1;
      }
      .desktop-messages {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        white-space: nowrap;
      }
      .message-badge {
        display: inline-grid;
        place-items: center;
        min-width: 20px;
        height: 20px;
        padding-inline: 5px;
        box-sizing: border-box;
        border-radius: 999px;
        background: var(--teal);
        color: #fff;
        font-size: 11px;
        font-weight: 750;
      }
      .notification-link:hover,
      .notification-link:focus-visible {
        background: var(--mist);
        color: var(--teal);
      }
      @media (min-width: 851px) and (max-width: 1100px) {
        header:not(.staff-header) {
          gap: 1rem;
          padding-inline: 1rem;
        }
        .desktop-nav,
        .actions {
          gap: 0.85rem;
          font-size: 0.875rem;
          white-space: nowrap;
        }
        .logo img {
          height: 36px;
          max-width: 145px;
        }
      }
      .menu-button:active,
      .cta:active {
        transform: scale(0.98);
      }
      .icon-button {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        padding: 0;
        font-size: 1.25rem;
      }
      .icon-button:hover,
      .icon-button:focus-visible {
        background: var(--mist);
        transform: scale(1.03);
      }
      .menu-button:focus-visible,
      .drawer a:focus-visible,
      .drawer button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--teal) 38%, transparent);
        outline-offset: 2px;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: #152b2a99;
        opacity: 1;
        transition: opacity var(--motion-fast) var(--ease-sureplace);
      }
      .backdrop.is-closing {
        opacity: 0;
        pointer-events: none;
      }
      .drawer {
        position: fixed;
        z-index: 110;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(88vw, 390px);
        display: grid;
        grid-template-rows: auto 1fr;
        background: #fff;
        box-shadow: -20px 0 45px rgba(21, 43, 42, 0.18);
        padding: calc(0.65rem + env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right))
          calc(0.75rem + env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left));
        overflow: auto;
        transform: translateX(0);
        transition: transform var(--motion-drawer) var(--ease-sureplace);
        will-change: transform;
      }
      .drawer.is-closing {
        transform: translateX(100%);
      }
      .drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        border-bottom: 1px solid var(--line);
        padding-bottom: 0.55rem;
      }
      .drawer-head .logo img {
        height: auto;
        width: 120px;
        max-width: 42vw;
      }
      .drawer nav {
        display: grid;
        gap: 1.25rem;
        padding-top: 0.7rem;
        align-content: start;
      }
      .drawer section {
        display: grid;
        gap: 0.12rem;
      }
      .section-children {
        min-height: 0;
        display: grid;
        gap: 0.12rem;
      }
      .accordion-panel {
        display: grid;
        grid-template-rows: 0fr;
        visibility: hidden;
        transition:
          grid-template-rows 200ms ease,
          visibility 200ms;
      }
      .accordion-panel.expanded {
        grid-template-rows: 1fr;
        visibility: visible;
      }
      .accordion-panel .section-children {
        overflow: hidden;
        padding-left: 0.85rem;
      }
      .drawer .accordion-panel a span {
        font-size: 0.92rem;
      }
      .drawer .accordion-toggle {
        width: 100%;
        font-weight: 750;
      }
      .drawer .accordion-toggle > span {
        flex: 1;
      }
      .drawer .accordion-toggle .chevron {
        width: 16px;
        font-size: 0.8rem;
        transition: transform 180ms ease;
      }
      .chevron.expanded {
        transform: rotate(90deg);
      }
      .drawer .context-active {
        color: var(--teal);
        background: color-mix(in srgb, var(--teal) 4%, white);
      }
      .drawer nav .logout-row {
        margin-top: 0.75rem;
        border-top: 1px solid var(--line);
        color: #955050;
      }
      .drawer {
        overscroll-behavior: contain;
      }
      .drawer h2 {
        margin: 0 0 0.45rem;
        color: var(--slate);
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 850;
      }
      .drawer a,
      .drawer nav button {
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        border-radius: 0.7rem;
        padding: 0.5rem 0.75rem;
        text-align: left;
        transition:
          background-color var(--motion-fast) var(--ease-sureplace),
          color var(--motion-fast) var(--ease-sureplace),
          box-shadow var(--motion-fast) var(--ease-sureplace),
          transform var(--motion-fast) var(--ease-sureplace);
      }
      .drawer-row {
        opacity: 0;
        transform: translateX(6px);
        animation: drawer-row-in 220ms var(--ease-sureplace) forwards;
      }
      .drawer.is-closing .drawer-row {
        animation: none;
        opacity: 1;
        transform: none;
      }
      .drawer a:hover,
      .drawer nav button:hover {
        background: var(--mist);
      }
      .drawer a:active,
      .drawer nav button:active {
        background: color-mix(in srgb, var(--teal) 10%, white);
        transform: scale(0.99);
      }
      .drawer a span,
      .drawer nav button span {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        min-width: 0;
        font-size: 1rem;
      }
      .drawer a i,
      .drawer nav button i {
        width: 30px;
        text-align: center;
        color: var(--teal);
        font-size: 1.12rem;
      }
      .drawer a.current {
        background: color-mix(in srgb, var(--teal) 9%, white);
        color: var(--midnight);
        box-shadow: inset 4px 0 0 var(--teal);
        font-weight: 800;
      }
      .drawer a.primary-cta,
      .drawer a.secondary-cta {
        width: 100%;
        justify-content: center;
        margin-top: 0.45rem;
        font-weight: 850;
      }
      .drawer a.secondary-cta {
        background: color-mix(in srgb, var(--teal) 8%, white);
        border: 1px solid color-mix(in srgb, var(--teal) 42%, var(--line));
        color: var(--teal);
      }
      .drawer a.primary-cta {
        min-height: 54px;
        margin-top: 0.65rem;
        background: var(--teal);
        color: #fff;
      }
      .drawer a.primary-cta span,
      .drawer a.secondary-cta span {
        justify-content: center;
      }
      .drawer a.primary-cta i {
        color: #fff;
      }
      .drawer b {
        min-width: 1.45rem;
        text-align: center;
        border-radius: 999px;
        background: var(--teal);
        color: #fff;
        font-size: 0.7rem;
        padding: 0.15rem 0.35rem;
      }
      @keyframes drawer-row-in {
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @media (max-width: 850px) {
        header:not(.staff-header) {
          height: 72px;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 44px;
          gap: 0;
          padding-inline: 1rem;
        }
        header:not(.staff-header) > .logo {
          grid-column: 2;
          justify-self: center;
        }
        .desktop-nav,
        .actions {
          display: none;
        }
        .mobile-shortcuts {
          grid-column: 3;
          grid-row: 1;
          display: flex;
          justify-self: end;
        }
        .menu-button {
          grid-column: 1;
          grid-row: 1;
          display: grid;
          margin-left: 0;
        }
        .logo img {
          height: 36px;
          max-width: 145px;
        }
      }
      @media (max-width: 340px) {
        .drawer {
          width: 90vw;
          padding-inline: 1rem;
        }
        .drawer a span,
        .drawer nav button span {
          gap: 0.75rem;
        }
        .drawer a i,
        .drawer nav button i {
          width: 28px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        a,
        button,
        .backdrop,
        .accordion-panel,
        .chevron,
        .drawer,
        .drawer a,
        .drawer nav button {
          transition-duration: 0.01ms !important;
        }
        .drawer-row {
          animation: none;
          opacity: 1;
          transform: none;
        }
        .drawer,
        .drawer.is-closing {
          will-change: auto;
        }
        .icon-button:hover,
        .icon-button:focus-visible,
        .menu-button:active,
        .cta:active,
        .drawer a:active,
        .drawer nav button:active {
          transform: none;
        }
      }
    `,
  ],
})
export class PublicHeaderComponent {
  staffWorkspace = input(false);
  staffInitials = computed(
    () =>
      [this.auth.user()?.first_name, this.auth.user()?.last_name]
        .filter(Boolean)
        .map((name) => name![0])
        .join('')
        .slice(0, 2) || 'SP',
  );
  searchStaff(event: Event, search: string) {
    event.preventDefault();
    void this.router.navigate(['/staff/listings'], {
      queryParams: { search: search.trim(), status: '' },
    });
  }

  auth = inject(AuthService);
  agencyNavigation = inject(AgencyNavigationService);
  capabilities = inject(UserCapabilityService);
  listingEntry = inject(ListingEntryService);
  expandedSection = signal<SectionId | null>(null);
  config = inject(ConfigApiService);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private activity = inject(AccountActivityStore);
  private platformId = inject(PLATFORM_ID);
  menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  accountControl = viewChild<ElementRef<HTMLElement>>('accountControl');
  accountButton = viewChild<ElementRef<HTMLButtonElement>>('accountButton');
  accountOpen = signal(false);
  accountName = computed(
    () =>
      [this.auth.user()?.first_name, this.auth.user()?.last_name].filter(Boolean).join(' ') ||
      'Account',
  );
  drawer = viewChild<ElementRef<HTMLElement>>('drawer');
  menuState = signal<MenuState>('closed');
  menuRendered = signal(false);
  menuExpanded = computed(() => this.menuState() === 'open');
  currentUrl = signal(this.router.url);
  private scrollY = 0;
  private scrollLocked = false;
  private returnFocusAfterClose = true;
  private previousAuthState = this.auth.isAuthenticated();
  primaryCta = computed<NavItem>(() =>
    this.auth.isAuthenticated() && this.capabilities.capabilities().canAccessManageDashboard
      ? { label: 'Manage Listings', commands: this.listingEntry.propertyRoute }
      : this.auth.isAuthenticated()
        ? { label: 'List on SurePlace', commands: this.listingEntry.propertyRoute }
        : { label: 'List a Property', commands: this.listingEntry.propertyRoute },
  );
  mobileSections = computed<NavSection[]>(() =>
    this.auth.status() === 'initializing'
      ? [this.anonymousSections()[0]]
      : this.auth.isAuthenticated()
        ? this.authenticatedSections()
        : this.anonymousSections(),
  );

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeAccount();
        this.closeMenu(false);
      });
    effect(() => {
      const authenticated = this.auth.isAuthenticated();
      if (authenticated !== this.previousAuthState) {
        this.previousAuthState = authenticated;
        this.closeAccount();
        this.closeMenu(false);
      }
    });
  }

  anonymousSections(): NavSection[] {
    return [
      {
        title: 'Explore',
        items: [
          { label: 'Home', commands: '/', icon: 'fa-solid fa-house' },
          {
            label: 'Properties',
            commands: '/properties',
            icon: 'fa-solid fa-building',
          },
          { label: 'Stays', commands: '/stays', feature: 'stays', icon: 'fa-solid fa-bed' },
          { label: 'Agents', commands: '/agents', icon: 'fa-solid fa-user-tie' },
        ],
      },
      {
        title: 'Account',
        items: [
          { label: 'Log in', commands: '/login', icon: 'fa-solid fa-right-to-bracket' },
          {
            label: 'Create account',
            commands: '/register',
            feature: 'registration',
            icon: 'fa-solid fa-user-plus',
            cta: 'secondary',
          },
          {
            label: 'List a Property',
            commands: this.listingEntry.propertyRoute,
            icon: 'fa-solid fa-plus',
            cta: 'primary',
          },
        ],
      },
    ];
  }

  accountSections = computed(() =>
    accountNavigation({
      authenticated: this.auth.isAuthenticated(),
      staff: !!this.auth.user()?.is_staff,
      agencyLinks: this.agencyNavigation.links(),
      features: this.config.config().features,
      capabilities: this.capabilities.capabilities(),
    }),
  );
  badgeLabel = unreadBadgeLabel;
  accountDropdownSections = computed(() =>
    this.accountSections().filter(
      (section) => section.id === 'account' || section.id === 'activity',
    ),
  );

  closeAccount(returnFocus = false) {
    if (!this.accountOpen()) return;
    this.accountOpen.set(false);
    if (returnFocus) this.accountButton()?.nativeElement.focus();
  }

  accountFocusOut(event: FocusEvent) {
    if (!this.accountControl()?.nativeElement.contains(event.relatedTarget as Node | null))
      this.closeAccount();
  }

  @HostListener('document:click', ['$event'])
  accountOutsideClick(event: MouseEvent) {
    if (!this.accountControl()?.nativeElement.contains(event.target as Node | null))
      this.closeAccount();
  }

  @HostListener('window:resize')
  accountResize() {
    if (this.isBrowser() && window.innerWidth <= 850) this.closeAccount();
  }

  authenticatedSections(): NavSection[] {
    const shared = this.accountSections();
    const sections: NavSection[] = [
      {
        title: 'Explore',
        items: [
          ...this.anonymousSections()[0].items,
          ...shared.flatMap((section) => section.items.filter((item) => item.mobileExplore)),
        ],
      },
      ...mobileAccountNavigation(shared),
    ];
    sections.push({
      title: '',
      items: [
        {
          label: 'List a Property',
          commands: '/account/manage/properties/new',
          icon: 'fa-solid fa-plus',
          cta: 'primary',
        },
        {
          label: 'Log out',
          commands: '#',
          action: 'logout',
          icon: 'fa-solid fa-right-from-bracket',
        },
      ],
    });
    return sections;
  }

  visible(items: NavItem[]) {
    return items.filter((item) => !item.feature || this.config.config().features[item.feature]);
  }

  badge(kind?: 'messages' | 'notifications') {
    const value =
      kind === 'messages'
        ? this.activity.unreadMessages()
        : kind === 'notifications'
          ? this.activity.unreadNotifications()
          : 0;
    return value > 99 ? '99+' : value ? String(value) : '';
  }

  drawerRowDelay(index: number) {
    return Math.min(index * 26, 180);
  }

  isPropertiesActive() {
    return this.currentUrl().startsWith('/properties');
  }

  currentSection(): SectionId | null {
    if (!this.auth.isAuthenticated()) return null;
    return mobileRouteSection(this.currentUrl(), this.accountSections());
  }

  toggleSection(id: SectionId) {
    this.expandedSection.update((current) => (current === id ? null : id));
  }

  openMenu() {
    this.closeAccount();
    if (!this.isBrowser()) return;
    if (this.menuState() !== 'closed') return;
    this.expandedSection.set(this.currentSection());
    this.menuRendered.set(true);
    this.menuState.set('open');
    this.lockScroll();
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.drawer()?.nativeElement.focus());
    }
  }

  closeMenu(returnFocus = true) {
    if (!this.menuRendered() || this.menuState() === 'closing') return;
    this.returnFocusAfterClose = returnFocus;
    this.menuState.set('closing');
    if (this.prefersReducedMotion()) {
      queueMicrotask(() => {
        if (this.menuState() === 'closing') this.completeClose();
      });
    }
  }

  finishClose(event: TransitionEvent) {
    if (
      this.menuState() !== 'closing' ||
      event.target !== this.drawer()?.nativeElement ||
      event.propertyName !== 'transform'
    ) {
      return;
    }
    this.completeClose();
  }

  logout() {
    this.closeAccount();
    this.closeMenu(false);
    this.auth.logout();
  }

  isActive(item: NavItem) {
    if (item.cta || typeof item.commands !== 'string') return false;
    return navigationActive(this.currentUrl(), { ...item, commands: item.commands });
  }

  trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const root = this.drawer()?.nativeElement;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((item) => !item.hasAttribute('disabled') && !item.closest('[inert]'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('document:keydown.escape')
  escape() {
    this.closeAccount(true);
    this.closeMenu();
  }

  private completeClose() {
    this.menuRendered.set(false);
    this.menuState.set('closed');
    this.unlockScroll();
    if (
      this.returnFocusAfterClose &&
      this.isBrowser() &&
      typeof requestAnimationFrame !== 'undefined'
    )
      requestAnimationFrame(() => this.menuButton()?.nativeElement.focus());
  }

  private lockScroll() {
    if (this.scrollLocked || !this.isBrowser()) return;
    const body = this.document.body;
    this.scrollY = window.scrollY || 0;
    body.style.position = 'fixed';
    body.style.top = `-${this.scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    this.scrollLocked = true;
  }

  private unlockScroll() {
    if (!this.scrollLocked || !this.isBrowser()) return;
    const body = this.document.body;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    this.scrollLocked = false;
    if (this.scrollY) {
      try {
        window.scrollTo(0, this.scrollY);
      } catch {}
    }
  }

  private prefersReducedMotion() {
    return this.isBrowser() && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }
}

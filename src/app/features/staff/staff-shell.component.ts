import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { STAFF_NAVIGATION } from '../../core/services/account-navigation.config';
@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `<div class="staff-workspace">
    <div class="staff-layout">
      <aside>
        <div class="workspace-brand">
          <span><i class="fa-solid fa-shield-halved" aria-hidden="true"></i></span>
          <div>Trust & safety<small>SurePlace operations</small></div>
        </div>
        <nav aria-label="Staff moderation">
          @for (group of groups; track group.title) {
            <section>
              <h2>{{ group.title }}</h2>
              @for (item of group.items; track item.commands) {
                <a
                  [routerLink]="item.commands"
                  routerLinkActive="active"
                  ariaCurrentWhenActive="page"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                >
                  <i [class]="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span>
                </a>
              }
            </section>
          }
        </nav>
        <p class="workspace-note">
          <i class="fa-solid fa-lock" aria-hidden="true"></i> Staff workspace
          <span>Review carefully. Every moderation decision leaves an audit record.</span>
        </p>
      </aside>
      <main class="staff-content"><router-outlet /></main>
    </div>
  </div>`,
  styles: [
    `
      .staff-workspace {
        min-height: calc(100dvh - 72px);
        background: var(--mist);
      }
      .staff-layout {
        width: min(1600px, 100%);
        margin: 0 auto;
        display: grid;
        grid-template-columns: 230px minmax(0, 1fr);
      }
      aside {
        position: sticky;
        top: 72px;
        align-self: start;
        min-height: calc(100dvh - 72px);
        padding: 1.75rem 1rem;
        background: white;
        border-right: 1px solid var(--line);
      }
      .workspace-brand {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0 0.6rem 1.4rem;
        font-weight: 800;
        font-size: 0.9rem;
      }
      .workspace-brand > span {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        color: white;
        background: var(--midnight);
      }
      small {
        display: block;
        font-size: 0.68rem;
        color: var(--slate);
        font-weight: 500;
        margin-top: 0.25rem;
      }
      nav section {
        display: grid;
        gap: 0.25rem;
        margin-bottom: 1.5rem;
      }
      h2 {
        margin: 0.5rem 0.75rem;
        font-size: 0.65rem;
        color: var(--slate);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      nav a {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-height: 46px;
        border-radius: 0.6rem;
        padding: 0.65rem 0.75rem;
        color: var(--slate);
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 650;
      }
      nav i {
        width: 20px;
        text-align: center;
      }
      nav a.active {
        background: #eaf7f3;
        color: #08705f;
        box-shadow: inset 3px 0 var(--teal);
      }
      nav a:hover {
        background: var(--mist);
      }
      nav a:focus-visible {
        outline: 3px solid var(--teal);
        outline-offset: 2px;
      }
      .workspace-note {
        margin: 3rem 0.6rem 0;
        padding-top: 1rem;
        border-top: 1px solid var(--line);
        font-size: 0.75rem;
        color: var(--midnight);
      }
      .workspace-note i {
        color: var(--teal);
        margin-right: 0.3rem;
      }
      .workspace-note span {
        display: block;
        color: var(--slate);
        font-size: 0.7rem;
        line-height: 1.65;
        margin-top: 0.6rem;
      }
      .staff-content {
        min-width: 0;
        padding: clamp(1rem, 2.3vw, 2.25rem);
      }
      @media (max-width: 1100px) {
        .staff-layout {
          grid-template-columns: 205px minmax(0, 1fr);
        }
      }
      @media (max-width: 850px) {
        .staff-layout {
          display: block;
        }
        aside {
          display: none;
        }
        .staff-content {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class StaffShellComponent {
  groups = [
    { title: 'Staff Console', items: [{ ...STAFF_NAVIGATION.items[0], label: 'Overview' }] },
    { title: 'Moderation', items: STAFF_NAVIGATION.items.slice(1) },
  ];
}

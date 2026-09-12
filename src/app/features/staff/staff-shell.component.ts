import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `<main class="staff-layout">
    <aside>
      <a class="brand" routerLink="/staff"
        ><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Staff</a
      >
      <nav aria-label="Staff moderation">
        @for (item of nav; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.exact }"
          >
            <i [class]="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span>
          </a>
        }
      </nav>
    </aside>
    <section class="staff-content"><router-outlet /></section>
  </main>`,
  styles: [
    `
      .staff-layout {
        width: min(1320px, calc(100% - 2rem));
        margin: 0 auto;
        padding: 1.25rem 0 3rem;
        display: grid;
        grid-template-columns: 230px minmax(0, 1fr);
        gap: 1.25rem;
      }
      aside {
        position: sticky;
        top: 1rem;
        align-self: start;
        display: grid;
        gap: 1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        padding: 0.85rem;
      }
      .brand,
      nav a {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-height: 42px;
        border-radius: 0.45rem;
        color: var(--midnight);
        text-decoration: none;
        font-weight: 800;
      }
      .brand {
        padding: 0 0.55rem 0.7rem;
        border-bottom: 1px solid var(--line);
        border-radius: 0;
      }
      nav {
        display: grid;
        gap: 0.2rem;
      }
      nav a {
        padding: 0 0.65rem;
      }
      nav a.active,
      nav a:hover {
        background: var(--mist);
        color: var(--teal);
      }
      .staff-content {
        min-width: 0;
      }
      @media (max-width: 840px) {
        .staff-layout {
          grid-template-columns: 1fr;
        }
        aside {
          position: static;
        }
        nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 560px) {
        .staff-layout {
          width: min(100% - 1rem, 1320px);
        }
        nav {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StaffShellComponent {
  nav = [
    { label: 'Dashboard', path: '/staff', icon: 'fa-solid fa-gauge-high', exact: true },
    { label: 'Listings', path: '/staff/listings', icon: 'fa-solid fa-building-user', exact: false },
    { label: 'Reports', path: '/staff/reports', icon: 'fa-solid fa-flag', exact: false },
    { label: 'Agencies', path: '/staff/agencies', icon: 'fa-solid fa-briefcase', exact: false },
    {
      label: 'Verification',
      path: '/staff/verification',
      icon: 'fa-solid fa-id-card',
      exact: false,
    },
    { label: 'Users', path: '/staff/users', icon: 'fa-solid fa-users', exact: false },
  ];
}

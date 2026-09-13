import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AgencyManagementApiService } from '../api/manage-api.services';
import { AuthService } from '../auth/auth.service';
import { Agency } from '../models/manage.models';

/** Navigation context from backend membership; never grants access to agency actions. */
@Injectable({ providedIn: 'root' })
export class AgencyNavigationService {
  private api = inject(AgencyManagementApiService);
  private auth = inject(AuthService);
  private agencies = signal<Agency[] | null>(null);
  private request = 0;
  links = computed(() => {
    const agencies = this.agencies();
    if (!this.auth.isAuthenticated() || !agencies) return [];
    if (!agencies.length)
      return [
        {
          label: 'Create an agency',
          commands: '/account/manage/agency/create',
          exact: true,
          icon: 'fa-solid fa-building-circle-check',
        },
      ];
    const links = [
      {
        label: 'Agency',
        commands: '/account/manage/agency',
        exact: true,
        icon: 'fa-solid fa-building',
      },
    ];
    // The existing Team page selects the first agency returned by mine().
    if (['OWNER', 'ADMIN'].includes(agencies[0].user_role) && this.auth.user()?.is_email_verified) {
      links.push({
        label: 'Team',
        commands: '/account/manage/agency/team',
        exact: true,
        icon: 'fa-solid fa-users',
      });
    }
    return links;
  });
  constructor() {
    effect(() => {
      this.auth.user();
      this.refresh();
    });
  }
  refresh() {
    const request = ++this.request;
    this.agencies.set(null);
    if (!this.auth.isAuthenticated()) return;
    this.api.mine().subscribe({
      next: (agencies) => {
        if (request === this.request) this.agencies.set(agencies);
      },
      error: () => {
        /* Unknown membership must not advertise creation or management. */
      },
    });
  }
}

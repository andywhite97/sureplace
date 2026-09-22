import { Injectable, computed, inject } from '@angular/core';
import { UserCapabilityService } from './user-capability.service';

/** Navigation context from backend membership; never grants access to agency actions. */
@Injectable({ providedIn: 'root' })
export class AgencyNavigationService {
  private capabilities = inject(UserCapabilityService);
  links = computed(() => {
    const access = this.capabilities.capabilities();
    if (!access.canAccessAgencyTools) {
      return access.canCreateAgency
        ? [
            {
              label: 'Create an agency',
              commands: '/account/manage/agency/create',
              exact: true,
              icon: 'fa-solid fa-building-circle-check',
            },
          ]
        : [];
    }
    const links = [
      {
        label: 'Agency',
        commands: '/account/manage/agency',
        exact: true,
        icon: 'fa-solid fa-building',
      },
    ];
    if (access.canManageAgency) {
      links.push({
        label: 'Team',
        commands: '/account/manage/agency/team',
        exact: true,
        icon: 'fa-solid fa-users',
      });
    }
    return links;
  });
  refresh() {
    this.capabilities.refresh().subscribe();
  }
}

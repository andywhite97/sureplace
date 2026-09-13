export type AccountSectionId = 'account' | 'activity' | 'manage' | 'agency' | 'staff';
export type MobileSectionId = Exclude<AccountSectionId, 'activity'>;
export type NavigationBadge = 'messages' | 'notifications';
export type NavigationFeature = 'stays' | 'bookings' | 'internal_messaging';
export interface AccountNavItem {
  label: string;
  commands: string;
  icon: string;
  exact?: boolean;
  activePaths?: string[];
  badge?: NavigationBadge;
  feature?: NavigationFeature;
  mobileExplore?: boolean;
}
export interface AccountNavSection {
  id: AccountSectionId;
  title: string;
  icon: string;
  items: AccountNavItem[];
}

const sections: AccountNavSection[] = [
  {
    id: 'account',
    title: 'Account',
    icon: 'fa-solid fa-circle-user',
    items: [
      { label: 'Overview', commands: '/account', exact: true, icon: 'fa-solid fa-house' },
      {
        label: 'Saved',
        commands: '/account/saved',
        icon: 'fa-solid fa-heart',
        mobileExplore: true,
      },
      {
        label: 'Messages',
        commands: '/account/messages',
        icon: 'fa-solid fa-message',
        badge: 'messages',
        feature: 'internal_messaging',
        mobileExplore: true,
      },
      { label: 'Alerts', commands: '/account/alerts', icon: 'fa-solid fa-bell' },
      {
        label: 'Notifications',
        commands: '/account/notifications',
        icon: 'fa-solid fa-inbox',
        badge: 'notifications',
      },
      { label: 'Profile', commands: '/account/profile', icon: 'fa-solid fa-user' },
      { label: 'Settings', commands: '/account/settings', icon: 'fa-solid fa-gear' },
    ],
  },
  {
    id: 'activity',
    title: 'Activity',
    icon: 'fa-solid fa-calendar-check',
    items: [
      { label: 'Viewings', commands: '/account/viewings', icon: 'fa-solid fa-calendar-check' },
      {
        label: 'Bookings',
        commands: '/account/bookings',
        icon: 'fa-solid fa-suitcase',
        feature: 'bookings',
      },
    ],
  },
  {
    id: 'manage',
    title: 'Manage',
    icon: 'fa-solid fa-building',
    items: [
      {
        label: 'Dashboard',
        commands: '/account/manage',
        exact: true,
        icon: 'fa-solid fa-gauge-high',
      },
      {
        label: 'Properties',
        commands: '/account/manage/properties',
        icon: 'fa-solid fa-building-user',
      },
      {
        label: 'Stays',
        commands: '/account/manage/stays',
        icon: 'fa-solid fa-bed',
        feature: 'stays',
      },
      {
        label: 'Verification',
        commands: '/account/manage/verification',
        icon: 'fa-solid fa-shield-halved',
      },
    ],
  },
];
export const STAFF_NAVIGATION: AccountNavSection = {
  id: 'staff',
  title: 'Staff Console',
  icon: 'fa-solid fa-shield-halved',
  items: [
    { label: 'Dashboard', commands: '/staff', exact: true, icon: 'fa-solid fa-gauge-high' },
    { label: 'Property Listings', commands: '/staff/listings', icon: 'fa-solid fa-building-user' },
  ],
};

/** Authenticated navigation only. Agency links have already been filtered by backend membership. */
export function accountNavigation(context: {
  authenticated: boolean;
  staff: boolean;
  agencyLinks: AccountNavItem[];
  features: Record<NavigationFeature, boolean>;
}): AccountNavSection[] {
  if (!context.authenticated) return [];
  const result = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.feature || context.features[item.feature]),
  }));
  if (context.agencyLinks.length)
    result.push({
      id: 'agency',
      title: 'Agency',
      icon: 'fa-solid fa-building',
      items: context.agencyLinks.map((item) =>
        item.commands === '/account/manage/agency'
          ? { ...item, activePaths: ['/account/manage/agency/profile'] }
          : item,
      ),
    });
  if (context.staff) result.push(STAFF_NAVIGATION);
  return result;
}

export function desktopNavigation(sections: AccountNavSection[]): AccountNavSection[] {
  return sections.map((section) =>
    section.id === 'staff'
      ? {
          ...section,
          items: [
            { ...section.items[0], label: 'Open Staff Console', exact: false, icon: section.icon },
          ],
        }
      : section,
  );
}

export function mobileAccountNavigation(sections: AccountNavSection[]) {
  const activity = sections.find((section) => section.id === 'activity')?.items || [];
  return sections
    .filter((section) => section.id !== 'activity')
    .map((section) => ({
      ...section,
      id: section.id as MobileSectionId,
      items:
        section.id === 'account'
          ? section.items
              .filter((item) => !item.mobileExplore)
              .flatMap((item) =>
                item.commands === '/account/profile' ? [...activity, item] : [item],
              )
          : section.items,
    }));
}

export function navigationActive(
  url: string,
  item: { commands: string; exact?: boolean; activePaths?: string[] },
): boolean {
  const path = url.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  return (
    !!item.activePaths?.some((active) => path === active || path.startsWith(active + '/')) ||
    path === item.commands ||
    (!item.exact && item.commands !== '/' && path.startsWith(item.commands + '/'))
  );
}

export function mobileRouteSection(
  url: string,
  sections: AccountNavSection[],
): MobileSectionId | null {
  if (!sections.length) return null;
  const path = url.split(/[?#]/)[0];
  // Agency lives beneath Manage in URLs, but is a separate navigation context.
  if (/^\/account\/manage\/agency(?:\/|$)/.test(path)) return 'agency';
  if (/^\/staff(?:\/|$)/.test(path) && sections.some((section) => section.id === 'staff'))
    return 'staff';
  if (/^\/account\/manage(?:\/|$)/.test(path)) return 'manage';
  const section = sections.find((section) =>
    section.items.some((item) => navigationActive(url, item) && !item.mobileExplore),
  );
  return section?.id === 'activity' ? 'account' : section?.id || null;
}

export function unreadBadgeLabel(kind: NavigationBadge | undefined, count: string): string | null {
  return kind && count ? `${count} unread ${kind}` : null;
}

import { Routes } from '@angular/router';
import { authGuard, capabilityGuard, guestGuard, staffAccessGuard, staffGuard } from './core/guards/auth.guard';
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'SurePlace | Property & Stays in Eswatini',
  },
  {
    path: 'properties',
    loadComponent: () =>
      import('./features/properties/property-search.component').then(
        (m) => m.PropertySearchComponent,
      ),
    title: 'Properties in Eswatini | SurePlace',
  },
  {
    path: 'properties/:slug',
    loadComponent: () =>
      import('./features/properties/detail/property-detail.component').then(
        (m) => m.PropertyDetailComponent,
      ),
    title: 'Property | SurePlace',
  },
  {
    path: 'stays',
    loadComponent: () =>
      import('./features/stays/stay-search.component').then((m) => m.StaySearchComponent),
    title: 'Stays in Eswatini | SurePlace',
  },
  {
    path: 'stays/:slug',
    loadComponent: () =>
      import('./features/stays/detail/stay-detail.component').then((m) => m.StayDetailComponent),
    title: 'Stay | SurePlace',
  },
  {
    path: 'agents',
    loadComponent: () =>
      import('./features/agents/agents.component').then((m) => m.AgentsComponent),
    title: 'Agents | SurePlace',
  },
  {
    path: 'agents/:id',
    loadComponent: () =>
      import('./features/agents/agent-profile.component').then((m) => m.AgentProfileComponent),
    title: 'Agent profile | SurePlace',
  },
  {
    path: 'agencies/:slug',
    loadComponent: () =>
      import('./features/agencies/public-agency.component').then((m) => m.PublicAgencyComponent),
    title: 'Agency profile | SurePlace',
  },
  {
    path: 'verification',
    loadComponent: () =>
      import('./features/verification-info.component').then((m) => m.VerificationInfoComponent),
    title: 'SurePlace verification | Safer property decisions',
  },
  {
    path: 'help',
    loadComponent: () =>
      import('./features/help/help-centre.component').then((module) => module.HelpCentreComponent),
    title: 'Help Centre | SurePlace',
  },
  ...(['about', 'pricing', 'terms', 'privacy', 'cookies'] as const).map((publicPage) => ({
    path: publicPage,
    data: { publicPage },
    loadComponent: () =>
      import('./features/public-pages.component').then((m) => m.PublicPagesComponent),
  })),
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  {
    path: 'verify-email/pending',
    loadComponent: () =>
      import('./features/auth/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  {
    path: 'agency-invitations/accept',
    loadComponent: () =>
      import('./features/manage/agency-invitation-accept.component').then(
        (m) => m.AgencyInvitationAcceptComponent,
      ),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/account-shell.component').then((m) => m.AccountShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/account/account-overview.component').then(
            (m) => m.AccountOverviewComponent,
          ),
        title: 'Account overview | SurePlace',
      },
      {
        path: 'saved',
        loadComponent: () =>
          import('./features/account/saved-listings.component').then(
            (m) => m.SavedListingsComponent,
          ),
        title: 'Saved listings | SurePlace',
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/messages/messages-page.component').then(
            (m) => m.MessagesPageComponent,
          ),
        title: 'Messages | SurePlace',
      },
      {
        path: 'messages/:conversationId',
        loadComponent: () =>
          import('./features/messages/messages-page.component').then(
            (m) => m.MessagesPageComponent,
          ),
        title: 'Conversation | SurePlace',
      },
      {
        path: 'viewings',
        loadComponent: () =>
          import('./features/account/viewings.component').then((m) => m.ViewingsComponent),
        title: 'Viewings | SurePlace',
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/account/bookings.component').then((m) => m.BookingsComponent),
        title: 'Bookings | SurePlace',
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/account/saved-searches.component').then(
            (m) => m.SavedSearchesComponent,
          ),
        title: 'Saved searches | SurePlace',
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/account/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
        title: 'Notifications | SurePlace',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/account/profile.component').then((m) => m.ProfileComponent),
        title: 'Profile | SurePlace',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/account/settings.component').then((m) => m.SettingsComponent),
        title: 'Settings | SurePlace',
      },
      {
        path: 'settings/password',
        loadComponent: () =>
          import('./features/auth/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
        title: 'Change password | SurePlace',
      },
      {
        path: 'manage',
        canActivate: [capabilityGuard],
        data: { capability: 'canAccessManageDashboard' },
        loadComponent: () =>
          import('./features/manage/agency-dashboard.component').then(
            (m) => m.AgencyDashboardComponent,
          ),
        title: 'Manage listings | SurePlace',
      },
      {
        path: 'manage/agency',
        canActivate: [capabilityGuard],
        data: { capability: 'canAccessAgencyTools' },
        loadComponent: () =>
          import('./features/manage/agency-dashboard.component').then(
            (m) => m.AgencyDashboardComponent,
          ),
        title: 'Agency dashboard | SurePlace',
      },
      {
        path: 'manage/agency/create',
        canActivate: [capabilityGuard],
        data: { capability: 'canCreateAgency', capabilityIntent: 'PROPERTY_AGENT' },
        loadComponent: () =>
          import('./features/manage/agency-create.component').then((m) => m.AgencyCreateComponent),
        title: 'Create agency | SurePlace',
      },
      {
        path: 'manage/agency/profile',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageAgency' },
        loadComponent: () =>
          import('./features/manage/agency-profile.component').then(
            (m) => m.AgencyProfileComponent,
          ),
        title: 'Agency profile | SurePlace',
      },
      {
        path: 'manage/agency/team',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageAgency' },
        loadComponent: () =>
          import('./features/manage/agency-team.component').then((m) => m.AgencyTeamComponent),
        title: 'Agency team | SurePlace',
      },
      { path: 'manage/agency/listings', redirectTo: 'manage/properties', pathMatch: 'full' },
      { path: 'manage/agency/enquiries', redirectTo: 'manage/viewings', pathMatch: 'full' },
      { path: 'manage/agency/verification', redirectTo: 'manage/verification', pathMatch: 'full' },
      { path: 'manage/agency/settings', redirectTo: 'settings', pathMatch: 'full' },
      {
        path: 'manage/listings/new',
        canActivate: [capabilityGuard],
        data: { capability: 'canAccessManageDashboard' },
        loadComponent: () =>
          import('./features/manage/listing-type-choice.component').then(
            (m) => m.ListingTypeChoiceComponent,
          ),
        title: 'List on SurePlace',
      },
      {
        path: 'manage/properties',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageProperties' },
        loadComponent: () =>
          import('./features/manage/property-management-list.component').then(
            (m) => m.PropertyManagementListComponent,
          ),
        title: 'Manage properties | SurePlace',
      },
      {
        path: 'manage/properties/new',
        canActivate: [capabilityGuard],
        data: { capability: 'canCreatePropertyListing', capabilityIntent: 'PROPERTY_OWNER' },
        loadComponent: () =>
          import('./features/manage/property-form.component').then((m) => m.PropertyFormComponent),
        title: 'Add property | SurePlace',
      },
      {
        path: 'manage/properties/:id/edit',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageProperties' },
        loadComponent: () =>
          import('./features/manage/property-form.component').then((m) => m.PropertyFormComponent),
        title: 'Edit property | SurePlace',
      },
      {
        path: 'manage/stays',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageStays' },
        loadComponent: () =>
          import('./features/manage/stay-management-list.component').then(
            (m) => m.StayManagementListComponent,
          ),
        title: 'Manage stays | SurePlace',
      },
      {
        path: 'manage/stays/new',
        canActivate: [capabilityGuard],
        data: { capability: 'canCreateStayListing', capabilityIntent: 'HOSPITALITY_OPERATOR' },
        loadComponent: () =>
          import('./features/manage/stay-form.component').then((m) => m.StayFormComponent),
        title: 'Add stay | SurePlace',
      },
      {
        path: 'manage/stays/:id/submitted',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageStays' },
        loadComponent: () =>
          import('./features/manage/stay-submitted.component').then(
            (m) => m.StaySubmittedComponent,
          ),
        title: 'Stay submitted | SurePlace',
      },
      {
        path: 'manage/stays/:id/edit',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageStays' },
        loadComponent: () =>
          import('./features/manage/stay-form.component').then((m) => m.StayFormComponent),
        title: 'Edit stay | SurePlace',
      },
      {
        path: 'manage/stays/:id/rooms',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageStays' },
        loadComponent: () =>
          import('./features/manage/rooms.component').then((m) => m.RoomsComponent),
        title: 'Manage rooms | SurePlace',
      },
      {
        path: 'manage/stays/:id/calendar',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageStays' },
        loadComponent: () =>
          import('./features/manage/availability-calendar.component').then(
            (m) => m.AvailabilityCalendarComponent,
          ),
        title: 'Availability calendar | SurePlace',
      },
      {
        path: 'manage/viewings',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageProperties' },
        loadComponent: () =>
          import('./features/manage/manager-viewings.component').then(
            (m) => m.ManagerViewingsComponent,
          ),
        title: 'Manager viewings | SurePlace',
      },
      {
        path: 'manage/bookings',
        canActivate: [capabilityGuard],
        data: { capability: 'canManageStays' },
        loadComponent: () =>
          import('./features/manage/manager-bookings.component').then(
            (m) => m.ManagerBookingsComponent,
          ),
        title: 'Manager bookings | SurePlace',
      },
      {
        path: 'manage/verification',
        canActivate: [capabilityGuard],
        data: { capability: 'canAccessVerification' },
        loadComponent: () =>
          import('./features/manage/verification.component').then((m) => m.VerificationComponent),
        title: 'Verification | SurePlace',
      },
    ],
  },
  {
    path: 'staff',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./features/staff/staff-shell.component').then((m) => m.StaffShellComponent),
    children: [
      {
        path: '',
        canActivate: [staffAccessGuard],
        data: { staffPermissions: ['properties.review_propertylisting'] },
        loadComponent: () =>
          import('./features/staff/staff-dashboard.component').then(
            (m) => m.StaffDashboardComponent,
          ),
        title: 'Staff dashboard | SurePlace',
      },
      {
        path: 'listings',
        canActivate: [staffAccessGuard],
        data: { staffPermissions: ['properties.review_propertylisting'] },
        loadComponent: () =>
          import('./features/staff/staff-listings.component').then((m) => m.StaffListingsComponent),
        title: 'Listing moderation | SurePlace',
      },
      {
        path: 'listings/:id',
        canActivate: [staffAccessGuard],
        data: { staffPermissions: ['properties.review_propertylisting'] },
        loadComponent: () =>
          import('./features/staff/staff-listing-detail.component').then(
            (m) => m.StaffListingDetailComponent,
          ),
        title: 'Review listing | SurePlace',
      },
      {
        path: 'reports',
        canActivate: [staffAccessGuard],
        data: { staffPermissions: ['moderation.view_listingreport'] },
        loadComponent: () =>
          import('./features/staff/staff-reports.component').then((m) => m.StaffReportsComponent),
        title: 'Listing reports | SurePlace staff',
      },
      {
        path: 'agencies/:id',
        canActivate: [staffAccessGuard],
        data: { workspace: 'agencies', staffPermissions: ['verification.review_verificationrequest'] },
        loadComponent: () =>
          import('./features/staff/staff-operation-detail.component').then(
            (m) => m.StaffOperationDetailComponent,
          ),
        title: 'Agency review | SurePlace staff',
      },
      {
        path: 'agencies',
        canActivate: [staffAccessGuard],
        data: { workspace: 'agencies', staffPermissions: ['verification.review_verificationrequest'] },
        loadComponent: () =>
          import('./features/staff/staff-operations.component').then((m) => m.StaffOperationsComponent),
        title: 'Agency reviews | SurePlace staff',
      },
      {
        path: 'verification/:id',
        canActivate: [staffAccessGuard],
        data: { workspace: 'verification', staffPermissions: ['verification.review_verificationrequest'] },
        loadComponent: () =>
          import('./features/staff/staff-operation-detail.component').then(
            (m) => m.StaffOperationDetailComponent,
          ),
        title: 'Verification review | SurePlace staff',
      },
      {
        path: 'verification',
        canActivate: [staffAccessGuard],
        data: { workspace: 'verification', staffPermissions: ['verification.review_verificationrequest'] },
        loadComponent: () =>
          import('./features/staff/staff-operations.component').then((m) => m.StaffOperationsComponent),
        title: 'Verification queue | SurePlace staff',
      },
      {
        path: 'users/:id',
        canActivate: [staffAccessGuard],
        data: { workspace: 'users', staffPermissions: ['accounts.moderate_user'] },
        loadComponent: () =>
          import('./features/staff/staff-operation-detail.component').then(
            (m) => m.StaffOperationDetailComponent,
          ),
        title: 'User detail | SurePlace staff',
      },
      {
        path: 'users',
        canActivate: [staffAccessGuard],
        data: { workspace: 'users', staffPermissions: ['accounts.moderate_user'] },
        loadComponent: () =>
          import('./features/staff/staff-operations.component').then((m) => m.StaffOperationsComponent),
        title: 'User review | SurePlace staff',
      },
      {
        path: 'access',
        canActivate: [staffAccessGuard],
        data: { staffSuperuser: true },
        loadComponent: () => import('./features/staff/staff-access.component').then((m) => m.StaffAccessComponent),
        title: 'Staff access & roles | SurePlace',
      },
      {
        path: 'no-access',
        loadComponent: () => import('./features/staff/staff-access.component').then((m) => m.StaffAccessDeniedComponent),
        title: 'Limited staff access | SurePlace',
      },
    ],
  },
  { path: 'messages', redirectTo: 'account/messages', pathMatch: 'full' },
  { path: 'bookings', redirectTo: 'account/bookings', pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent),
  },
];

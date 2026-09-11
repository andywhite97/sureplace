import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
const placeholder = () =>
  import('./features/placeholder.component').then((m) => m.PlaceholderComponent);
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
  { path: 'agents', loadComponent: placeholder, data: { title: 'SurePlace agents' } },
  {
    path: 'verification',
    loadComponent: placeholder,
    data: {
      title: 'SurePlace verification',
      message: 'How SurePlace verification helps you understand who you are dealing with.',
    },
  },
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
        loadComponent: () =>
          import('./features/manage/manage-dashboard.component').then(
            (m) => m.ManageDashboardComponent,
          ),
        title: 'Manage listings | SurePlace',
      },
      {
        path: 'manage/listings/new',
        loadComponent: () =>
          import('./features/manage/listing-type-choice.component').then(
            (m) => m.ListingTypeChoiceComponent,
          ),
        title: 'List on SurePlace',
      },
      {
        path: 'manage/properties',
        loadComponent: () =>
          import('./features/manage/property-management-list.component').then(
            (m) => m.PropertyManagementListComponent,
          ),
        title: 'Manage properties | SurePlace',
      },
      {
        path: 'manage/properties/new',
        loadComponent: () =>
          import('./features/manage/property-form.component').then((m) => m.PropertyFormComponent),
        title: 'Add property | SurePlace',
      },
      {
        path: 'manage/properties/:id/edit',
        loadComponent: () =>
          import('./features/manage/property-form.component').then((m) => m.PropertyFormComponent),
        title: 'Edit property | SurePlace',
      },
      {
        path: 'manage/stays',
        loadComponent: () =>
          import('./features/manage/stay-management-list.component').then(
            (m) => m.StayManagementListComponent,
          ),
        title: 'Manage stays | SurePlace',
      },
      {
        path: 'manage/stays/new',
        loadComponent: () =>
          import('./features/manage/stay-form.component').then((m) => m.StayFormComponent),
        title: 'Add stay | SurePlace',
      },
      {
        path: 'manage/stays/:id/edit',
        loadComponent: () =>
          import('./features/manage/stay-form.component').then((m) => m.StayFormComponent),
        title: 'Edit stay | SurePlace',
      },
      {
        path: 'manage/stays/:id/rooms',
        loadComponent: () =>
          import('./features/manage/rooms.component').then((m) => m.RoomsComponent),
        title: 'Manage rooms | SurePlace',
      },
      {
        path: 'manage/stays/:id/calendar',
        loadComponent: () =>
          import('./features/manage/availability-calendar.component').then(
            (m) => m.AvailabilityCalendarComponent,
          ),
        title: 'Availability calendar | SurePlace',
      },
      {
        path: 'manage/viewings',
        loadComponent: () =>
          import('./features/manage/manager-viewings.component').then(
            (m) => m.ManagerViewingsComponent,
          ),
        title: 'Manager viewings | SurePlace',
      },
      {
        path: 'manage/bookings',
        loadComponent: () =>
          import('./features/manage/manager-bookings.component').then(
            (m) => m.ManagerBookingsComponent,
          ),
        title: 'Manager bookings | SurePlace',
      },
      {
        path: 'manage/verification',
        loadComponent: () =>
          import('./features/manage/verification.component').then((m) => m.VerificationComponent),
        title: 'Verification | SurePlace',
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

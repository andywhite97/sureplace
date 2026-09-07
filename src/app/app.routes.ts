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
      { path: '', loadComponent: placeholder, data: { title: 'Account overview' } },
      { path: 'saved', loadComponent: placeholder, data: { title: 'Saved listings' } },
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
      { path: 'viewings', loadComponent: placeholder, data: { title: 'Viewings' } },
      { path: 'bookings', loadComponent: placeholder, data: { title: 'Bookings' } },
      { path: 'alerts', loadComponent: placeholder, data: { title: 'Search alerts' } },
      { path: 'profile', loadComponent: placeholder, data: { title: 'Profile' } },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/auth/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
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

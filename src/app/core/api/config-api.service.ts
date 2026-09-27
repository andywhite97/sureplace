import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of, shareReplay, tap } from 'rxjs';
import { ApiClient } from './api-client';
import { FrontendConfig } from '../models/api.models';

const fallback: FrontendConfig = {
  default_country: 'SZ',
  default_currency: 'SZL',
  supported_currencies: ['SZL'],
  features: {
    properties: true,
    stays: true,
    bookings: true,
    internal_messaging: true,
    registration: true,
  },
  map: { default_latitude: -26.5225, default_longitude: 31.4659, default_zoom: 8 },
  footer: {
    navigation_groups: [
      {
        key: 'explore',
        title: 'Explore',
        order: 1,
        items: [
          { label: 'Properties', route: '/properties', external_url: null, order: 1, is_active: true, opens_in_new_tab: false },
          { label: 'Stays', route: '/stays', external_url: null, order: 2, is_active: true, opens_in_new_tab: false },
          { label: 'Agents', route: '/agents', external_url: null, order: 3, is_active: true, opens_in_new_tab: false },
        ],
      },
      {
        key: 'owners',
        title: 'For Owners',
        order: 2,
        items: [
          { label: 'List a property', route: '/account/manage/properties/new', external_url: null, order: 1, is_active: true, opens_in_new_tab: false },
          { label: 'List a stay', route: '/account/manage/stays/new', external_url: null, order: 2, is_active: true, opens_in_new_tab: false },
        ],
      },
      { key: 'support', title: 'Support', order: 3, items: [
        { label: 'Help Centre', route: '/help', external_url: null, order: 1, is_active: true, opens_in_new_tab: false },
      ] },
      { key: 'company', title: 'Company', order: 4, items: [
        { label: 'About SurePlace', route: '/about', external_url: null, order: 1, is_active: true, opens_in_new_tab: false },
        { label: 'Pricing', route: '/pricing', external_url: null, order: 2, is_active: true, opens_in_new_tab: false },
      ] },
      { key: 'legal', title: 'Legal', order: 5, items: [
        { label: 'Terms', route: '/terms', external_url: null, order: 1, is_active: true, opens_in_new_tab: false },
        { label: 'Privacy', route: '/privacy', external_url: null, order: 2, is_active: true, opens_in_new_tab: false },
        { label: 'Cookies', route: '/cookies', external_url: null, order: 3, is_active: true, opens_in_new_tab: false },
      ] },
    ],
    social_links: [],
    newsletter: { enabled: false },
  },
};

@Injectable({ providedIn: 'root' })
export class ConfigApiService {
  private api = inject(ApiClient);
  private loaded = false;
  private request$ = this.createRequest();
  readonly config = signal(fallback);
  readonly loadFailed = signal(false);

  load() {
    return this.loaded ? of(this.config()) : this.request$;
  }

  refresh() {
    this.loaded = false;
    this.request$ = this.createRequest();
    return this.request$;
  }

  private createRequest() {
    return this.api.get<FrontendConfig>('/config/').pipe(
      tap((value) => {
        this.config.set({ ...fallback, ...value, footer: value.footer ?? fallback.footer });
        this.loaded = true;
        this.loadFailed.set(false);
      }),
      catchError(() => {
        this.loadFailed.set(true);
        this.loaded = true;
        return of(fallback);
      }),
      finalize(() => {
        if (!this.loaded) this.request$ = this.createRequest();
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }
}

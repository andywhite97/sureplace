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
        this.config.set(value);
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

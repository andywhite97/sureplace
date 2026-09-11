import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { forkJoin } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ConfigApiService } from './core/api/config-api.service';
import { ReferenceApiService } from './core/api/reference-api.service';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: false,
      }),
    ),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) return;

      const config = inject(ConfigApiService);
      const reference = inject(ReferenceApiService);
      const auth = inject(AuthService);
      forkJoin([config.load(), reference.load(), auth.restore()]).subscribe();
    }),
  ],
};

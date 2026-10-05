import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

const PING_INTERVAL_MS = 14 * 60 * 1000;
const PING_TIMEOUT_MS = 20 * 1000;

@Injectable({ providedIn: 'root' })
export class BackendKeepAliveService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private intervalId?: number;
  private lastPingAt = 0;
  private pingInProgress = false;

  start(): void {
    if (!environment.production || !isPlatformBrowser(this.platformId) || this.intervalId !== undefined) {
      return;
    }

    const browser = this.document.defaultView;
    if (!browser) return;

    this.zone.runOutsideAngular(() => {
      const pingIfDue = () => {
        if (browser.navigator.onLine && Date.now() - this.lastPingAt >= PING_INTERVAL_MS) {
          void this.ping(browser);
        }
      };

      // Wake the backend when the app opens, then keep it warm while a tab remains open.
      pingIfDue();
      this.intervalId = browser.setInterval(pingIfDue, PING_INTERVAL_MS);
      // Background timers may be throttled; catch up when the tab is used again.
      this.document.addEventListener('visibilitychange', pingIfDue);
      browser.addEventListener('online', pingIfDue);

      this.destroyRef.onDestroy(() => {
        browser.clearInterval(this.intervalId);
        this.document.removeEventListener('visibilitychange', pingIfDue);
        browser.removeEventListener('online', pingIfDue);
      });
    });
  }

  private async ping(browser: Window): Promise<void> {
    if (this.pingInProgress) return;
    this.pingInProgress = true;
    this.lastPingAt = Date.now();

    const controller = new AbortController();
    const timeoutId = browser.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    try {
      await browser.fetch(`${environment.apiBaseUrl}/health/`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });
    } catch {
      // This is a best-effort keep-alive, not a user-visible application request.
    } finally {
      browser.clearTimeout(timeoutId);
      this.pingInProgress = false;
    }
  }
}

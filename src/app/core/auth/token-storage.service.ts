import { isPlatformBrowser } from '@angular/common';
import { Injectable, InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { AuthTokens } from '../models/api.models';

export const NATIVE_TOKEN_PLATFORM = new InjectionToken<boolean>('Native token platform', {
  providedIn: 'root', factory: () => Capacitor.isNativePlatform(),
});
export const SECURE_TOKEN_STORAGE = new InjectionToken<Pick<typeof SecureStorage, 'getItem' | 'setItem' | 'removeItem'>>('Secure token storage', {
  // Do not expose the Capacitor proxy itself to Angular DI: its dynamic
  // ngOnDestroy property looks like a lifecycle hook during SSR teardown.
  providedIn: 'root', factory: () => ({
    getItem: (key) => SecureStorage.getItem(key),
    setItem: (key, value) => SecureStorage.setItem(key, value),
    removeItem: (key) => SecureStorage.removeItem(key),
  }),
});

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private key = 'sureplace.tokens';
  private platformId = inject(PLATFORM_ID);
  private native = inject(NATIVE_TOKEN_PLATFORM);
  private secure = inject(SECURE_TOKEN_STORAGE);
  private tokens: AuthTokens | null = null;
  private persistent = false;
  private ready?: Promise<void>;
  private writes = Promise.resolve();
  private revision = 0;
  private logoutKey = 'sureplace.logout-pending';

  initialize(): void | Promise<void> {
    if (!this.isBrowser() || !this.native) return;
    return this.ready ??= this.loadNative();
  }

  private async loadNative() {
    const revision = this.revision;
    if (localStorage.getItem(this.logoutKey)) {
      this.clearBrowser();
      await this.secure.removeItem(this.key);
      if (revision === this.revision) localStorage.removeItem(this.logoutKey);
      return;
    }
    const stored = this.parse(await this.secure.getItem(this.key));
    // Upgrade existing tester sessions, then remove all plaintext credentials.
    const legacyPersistent = this.parse(localStorage.getItem(this.key));
    const legacySession = this.parse(sessionStorage.getItem(this.key));
    if (revision !== this.revision) return;
    const tokens = stored ?? legacyPersistent ?? legacySession;
    if (!stored && legacyPersistent) {
      await this.enqueue(() => this.secure.setItem(this.key, JSON.stringify(legacyPersistent)));
    }
    this.clearBrowser();
    if (revision !== this.revision) return;
    this.tokens = tokens;
    this.persistent = !!(stored || legacyPersistent);
  }

  read(): AuthTokens | null {
    if (!this.isBrowser()) return null;
    if (this.native) return this.tokens;
    const raw = sessionStorage.getItem(this.key) ?? localStorage.getItem(this.key);
    return this.parse(raw);
  }

  private parse(raw: string | null): AuthTokens | null {
    try {
      const value = raw ? JSON.parse(raw) : null;
      return value && typeof value.access === 'string' && typeof value.refresh === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  write(tokens: AuthTokens, remember = false): void | Promise<void> {
    if (!this.isBrowser()) return;
    if (this.native) {
      const revision = ++this.revision;
      this.tokens = tokens;
      this.persistent = remember;
      this.clearBrowser();
      return this.enqueue(async () => {
        if (remember) await this.secure.setItem(this.key, JSON.stringify(tokens));
        else await this.secure.removeItem(this.key);
        if (revision === this.revision) localStorage.removeItem(this.logoutKey);
      }).catch((error) => {
        if (revision === this.revision) {
          this.tokens = null;
          this.persistent = false;
          // A failed write must never resurrect the previous account on restart.
          localStorage.setItem(this.logoutKey, '1');
        }
        throw error;
      });
    }
    this.clearBrowser();
    (remember ? localStorage : sessionStorage).setItem(this.key, JSON.stringify(tokens));
  }

  clear(): void | Promise<void> {
    if (!this.isBrowser()) return;
    this.clearBrowser();
    if (!this.native) return;
    ++this.revision;
    this.tokens = null;
    this.persistent = false;
    // This non-secret marker prevents session restoration if secure deletion fails.
    localStorage.setItem(this.logoutKey, '1');
    return this.enqueue(async () => {
      await this.secure.removeItem(this.key);
      localStorage.removeItem(this.logoutKey);
    });
  }

  private clearBrowser() {
    sessionStorage.removeItem(this.key);
    localStorage.removeItem(this.key);
  }

  remembered() {
    return this.isBrowser() && (this.native ? this.persistent : localStorage.getItem(this.key) !== null);
  }

  private enqueue(action: () => Promise<void>) {
    const next = this.writes.then(action);
    this.writes = next.catch(() => undefined);
    return next;
  }

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }
}

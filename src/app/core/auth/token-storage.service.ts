import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AuthTokens } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private key = 'sureplace.tokens';
  private platformId = inject(PLATFORM_ID);

  read(): AuthTokens | null {
    if (!this.isBrowser()) return null;
    const raw = sessionStorage.getItem(this.key) ?? localStorage.getItem(this.key);
    try {
      return raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      return null;
    }
  }

  write(tokens: AuthTokens, remember = false) {
    if (!this.isBrowser()) return;
    this.clear();
    (remember ? localStorage : sessionStorage).setItem(this.key, JSON.stringify(tokens));
  }

  clear() {
    if (!this.isBrowser()) return;
    sessionStorage.removeItem(this.key);
    localStorage.removeItem(this.key);
  }

  remembered() {
    return this.isBrowser() && localStorage.getItem(this.key) !== null;
  }

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }
}

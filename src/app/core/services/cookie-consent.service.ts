import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type CookiePreferences = { functional: boolean; analytics: boolean; marketing: boolean };
const KEY = 'sureplace-cookie-preferences';
@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private platform = inject(PLATFORM_ID); private document = inject(DOCUMENT);
  visible = signal(false); managing = signal(false); preferences = signal<CookiePreferences>({ functional:false, analytics:false, marketing:false });
  constructor(){if(isPlatformBrowser(this.platform)){let saved:string|null=null;try{saved=this.document.defaultView?.localStorage?.getItem(KEY)??null;}catch{this.visible.set(true);return;}if(saved){try{this.preferences.set(JSON.parse(saved));}catch{this.visible.set(true)}}else this.visible.set(true)}}
  acceptAll(){this.save({functional:true,analytics:true,marketing:true});}
  essentialOnly(){this.save({functional:false,analytics:false,marketing:false});}
  openPreferences(){this.visible.set(true);this.managing.set(true);} close(){this.visible.set(false);this.managing.set(false);}
  save(value:CookiePreferences){this.preferences.set(value);if(isPlatformBrowser(this.platform)){try{this.document.defaultView?.localStorage?.setItem(KEY,JSON.stringify(value));}catch{/* Continue with in-memory preferences when storage is unavailable. */}}this.close();}
}

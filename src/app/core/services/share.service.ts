import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private document = inject(DOCUMENT);
  private toast = inject(ToastService);

  async open(path: string, title: string, text?: string) {
    const url = new URL(path, environment.frontendOrigin).href;
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ title, text, url });
      else {
        const navigator = this.document.defaultView?.navigator;
        if (navigator?.share) await navigator.share({ title, text, url });
        else if (navigator?.clipboard) {
          await navigator.clipboard.writeText(url);
          this.toast.show('Link copied.', 'success');
        }
      }
    } catch (error) {
      // Dismissing a share sheet is a normal action, not an application failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
}

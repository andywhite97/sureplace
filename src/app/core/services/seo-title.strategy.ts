import { Injectable, inject } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { SeoService } from './seo.service';

export function privateSeoPath(url: string) {
  return (
    /^\/(?:account|staff|messages|bookings|login|register|forgot-password|reset-password|verify-email|agency-invitations)(?:\/|[?#]|$)/.test(
      url,
    ) || /^\/stays\/[^/?#]+\/book(?:\/|[?#]|$)/.test(url)
  );
}

@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private seo = inject(SeoService);
  override updateTitle(snapshot: RouterStateSnapshot) {
    const title = this.buildTitle(snapshot);
    if (privateSeoPath(snapshot.url)) this.seo.privatePage(title || 'SurePlace account');
    // Public components own their metadata, including titles set before NavigationEnd.
    // Applying the route's generic title here would overwrite that listing identity.
  }
}

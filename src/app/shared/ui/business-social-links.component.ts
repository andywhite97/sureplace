import { Component, Input } from '@angular/core';

export interface BusinessSocialLinks {
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  website?: string | null;
}

@Component({
  selector: 'sp-business-social-links',
  standalone: true,
  template: `
    @if (items.length) {
      <section aria-label="Business social accounts" class="business-links">
        <h2>Connect with this business</h2>
        <nav aria-label="External social profiles">
          @for (item of items; track item.label) {
            <a [href]="item.url" target="_blank" rel="noopener noreferrer nofollow ugc">{{ item.label }} ↗</a>
          }
        </nav>
      </section>
    }
  `,
  styles: [`
    .business-links { margin: 1.5rem 0; }
    h2 { margin: 0 0 .75rem; font-size: 1.15rem; }
    nav { display: flex; flex-wrap: wrap; gap: .65rem; }
    a { border: 1px solid #d5e5e7; border-radius: 12px; padding: .7rem .9rem; color: inherit; text-decoration: none; }
    a:hover, a:focus-visible { outline: 2px solid #138d92; outline-offset: 2px; }
  `],
})
export class BusinessSocialLinksComponent {
  @Input() links: BusinessSocialLinks | null = null;

  get items(): Array<{ label: string; url: string }> {
    const values: Array<[string, string | null | undefined, string[]]> = [
      ['Facebook', this.links?.facebook_url, ['facebook.com', 'www.facebook.com', 'm.facebook.com']],
      ['Instagram', this.links?.instagram_url, ['instagram.com', 'www.instagram.com']],
      ['TikTok', this.links?.tiktok_url, ['tiktok.com', 'www.tiktok.com']],
    ];
    return values.flatMap(([label, value, domains]) => {
      if (!value) return [];
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && domains.includes(url.hostname) && !url.username && !url.password && !url.port
          ? [{ label, url: url.href }] : [];
      } catch {
        return [];
      }
    });
  }
}

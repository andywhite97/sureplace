import { Component, computed, input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BusinessLinks, businessUrl, businessPhone } from './business-links';

@Component({
  selector: 'sp-business-links',
  standalone: true,
  template: `@if (links().length) {
    <section aria-label="Business social links">
      <h3>Connect with this business</h3>
      <div>
        @for (link of links(); track link.label) {
          <a [href]="link.url" target="_blank" rel="noopener noreferrer nofollow ugc"
            >{{ link.label }}<span class="sr-only"> (opens in a new window)</span></a
          >
        }
      </div>
    </section>
  }`,
  styles: [
    `
      section {
        margin: 1.5rem 0;
        padding: 1rem;
        border: 1px solid var(--line, #dde6e4);
        border-radius: 16px;
      }
      h3 {
        font-size: 1rem;
        margin: 0 0 0.75rem;
      }
      div {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      a {
        color: var(--teal, #007d74);
        padding: 0.4rem;
        overflow-wrap: anywhere;
      }
      a:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 3px;
      }
    `,
  ],
})
export class BusinessLinksComponent {
  business = input<BusinessLinks | null | undefined>();
  links = computed(() => {
    const value = this.business() || {};
    const result: { label: string; url: string }[] = [];
    for (const [field, label, platform] of [
      ['facebook_url', 'Facebook', 'facebook'],
      ['instagram_url', 'Instagram', 'instagram'],
      ['tiktok_url', 'TikTok', 'tiktok'],
      ['website', 'Website', ''],
    ]) {
      const url = value[field as keyof BusinessLinks];
      if (url && !businessUrl(platform)(new FormControl(url))) result.push({ label, url });
    }
    if (value.whatsapp_number && !businessPhone(new FormControl(value.whatsapp_number)))
      result.push({ label: 'WhatsApp', url: 'https://wa.me/' + value.whatsapp_number.slice(1) });
    return result;
  });
}

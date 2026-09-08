import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  set(title: string, description: string) {
    this.title.setTitle(`${title} | SurePlace`);
    this.meta.updateTag({ name: 'description', content: description });
  }
  setExact(title: string, description: string) {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
  }
  canonical(path: string) {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = new URL(path, this.document.baseURI).href;
  }
  robots(content: string) {
    this.meta.updateTag({ name: 'robots', content });
  }
}

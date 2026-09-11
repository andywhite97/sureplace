import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export type JsonLd = Record<string, unknown> | Record<string, unknown>[];

export interface SeoConfig {
  title: string;
  description: string;
  path?: string;
  canonicalPath?: string;
  robots?: string;
  type?: 'website' | 'article';
  image?: string | null;
  jsonLd?: JsonLd | null;
  exactTitle?: boolean;
}

const SITE_NAME = 'SurePlace';
const DEFAULT_DESCRIPTION =
  'Find property for rent and sale, trusted stays, and verified property professionals across Eswatini.';
const DEFAULT_IMAGE = 'hero-eswatini-home.jpg';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  set(title: string | SeoConfig, description?: string) {
    if (typeof title === 'string') {
      this.apply({ title, description: description || DEFAULT_DESCRIPTION });
      return;
    }
    this.apply(title);
  }

  setExact(title: string, description: string) {
    this.apply({ title, description, exactTitle: true });
  }

  apply(config: SeoConfig) {
    const title = config.exactTitle ? config.title : this.withSiteName(config.title);
    const description = config.description || DEFAULT_DESCRIPTION;
    const canonical = this.absoluteUrl(config.canonicalPath ?? config.path ?? this.currentPath());
    const robots = this.indexingPolicy(config.robots);
    const image = config.image === null ? null : this.absoluteUrl(config.image || environment.defaultSocialImageUrl || DEFAULT_IMAGE);

    this.title.setTitle(title);
    this.setName('description', description);
    this.setName('robots', robots);
    this.setProperty('og:site_name', SITE_NAME);
    this.setProperty('og:locale', 'en_SZ');
    this.setProperty('og:type', config.type || 'website');
    this.setProperty('og:title', title);
    this.setProperty('og:description', description);
    this.setProperty('og:url', canonical);
    this.setName('twitter:card', image ? 'summary_large_image' : 'summary');
    this.setName('twitter:title', title);
    this.setName('twitter:description', description);

    if (image) {
      this.setProperty('og:image', image);
      this.setName('twitter:image', image);
    } else {
      this.removeProperty('og:image');
      this.removeName('twitter:image');
    }

    this.canonical(canonical);
    this.jsonLd(config.jsonLd || null);
  }

  canonical(path: string) {
    const href = this.absoluteUrl(path);
    this.document.querySelectorAll('link[rel="canonical"]').forEach((node) => node.remove());
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', href);
    this.document.head.appendChild(link);
  }

  robots(content: string) {
    this.setName('robots', this.indexingPolicy(content));
  }

  privatePage(title: string, description = 'SurePlace account page.') {
    this.apply({ title, description, robots: 'noindex, nofollow', image: null });
  }

  jsonLd(data: JsonLd | null) {
    this.document
      .querySelectorAll('script[type="application/ld+json"][data-sureplace-jsonld]')
      .forEach((node) => node.remove());
    if (!data) return;
    const cleaned = this.clean(data);
    if (!cleaned) return;
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-sureplace-jsonld', '');
    script.textContent = JSON.stringify(cleaned);
    this.document.head.appendChild(script);
  }

  absoluteUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    const origin = (environment.frontendOrigin || this.document.location.origin).replace(/\/$/, '');
    return new URL(path || '/', `${origin}/`).href;
  }

  private setName(name: string, content: string) {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string) {
    this.meta.updateTag({ property, content });
  }

  private removeName(name: string) {
    this.meta.removeTag(`name="${name}"`);
  }

  private removeProperty(property: string) {
    this.meta.removeTag(`property="${property}"`);
  }

  private withSiteName(title: string) {
    return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  }

  private currentPath() {
    return `${this.document.location.pathname}${this.document.location.search}`;
  }

  private indexingPolicy(value = 'index, follow') {
    return environment.seoAllowIndexing ? value : 'noindex, nofollow';
  }

  private clean(value: unknown): unknown {
    if (Array.isArray(value)) {
      const items = value.map((item) => this.clean(item)).filter((item) => item !== undefined);
      return items.length ? items : undefined;
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, this.clean(item)] as const)
        .filter(([, item]) => item !== undefined && item !== '');
      return entries.length ? Object.fromEntries(entries) : undefined;
    }
    return value === null ? undefined : value;
  }
}

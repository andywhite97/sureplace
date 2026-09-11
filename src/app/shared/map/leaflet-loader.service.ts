import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export type Leaflet = typeof import('leaflet');

@Injectable({ providedIn: 'root' })
export class LeafletLoaderService {
  private platformId = inject(PLATFORM_ID);
  private modulePromise?: Promise<Leaflet>;

  load(): Promise<Leaflet | null> {
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve(null);

    this.modulePromise ??= import('leaflet').then((module) => this.normalize(module));
    return this.modulePromise;
  }

  private normalize(module: Leaflet | { default?: Leaflet }): Leaflet {
    if ('map' in module && typeof module.map === 'function') return module;

    const candidate = (module as { default?: Leaflet }).default;
    if (candidate && typeof candidate.map === 'function') return candidate;

    throw new Error('Leaflet module did not expose a usable map factory.');
  }
}

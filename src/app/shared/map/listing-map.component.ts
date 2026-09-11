import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Leaflet, LeafletLoaderService } from './leaflet-loader.service';
import { MapCoordinate, MapMarker, MapViewportBounds } from './map.models';

type LeafletMap = import('leaflet').Map;
type LeafletLayerGroup = import('leaflet').LayerGroup;
type NormalizedMapMarker = Omit<MapMarker, 'latitude' | 'longitude'> & {
  latitude: number;
  longitude: number;
};

@Component({
  selector: 'sp-listing-map',
  standalone: true,
  template: `<div #canvas class="canvas" aria-label="Map of listing location"></div>
    @if (showSearchArea() && pendingBounds()) {
      <button type="button" class="area" (click)="searchArea()">Search this area</button>
    }`,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 420px;
      }
      .canvas {
        width: 100%;
        height: 100%;
        min-height: inherit;
        background: #dce8e5;
      }
      .area {
        position: absolute;
        z-index: 500;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        border: 0;
        border-radius: 2rem;
        padding: 0.7rem 1rem;
        background: var(--midnight);
        color: #fff;
        font-weight: 800;
        box-shadow: var(--shadow);
        cursor: pointer;
      }
      :host ::ng-deep .price-marker {
        background: var(--midnight);
        color: #fff;
        border: 2px solid #fff;
        border-radius: 1rem;
        padding: 0.22rem 0.5rem;
        width: auto !important;
        height: auto !important;
        font-size: 0.75rem;
        font-weight: 800;
        box-shadow: 0 2px 8px #0003;
      }
      :host ::ng-deep .price-marker.selected {
        background: var(--teal);
      }
    `,
  ],
})
export class ListingMapComponent implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private loader = inject(LeafletLoaderService);
  canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  markers = input<MapMarker[]>([]);
  selectedId = input<string | null>(null);
  center = input<[MapCoordinate, MapCoordinate] | null>(null);
  zoom = input(8);
  showSearchArea = input(false);
  markerSelected = output<string>();
  boundsSelected = output<MapViewportBounds>();
  pendingBounds = signal(false);
  private leaflet?: Leaflet;
  private map?: LeafletMap;
  private layer?: LeafletLayerGroup;
  private resizeObserver?: ResizeObserver;
  private viewReady = false;
  private initQueued = false;
  private initializing = false;
  private destroyed = false;
  private resizeFrame: number | null = null;
  private warnedInvalidCenter = false;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.viewReady = true;
      this.scheduleInitialize();
    });

    effect(() => {
      this.center();
      this.markers();
      this.selectedId();
      this.zoom();

      if (!isPlatformBrowser(this.platformId) || this.destroyed) return;
      this.scheduleInitialize();
      this.syncMap();
    });
  }

  searchArea() {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    this.pendingBounds.set(false);
    this.boundsSelected.emit({
      north: bounds.getNorth().toFixed(5),
      south: bounds.getSouth().toFixed(5),
      east: bounds.getEast().toFixed(5),
      west: bounds.getWest().toFixed(5),
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    if (this.resizeFrame !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.resizeFrame);
    }
    this.map?.remove();
    this.resizeObserver = undefined;
    this.layer = undefined;
    this.map = undefined;
    this.leaflet = undefined;
  }

  private scheduleInitialize() {
    if (
      !isPlatformBrowser(this.platformId) ||
      !this.viewReady ||
      this.destroyed ||
      this.map ||
      this.initQueued ||
      this.initializing ||
      !this.normalizedCenter()
    ) {
      if (this.viewReady) this.warnIfInvalidCenter();
      return;
    }

    this.initQueued = true;
    queueMicrotask(() => {
      if (
        !isPlatformBrowser(this.platformId) ||
        this.destroyed ||
        this.map ||
        this.initializing ||
        !this.normalizedCenter()
      ) {
        this.initQueued = false;
        this.warnIfInvalidCenter();
        return;
      }

      this.onNextFrame(() => void this.initialize());
    });
  }

  private onNextFrame(callback: () => void) {
    if (typeof requestAnimationFrame === 'undefined') {
      callback();
      return;
    }

    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      callback();
    });
  }

  private async initialize() {
    this.initQueued = false;
    if (
      !isPlatformBrowser(this.platformId) ||
      this.destroyed ||
      this.map ||
      this.initializing ||
      !this.normalizedCenter()
    ) {
      this.warnIfInvalidCenter();
      return;
    }

    this.initializing = true;
    try {
      const leaflet = await this.loader.load();
      const center = this.normalizedCenter();
      if (!leaflet || this.destroyed || this.map || !center) {
        this.warnIfInvalidCenter();
        return;
      }

      this.leaflet = leaflet;
      this.layer = leaflet.layerGroup();
      this.map = leaflet
        .map(this.canvas().nativeElement, { zoomControl: true })
        .setView(center, this.zoom());
      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '(c) OpenStreetMap contributors',
          maxZoom: 19,
        })
        .addTo(this.map);
      this.layer.addTo(this.map);
      this.map.on('moveend', () => this.pendingBounds.set(true));
      this.observeSize();
      this.render(this.normalizedMarkers(), this.selectedId());
      this.invalidateSize();
    } finally {
      this.initializing = false;
    }
  }

  private observeSize() {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.invalidateSize());
    this.resizeObserver.observe(this.canvas().nativeElement);
  }

  private invalidateSize() {
    if (!this.map || typeof requestAnimationFrame === 'undefined') return;
    if (this.resizeFrame !== null) return;

    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.map?.invalidateSize();
    });
  }

  private render(items: NormalizedMapMarker[], selected: string | null) {
    if (!this.leaflet || !this.layer) return;

    this.layer.clearLayers();
    for (const item of items) {
      this.leaflet
        .marker([item.latitude, item.longitude], {
          icon: this.leaflet.divIcon({
            className: `price-marker${selected === item.id ? ' selected' : ''}`,
            html: item.label,
            iconAnchor: [22, 12],
          }),
        })
        .bindTooltip(item.title)
        .on('click', () => this.markerSelected.emit(item.id))
        .addTo(this.layer);
    }
  }

  private syncMap() {
    if (!this.map) return;
    const center = this.normalizedCenter();

    if (center) {
      this.map.setView(center, this.zoom(), { animate: false });
    }
    this.render(this.normalizedMarkers(), this.selectedId());
    this.invalidateSize();
  }

  private normalizedCenter(): [number, number] | null {
    const center = this.center();
    if (!center) return null;

    const latitude = this.normalizeCoordinate(center[0]);
    const longitude = this.normalizeCoordinate(center[1]);
    return latitude === null || longitude === null ? null : [latitude, longitude];
  }

  private normalizedMarkers(): NormalizedMapMarker[] {
    return this.markers().flatMap((item) => {
      const latitude = this.normalizeCoordinate(item.latitude);
      const longitude = this.normalizeCoordinate(item.longitude);
      return latitude === null || longitude === null ? [] : [{ ...item, latitude, longitude }];
    });
  }

  private normalizeCoordinate(value: MapCoordinate): number | null {
    if (value === null || value === undefined || value === '') return null;

    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
  }

  private warnIfInvalidCenter() {
    if (this.warnedInvalidCenter || !this.center()) return;

    this.warnedInvalidCenter = true;
    console.warn('SurePlace map was not initialized because the listing coordinates are invalid.', {
      center: this.center(),
    });
  }
}

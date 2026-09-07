import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { MapMarker, MapViewportBounds } from './map.models';
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
        height: 100%;
        min-height: 420px;
      }
      .canvas {
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
export class ListingMapComponent implements AfterViewInit, OnDestroy {
  canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  markers = input<MapMarker[]>([]);
  selectedId = input<string | null>(null);
  center = input.required<[number, number]>();
  zoom = input(8);
  showSearchArea = input(false);
  markerSelected = output<string>();
  boundsSelected = output<MapViewportBounds>();
  pendingBounds = signal(false);
  private map?: L.Map;
  private layer = L.layerGroup();
  constructor() {
    effect(() => {
      const markers = this.markers(),
        selected = this.selectedId();
      if (this.map) this.render(markers, selected);
    });
  }
  ngAfterViewInit() {
    this.map = L.map(this.canvas().nativeElement, { zoomControl: true }).setView(
      this.center(),
      this.zoom(),
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.layer.addTo(this.map);
    this.map.on('moveend', () => this.pendingBounds.set(true));
    this.render(this.markers(), this.selectedId());
    setTimeout(() => this.map?.invalidateSize());
  }
  private render(items: MapMarker[], selected: string | null) {
    this.layer.clearLayers();
    for (const item of items) {
      if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) continue;
      L.marker([item.latitude, item.longitude], {
        icon: L.divIcon({
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
  searchArea() {
    if (!this.map) return;
    const b = this.map.getBounds();
    this.pendingBounds.set(false);
    this.boundsSelected.emit({
      north: b.getNorth().toFixed(5),
      south: b.getSouth().toFixed(5),
      east: b.getEast().toFixed(5),
      west: b.getWest().toFixed(5),
    });
  }
  ngOnDestroy() {
    this.map?.remove();
  }
}

import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ConfigApiService } from '../../core/api/config-api.service';
import { Leaflet, LeafletLoaderService } from '../../shared/map/leaflet-loader.service';

@Component({
  selector: 'sp-location-picker',
  standalone: true,
  template: `<div class="picker">
    <div #canvas class="map" aria-label="Listing location picker"></div>
    <p>Click the map or drag the pin to set the listing location.</p>
  </div>`,
  styles: [
    `
      .picker {
        display: grid;
        gap: 0.45rem;
      }
      .map {
        height: clamp(240px, 32vw, 310px);
        min-height: 240px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #dce8e5;
      }
      p {
        margin: 0;
        color: var(--slate);
        font-size: 0.9rem;
      }
      :host ::ng-deep .sureplace-marker {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
      }
      :host ::ng-deep .sureplace-marker span {
        display: block;
        width: 22px;
        height: 22px;
        border: 3px solid #fff;
        border-radius: 999px 999px 999px 0;
        background: var(--teal);
        box-shadow: 0 8px 20px #152b2a33;
        transform: rotate(-45deg);
      }
      @media (max-width: 640px) {
        .map {
          height: 320px;
          min-height: 300px;
        }
      }
    `,
  ],
})
export class LocationPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  private config = inject(ConfigApiService);
  private loader = inject(LeafletLoaderService);
  canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  latitude = input<number | null | undefined>(null);
  longitude = input<number | null | undefined>(null);
  locationChange = output<{ latitude: number; longitude: number }>();
  private leaflet?: Leaflet;
  private map?: import('leaflet').Map;
  private marker?: import('leaflet').Marker;
  private readonly markerZoom = 15;

  async ngAfterViewInit() {
    const leaflet = await this.loader.load();
    if (!leaflet) return;
    this.leaflet = leaflet;
    const start = this.currentPoint();
    const hasPoint = this.hasCoordinate();
    this.map = this.leaflet
      .map(this.canvas().nativeElement, { zoomControl: true })
      .setView(start, hasPoint ? this.markerZoom : this.config.config().map.default_zoom);
    this.leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '(c) OpenStreetMap contributors',
        maxZoom: 19,
      })
      .addTo(this.map);
    if (hasPoint) this.placeMarker(start);
    this.map.on('click', (event) => this.setPoint(event.latlng.lat, event.latlng.lng, true));
    setTimeout(() => this.map?.invalidateSize());
  }

  ngOnChanges(_: SimpleChanges) {
    if (!this.map) return;
    if (!this.hasCoordinate()) {
      if (this.marker) {
        this.marker.remove();
        this.marker = undefined;
      }
      return;
    }
    const point = this.currentPoint();
    this.placeMarker(point);
    this.map.setView(point, Math.max(this.map.getZoom(), this.markerZoom));
  }

  private currentPoint(): [number, number] {
    const config = this.config.config().map;
    const lat = this.latitude();
    const lng = this.longitude();
    return [
      Number.isFinite(lat) ? Number(lat) : config.default_latitude,
      Number.isFinite(lng) ? Number(lng) : config.default_longitude,
    ];
  }

  private hasCoordinate() {
    const lat = this.latitude();
    const lng = this.longitude();
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  private setPoint(latitude: number, longitude: number, emit: boolean) {
    const point: [number, number] = [latitude, longitude];
    this.placeMarker(point);
    this.map?.setView(point, Math.max(this.map.getZoom(), this.markerZoom));
    if (emit) this.locationChange.emit({ latitude, longitude });
  }

  private placeMarker(point: [number, number]) {
    if (!this.leaflet || !this.map) return;
    if (!this.marker) {
      this.marker = this.leaflet
        .marker(point, { draggable: true, icon: this.markerIcon() })
        .addTo(this.map);
      this.marker.on('dragend', () => {
        const moved = this.marker?.getLatLng();
        if (moved) this.setPoint(moved.lat, moved.lng, true);
      });
      return;
    }
    this.marker.setLatLng(point);
  }

  private markerIcon() {
    return this.leaflet!.divIcon({
      className: 'sureplace-marker',
      html: '<span></span>',
      iconSize: [30, 30],
      iconAnchor: [15, 28],
    });
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}

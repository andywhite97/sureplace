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

type Leaflet = typeof import('leaflet');

@Component({
  selector: 'sp-location-picker',
  standalone: true,
  template: `<div class="picker">
    <div #canvas class="map" aria-label="Listing location picker"></div>
    <p>Click the map or drag the pin to set the listing location.</p>
  </div>`,
  styles: [
    `.picker{display:grid;gap:.45rem}.map{min-height:320px;border:1px solid var(--line);border-radius:var(--radius-sm);background:#dce8e5}p{margin:0;color:var(--slate);font-size:.9rem}`,
  ],
})
export class LocationPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  private config = inject(ConfigApiService);
  canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  latitude = input<number | null | undefined>(null);
  longitude = input<number | null | undefined>(null);
  locationChange = output<{ latitude: number; longitude: number }>();
  private leaflet?: Leaflet;
  private map?: import('leaflet').Map;
  private marker?: import('leaflet').Marker;

  async ngAfterViewInit() {
    this.leaflet = await import('leaflet');
    const start = this.currentPoint();
    this.map = this.leaflet.map(this.canvas().nativeElement, { zoomControl: true }).setView(start, this.config.config().map.default_zoom);
    this.leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '(c) OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.marker = this.leaflet.marker(start, { draggable: true }).addTo(this.map);
    this.map.on('click', (event) => this.setPoint(event.latlng.lat, event.latlng.lng, true));
    this.marker.on('dragend', () => {
      const point = this.marker?.getLatLng();
      if (point) this.setPoint(point.lat, point.lng, true);
    });
    setTimeout(() => this.map?.invalidateSize());
  }

  ngOnChanges(_: SimpleChanges) {
    if (!this.map || !this.marker) return;
    const point = this.currentPoint();
    this.marker.setLatLng(point);
    this.map.panTo(point);
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

  private setPoint(latitude: number, longitude: number, emit: boolean) {
    const point: [number, number] = [latitude, longitude];
    this.marker?.setLatLng(point);
    if (emit) this.locationChange.emit({ latitude, longitude });
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}

export type MapCoordinate = number | string | null | undefined;

export interface MapMarker {
  id: string;
  latitude: MapCoordinate;
  longitude: MapCoordinate;
  label: string;
  title: string;
}

export interface MapViewportBounds {
  north: string;
  south: string;
  east: string;
  west: string;
}

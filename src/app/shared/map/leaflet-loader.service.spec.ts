import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Leaflet, LeafletLoaderService } from './leaflet-loader.service';

describe('LeafletLoaderService', () => {
  it('normalizes browser bundler default interop shape', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const service = TestBed.inject(LeafletLoaderService);
    const leaflet = createLeaflet();
    const normalize = service['normalize'].bind(service) as (module: {
      default?: Leaflet;
    }) => Leaflet;

    expect(normalize({ default: leaflet })).toBe(leaflet);
  });
});

function createLeaflet() {
  return {
    map: vi.fn(),
  } as unknown as Leaflet;
}

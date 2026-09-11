import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ListingMapComponent } from './listing-map.component';
import { LeafletLoaderService } from './leaflet-loader.service';
import { MapMarker } from './map.models';

describe('ListingMapComponent', () => {
  const marker: MapMarker = {
    id: 'listing-1',
    latitude: -26.5,
    longitude: 31.4,
    label: 'E8,500',
    title: 'Mbabane home',
  };

  let loader: { load: ReturnType<typeof vi.fn> };
  let leaflet: ReturnType<typeof createLeaflet>;
  let resizeCallback: ResizeObserverCallback | null;
  let originalResizeObserver: typeof ResizeObserver | undefined;
  let originalRequestAnimationFrame: typeof requestAnimationFrame;
  let originalCancelAnimationFrame: typeof cancelAnimationFrame;

  beforeEach(() => {
    leaflet = createLeaflet();
    loader = { load: vi.fn().mockResolvedValue(leaflet) };
    resizeCallback = null;
    originalResizeObserver = globalThis.ResizeObserver;
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    } as never;
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0)) as never;
    globalThis.cancelAnimationFrame = ((handle: number) => window.clearTimeout(handle)) as never;
    TestBed.configureTestingModule({
      imports: [ListingMapComponent],
      providers: [{ provide: LeafletLoaderService, useValue: loader }],
    });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver as never;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('does not import or initialize Leaflet on the server', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const fixture = TestBed.createComponent(ListingMapComponent);
    fixture.componentRef.setInput('center', [-26.5, 31.4]);
    fixture.detectChanges();
    await flushMapInit(fixture);

    expect(loader.load).not.toHaveBeenCalled();
    expect(leaflet.map).not.toHaveBeenCalled();
  });

  it('initializes Leaflet after render in the browser', async () => {
    const fixture = TestBed.createComponent(ListingMapComponent);
    fixture.componentRef.setInput('center', [-26.5, 31.4]);
    fixture.componentRef.setInput('markers', [marker]);
    fixture.detectChanges();
    await flushMapInit(fixture);

    expect(loader.load).toHaveBeenCalledOnce();
    expect(leaflet.map).toHaveBeenCalledOnce();
    expect(leaflet.tileLayer).toHaveBeenCalledWith(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      expect.objectContaining({ maxZoom: 19 }),
    );
    expect(leaflet.marker).toHaveBeenCalledWith(
      [marker.latitude, marker.longitude],
      expect.objectContaining({ icon: expect.anything() }),
    );
    expect(leaflet.fakeMap.invalidateSize).toHaveBeenCalled();
  });

  it('waits for a valid center before initializing', async () => {
    const fixture = TestBed.createComponent(ListingMapComponent);
    fixture.componentRef.setInput('center', [Number.NaN, Number.NaN]);
    fixture.detectChanges();
    await flushMapInit(fixture);

    expect(loader.load).not.toHaveBeenCalled();

    fixture.componentRef.setInput('center', [-26.5, 31.4]);
    fixture.detectChanges();
    await flushMapInit(fixture);

    expect(loader.load).toHaveBeenCalledOnce();
    expect(leaflet.map).toHaveBeenCalledOnce();
  });

  it('normalizes string coordinates before initializing and rendering markers', async () => {
    const fixture = TestBed.createComponent(ListingMapComponent);
    fixture.componentRef.setInput('center', ['-26.5', '31.4']);
    fixture.componentRef.setInput('markers', [
      { ...marker, latitude: '-26.5', longitude: '31.4' },
      { ...marker, id: 'bad-point', latitude: null, longitude: '31.4' },
    ]);
    fixture.detectChanges();
    await flushMapInit(fixture);

    expect(loader.load).toHaveBeenCalledOnce();
    expect(leaflet.map).toHaveBeenCalledOnce();
    expect(leaflet.fakeMap.setView).toHaveBeenCalledWith([-26.5, 31.4], 8);
    expect(leaflet.marker).toHaveBeenCalledOnce();
    expect(leaflet.marker).toHaveBeenCalledWith(
      [-26.5, 31.4],
      expect.objectContaining({ icon: expect.anything() }),
    );
  });

  it('updates markers and invalidates size without double initialization', async () => {
    const fixture = TestBed.createComponent(ListingMapComponent);
    fixture.componentRef.setInput('center', [-26.5, 31.4]);
    fixture.componentRef.setInput('markers', [marker]);
    fixture.detectChanges();
    await flushMapInit(fixture);

    fixture.componentRef.setInput('markers', [{ ...marker, id: 'listing-2', label: 'E9,000' }]);
    fixture.detectChanges();
    resizeCallback?.([], {} as ResizeObserver);

    expect(loader.load).toHaveBeenCalledOnce();
    expect(leaflet.map).toHaveBeenCalledOnce();
    expect(leaflet.fakeLayer.clearLayers).toHaveBeenCalled();
    expect(leaflet.fakeMap.invalidateSize).toHaveBeenCalled();
  });

  it('removes the map and clears observers on destroy', async () => {
    const fixture = TestBed.createComponent(ListingMapComponent);
    fixture.componentRef.setInput('center', [-26.5, 31.4]);
    fixture.detectChanges();
    await flushMapInit(fixture);

    fixture.destroy();

    expect(leaflet.fakeMap.remove).toHaveBeenCalled();
  });
});

async function flushMapInit(fixture: { whenStable: () => Promise<unknown> }) {
  await fixture.whenStable();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createLeaflet() {
  const fakeLayer = {
    addTo: vi.fn(),
    clearLayers: vi.fn(),
  };
  const fakeMap = {
    setView: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    getBounds: vi.fn(() => ({
      getNorth: () => -26,
      getSouth: () => -27,
      getEast: () => 32,
      getWest: () => 31,
    })),
  };
  const markerChain = {
    bindTooltip: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
  };
  const tileLayerChain = {
    addTo: vi.fn().mockReturnThis(),
  };

  return {
    fakeLayer,
    fakeMap,
    layerGroup: vi.fn(() => fakeLayer),
    map: vi.fn(() => fakeMap),
    tileLayer: vi.fn(() => tileLayerChain),
    divIcon: vi.fn((options) => options),
    marker: vi.fn(() => markerChain),
  };
}

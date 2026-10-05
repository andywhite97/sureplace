import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, ViewTransitionInfo } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PageMotionService } from './page-motion.service';

describe('PageMotionService', () => {
  let reduced: boolean;
  let phone: boolean;
  const router = {
    url: '/properties',
    currentNavigation: () => ({ finalUrl: '/properties/home', trigger: 'imperative' }),
    serializeUrl: (url: unknown) => String(url),
  };
  const createTransition = () => {
    let finish!: () => void;
    const transition = { skipTransition: vi.fn(), finished: new Promise<void>((resolve) => { finish = resolve; }) };
    return { transition, finish, info: { transition } as unknown as ViewTransitionInfo };
  };
  beforeEach(() => {
    reduced = false;
    phone = true;
    router.url = '/properties';
    router.currentNavigation = () => ({ finalUrl: '/properties/home', trigger: 'imperative' });
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: router },
      { provide: DOCUMENT, useValue: {
        documentElement: document.documentElement,
        defaultView: { matchMedia: (query: string) => ({ matches: query.includes('reduced-motion') ? reduced : phone }) },
      } },
    ] });
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-page-motion');
    vi.restoreAllMocks();
  });
  it('slides into details and cleans up when the animation ends', async () => {
    const t = createTransition();
    TestBed.inject(PageMotionService).created(t.info);
    expect(document.documentElement.getAttribute('data-page-motion')).toBe('forward');
    t.finish();
    await t.transition.finished;
    expect(document.documentElement.hasAttribute('data-page-motion')).toBe(false);
  });
  it('reverses motion for native/browser history back', () => {
    router.url = '/properties/home';
    router.currentNavigation = () => ({ finalUrl: '/properties', trigger: 'popstate' });
    TestBed.inject(PageMotionService).created(createTransition().info);
    expect(document.documentElement.getAttribute('data-page-motion')).toBe('back');
  });
  it('reverses motion for a detail screen back link', () => {
    router.url = '/properties/home';
    router.currentNavigation = () => ({ finalUrl: '/properties', trigger: 'imperative' });
    TestBed.inject(PageMotionService).created(createTransition().info);
    expect(document.documentElement.getAttribute('data-page-motion')).toBe('back');
  });
  it('uses a fade when switching peer tabs', () => {
    router.currentNavigation = () => ({ finalUrl: '/stays', trigger: 'imperative' });
    TestBed.inject(PageMotionService).created(createTransition().info);
    expect(document.documentElement.getAttribute('data-page-motion')).toBe('tab');
  });
  it('skips filters and anchor changes on the same page', () => {
    router.currentNavigation = () => ({ finalUrl: '/properties?town=Mbabane#results', trigger: 'imperative' });
    const t = createTransition();
    TestBed.inject(PageMotionService).created(t.info);
    expect(t.transition.skipTransition).toHaveBeenCalled();
  });
  it('respects reduced motion and desktop preview preferences', () => {
    const service = TestBed.inject(PageMotionService);
    reduced = true;
    const first = createTransition();
    service.created(first.info);
    expect(first.transition.skipTransition).toHaveBeenCalled();
    reduced = false;
    phone = false;
    const second = createTransition();
    service.created(second.info);
    expect(second.transition.skipTransition).toHaveBeenCalled();
  });
  it('does not let an earlier animation clean up a newer one', async () => {
    const service = TestBed.inject(PageMotionService);
    const first = createTransition(), second = createTransition();
    service.created(first.info);
    router.url = '/properties/home';
    router.currentNavigation = () => ({ finalUrl: '/properties', trigger: 'popstate' });
    service.created(second.info);
    first.finish();
    await first.transition.finished;
    expect(document.documentElement.getAttribute('data-page-motion')).toBe('back');
    second.finish();
    await second.transition.finished;
    expect(document.documentElement.hasAttribute('data-page-motion')).toBe(false);
  });
});

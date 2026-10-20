import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MOBILE_INTRO_KEY, MOBILE_INTRO_NATIVE, MobileIntroService } from '../../core/services/mobile-intro.service';
import { MobileIntroComponent } from './mobile-intro.component';

describe('Mobile first-launch introduction', () => {
  function setup(native = true, completed = false, blocked = false) {
    const storage = {
      getItem: vi.fn(() => { if (blocked) throw new Error('Storage unavailable'); return completed ? 'complete' : null; }),
      setItem: vi.fn(() => { if (blocked) throw new Error('Storage unavailable'); }),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: MOBILE_INTRO_NATIVE, useValue: native },
      { provide: DOCUMENT, useValue: { defaultView: { localStorage: storage } } },
    ] });
    return { service: TestBed.inject(MobileIntroService), storage };
  }
  it('shows on a new native installation', () => {
    const { service } = setup();
    expect(service.visible()).toBe(true);
    expect(service.step()).toBe(0);
  });
  it('does not show on the website or after completion', () => {
    expect(setup(false).service.visible()).toBe(false);
    TestBed.resetTestingModule();
    expect(setup(true, true).service.visible()).toBe(false);
  });
  it('persists skip/completion independently from authentication', () => {
    const { service, storage } = setup();
    service.finish();
    expect(storage.setItem).toHaveBeenCalledWith(MOBILE_INTRO_KEY, 'complete');
    expect(service.visible()).toBe(false);
  });
  it('allows entry even when persistence is unavailable', () => {
    const { service } = setup(true, false, true);
    expect(() => service.finish()).not.toThrow();
    expect(service.visible()).toBe(false);
  });
  it('handles Android back within the tour and supports replay', () => {
    const { service } = setup();
    service.step.set(2);
    expect(service.back()).toBe(true);
    expect(service.step()).toBe(1);
    service.step.set(0);
    service.back();
    expect(service.visible()).toBe(false);
    expect(service.back()).toBe(false);
    service.replay();
    expect(service.visible()).toBe(true);
    expect(service.step()).toBe(0);
  });
  it('takes users through all four services before finishing', () => {
    const intro = { step: signal(0), finish: vi.fn(), back: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: MobileIntroService, useValue: intro }] });
    const fixture = TestBed.createComponent(MobileIntroComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your next place starts here');
    for (let i = 0; i < 3; i++) fixture.componentInstance.next();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Explore SurePlace');
    expect(fixture.nativeElement.textContent).toContain('Step 4 of 4');
    fixture.componentInstance.next();
    expect(intro.finish).toHaveBeenCalledOnce();
  });
  it('offers an accessible skip action on the first screen', () => {
    const intro = { step: signal(0), finish: vi.fn(), back: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: MobileIntroService, useValue: intro }] });
    const fixture = TestBed.createComponent(MobileIntroComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Skip introduction"]').click();
    expect(intro.finish).toHaveBeenCalledOnce();
  });
});

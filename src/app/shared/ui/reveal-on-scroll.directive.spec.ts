import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

@Component({
  standalone: true,
  imports: [RevealOnScrollDirective],
  template: `<section spRevealOnScroll>Demo section</section>`,
})
class HostComponent {}

describe('RevealOnScrollDirective', () => {
  let callback: IntersectionObserverCallback;
  const disconnect = vi.fn();
  const observe = vi.fn();
  const originalObserver = globalThis.IntersectionObserver;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    callback = vi.fn();
    disconnect.mockClear();
    observe.mockClear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    const observerMock = vi.fn().mockImplementation(function (cb: IntersectionObserverCallback) {
      callback = cb;
      return { disconnect, observe };
    }) as never;
    globalThis.IntersectionObserver = observerMock;
    window.IntersectionObserver = observerMock;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalObserver;
    window.IntersectionObserver = originalObserver;
    window.matchMedia = originalMatchMedia;
  });

  it('reveals once when the host enters the viewport', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    const directive = fixture.debugElement
      .query(By.directive(RevealOnScrollDirective))
      .injector.get(RevealOnScrollDirective);
    expect(section.classList.contains('motion-reveal')).toBe(true);
    expect(directive.visible).toBe(false);
    expect(observe).toHaveBeenCalledWith(section);

    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(directive.visible).toBe(true);
    expect(disconnect).toHaveBeenCalledTimes(1);

    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('does not create an observer when reduced motion is requested', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;

    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const directive = fixture.debugElement
      .query(By.directive(RevealOnScrollDirective))
      .injector.get(RevealOnScrollDirective);

    expect(directive.visible).toBe(true);
    expect(globalThis.IntersectionObserver).not.toHaveBeenCalled();
  });
});

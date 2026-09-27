import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { ConfigApiService } from '../core/api/config-api.service';
import { ListingEntryService } from '../core/services/listing-entry.service';

const config = {
  config: signal({
    footer: {
      navigation_groups: [
        {
          key: 'explore',
          title: 'Explore',
          order: 1,
          items: [
            { label: 'Properties', route: '/properties', external_url: null, order: 2, is_active: true, opens_in_new_tab: false },
            { label: 'External', route: null, external_url: 'https://example.com', order: 1, is_active: true, opens_in_new_tab: true },
            { label: 'Hidden', route: '/hidden', external_url: null, order: 3, is_active: false, opens_in_new_tab: false },
          ],
        },
        { key: 'empty', title: 'Empty', order: 2, items: [] },
      ],
      social_links: [
        { platform: 'facebook', url: 'https://facebook.com/sureplace', is_active: true, opens_in_new_tab: true },
        { platform: 'unknown', url: 'https://example.com/unknown', is_active: true, opens_in_new_tab: true },
        { platform: 'instagram', url: 'https://instagram.com/sureplace', is_active: false, opens_in_new_tab: true },
      ],
      newsletter: { enabled: false },
    },
  }),
  load: vi.fn(() => of(undefined)),
};

const listingEntry = {
  propertyRoute: '/account/manage/properties/new',
  stayRoute: '/account/manage/stays/new',
  startPropertyListing: vi.fn(),
  startStayListing: vi.fn(),
};

describe('FooterComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        provideRouter([]),
        { provide: ConfigApiService, useValue: config },
        { provide: ListingEntryService, useValue: listingEntry },
      ],
    });
  });

  it('renders active ordered links and skips empty, inactive, or placeholder groups', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const footer = fixture.nativeElement as HTMLElement;

    expect(footer.textContent).toContain('Explore');
    expect(footer.textContent).toContain('Properties');
    expect(footer.textContent).toContain('External');
    expect(footer.textContent).not.toContain('Hidden');
    expect(footer.textContent).not.toContain('Empty');
    expect(footer.querySelector('a[href="https://example.com"]')?.getAttribute('target')).toBe('_blank');
    expect(footer.querySelector('a[href="https://example.com"]')?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not render placeholder About and Help links that point to the homepage', () => {
    const footerConfig = config.config();
    config.config.set({
      ...footerConfig,
      footer: {
        ...footerConfig.footer,
        navigation_groups: [
          {
            key: 'support',
            title: 'Support',
            order: 1,
            items: [
              { label: 'Help', route: '/', external_url: null, order: 1, is_active: true, opens_in_new_tab: false },
              { label: 'About', route: '/', external_url: null, order: 2, is_active: true, opens_in_new_tab: false },
            ],
          },
        ],
      },
    });
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.footer-group').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Help');
    expect(fixture.nativeElement.textContent).not.toContain('About');
    config.config.set(footerConfig);
  });

  it('renders only supported social platforms', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.social-links a').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.social-links i')?.className).toContain('fa-facebook-f');
  });

  it('keeps one mobile accordion open at a time', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.toggleGroup('explore');
    expect(component.openGroup()).toBe('explore');
    component.toggleGroup('another');
    expect(component.openGroup()).toBe('another');
    component.toggleGroup('another');
    expect(component.openGroup()).toBeNull();
  });

  it('does not render newsletter UI when disabled', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.newsletter')).toBeNull();
  });

  it('uses the shared listing-entry service for property and stay CTAs', () => {
    const footerConfig = config.config();
    config.config.set({
      ...footerConfig,
      footer: {
        ...footerConfig.footer,
        navigation_groups: [
          {
            key: 'owners',
            title: 'For Owners',
            order: 1,
            items: [
              { label: 'List a property', route: listingEntry.propertyRoute, external_url: null, order: 1, is_active: true, opens_in_new_tab: false },
              { label: 'List a stay', route: listingEntry.stayRoute, external_url: null, order: 2, is_active: true, opens_in_new_tab: false },
            ],
          },
        ],
      },
    });
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.group-links button',
    );

    buttons[0].click();
    buttons[1].click();

    expect(listingEntry.startPropertyListing).toHaveBeenCalledOnce();
    expect(listingEntry.startStayListing).toHaveBeenCalledOnce();
    config.config.set(footerConfig);
  });
});

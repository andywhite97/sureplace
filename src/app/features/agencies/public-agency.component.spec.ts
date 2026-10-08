import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicAgencyComponent } from './public-agency.component';

describe('PublicAgencyComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PublicAgencyComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'lusito-estates' })) },
        },
      ],
    });
  });

  it('loads a public agency by slug and links its published listings', () => {
    const fixture = TestBed.createComponent(PublicAgencyComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/public-agencies/lusito-estates/')
      .flush({
        agency: {
          id: 'agency-1',
          name: 'Lusito Estates',
          slug: 'lusito-estates',
          logo: null,
          description: 'Local specialists',
          town: 'Mbabane',
          region: 'Hhohho',
          suburb: '',
          phone: '',
          email: '',
          website: '',
          verification_status: 'VERIFIED',
        },
        property_count: 1,
        stay_count: 1,
        properties: [
          {
            slug: 'open-house',
            title: 'Open house',
            town: 'Mbabane',
            price: '900000.00',
            currency: 'SZL',
            cover_image: null,
          },
        ],
        stays: [{ slug: 'open-stay', name: 'Open stay', town: 'Mbabane', cover_image: null }],
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Lusito Estates');
    expect(fixture.nativeElement.querySelector('a[href="/properties/open-house"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/stays/open-stay"]')).toBeTruthy();
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toContain(
      'Lusito Estates',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'http://localhost:4200/agencies/lusito-estates',
    );
    expect(document.querySelector('script[data-sureplace-jsonld]')?.textContent).toContain(
      'RealEstateAgent',
    );
  });
});

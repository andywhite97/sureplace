import { MobileIntroService } from '../../core/services/mobile-intro.service';
import { SuriGuideComponent } from '../../shared/ui/suri-guide.component';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

type HelpCategory =
  | 'Getting started'
  | 'Finding a place'
  | 'Stays & bookings'
  | 'Listing with SurePlace'
  | 'Account & safety';
type HelpArticle = {
  title: string;
  category: HelpCategory;
  summary: string;
  steps: string[];
  keywords: string;
  link?: { label: string; path: string };
};

const CATEGORIES: { name: HelpCategory; icon: string; description: string }[] = [
  {
    name: 'Getting started',
    icon: 'fa-solid fa-compass',
    description: 'Accounts, email and your profile',
  },
  { name: 'Finding a place', icon: 'fa-solid fa-house', description: 'Search, save and contact' },
  {
    name: 'Stays & bookings',
    icon: 'fa-solid fa-bed',
    description: 'Find a stay and request dates',
  },
  {
    name: 'Listing with SurePlace',
    icon: 'fa-solid fa-building',
    description: 'Create, manage and verify listings',
  },
  {
    name: 'Account & safety',
    icon: 'fa-solid fa-shield-halved',
    description: 'Security and safer decisions',
  },
];

const ARTICLES: HelpArticle[] = [
  {
    title: 'Create your SurePlace account',
    category: 'Getting started',
    summary: 'Sign up to save listings, message providers and manage your own listings.',
    keywords: 'register sign up account create',
    steps: [
      'Choose Sign up and enter your details using an email address you can access.',
      'Follow the verification link sent to your inbox. Check junk mail if it does not arrive.',
      'Return to SurePlace and sign in. Some actions require a verified email or additional account details.',
    ],
    link: { label: 'Create an account', path: '/register' },
  },
  {
    title: 'I did not receive my verification email',
    category: 'Getting started',
    summary: 'Check the address you registered with and request another verification email.',
    keywords: 'email verify resend confirmation inbox',
    steps: [
      'Check your spam or junk folder and search for “SurePlace”.',
      'Make sure you are checking the same email address you entered during registration.',
      'Open the verification help from the sign-in screen to request another email. If the address is incorrect, contact support through the available account channels.',
    ],
    link: { label: 'Go to sign in', path: '/login' },
  },
  {
    title: 'Search property listings',
    category: 'Finding a place',
    summary: 'Narrow properties by location and the details that matter to you.',
    keywords: 'search property buy rent filters location price bedrooms',
    steps: [
      'Open Properties and enter a location or adjust the available search filters.',
      'Open a result to review its description, price, location, photos and contact details.',
      'Listing information is supplied by its owner or agent. Confirm important details directly before making a decision.',
    ],
    link: { label: 'Browse properties', path: '/properties' },
  },
  {
    title: 'Find a place to stay',
    category: 'Finding a place',
    summary: 'Browse accommodation and review a stay’s details before requesting a booking.',
    keywords: 'stay accommodation hotel holiday search',
    steps: [
      'Open Stays and search for accommodation that suits your trip.',
      'Review the stay, room details, dates and displayed price on the stay page.',
      'Availability and booking details can change. Check the current information before sending a request.',
    ],
    link: { label: 'Browse stays', path: '/stays' },
  },
  {
    title: 'Save a property or stay',
    category: 'Finding a place',
    summary: 'Keep interesting listings handy in your saved items.',
    keywords: 'favorite bookmark saved shortlist heart',
    steps: [
      'Sign in to your SurePlace account.',
      'Use the save or favourite control on a listing card or detail page.',
      'Return to Saved in your account to see items you have saved.',
    ],
    link: { label: 'Sign in', path: '/login' },
  },
  {
    title: 'Contact an owner or agent safely',
    category: 'Finding a place',
    summary: 'Use the contact options on the listing and verify details before committing.',
    keywords: 'message contact agent owner scam fraud report',
    steps: [
      'Open the property or stay and use the contact options shown on that listing.',
      'Ask questions, arrange a viewing where appropriate, and keep written communication for reference.',
      'Never rely on a badge alone or send money before independently confirming the listing, provider and terms. SurePlace verification is not a guarantee of a transaction.',
    ],
    link: { label: 'Learn about verification', path: '/verification' },
  },
  {
    title: 'Request a booking for a stay',
    category: 'Stays & bookings',
    summary: 'Choose an available room and dates, then send the host a booking request.',
    keywords: 'booking reserve dates room request price payment',
    steps: [
      'On a stay page, select a room and dates with availability.',
      'Review the dates, nightly prices and total shown before continuing.',
      'Sign in and submit the guest details to send your request. A request is not a confirmed reservation; check its status in your account and follow up with the host if needed.',
      'SurePlace does not take payment at this stage. Confirm payment arrangements and terms directly with the provider.',
    ],
    link: { label: 'View your bookings', path: '/account/bookings' },
  },
  {
    title: 'Where can I see my booking request?',
    category: 'Stays & bookings',
    summary: 'Check the status and details of booking requests from your account.',
    keywords: 'booking status confirmation pending host',
    steps: [
      'Sign in using the account used to make the request.',
      'Open Bookings from your account to review the request and its current status.',
      'Use the conversation associated with the booking, when available, to communicate with the host.',
    ],
    link: { label: 'Open bookings', path: '/account/bookings' },
  },
  {
    title: 'Create a property listing',
    category: 'Listing with SurePlace',
    summary: 'Start a property draft, add its details and photos, then submit it for review.',
    keywords: 'list property create listing owner sell rent submit review',
    steps: [
      'Sign in and open Manage Properties, then choose to create a property.',
      'Complete the required information including property type, sale or rental details, location and price.',
      'Add photos. The property form requires listing details and at least one uploaded photo before submission.',
      'Review your information, confirm it is accurate and submit the listing for review.',
    ],
    link: { label: 'Manage properties', path: '/account/manage/properties' },
  },
  {
    title: 'Create a stay listing',
    category: 'Listing with SurePlace',
    summary: 'Set up accommodation details and rooms, then submit the stay for review.',
    keywords: 'host stay accommodation create room listing submit review',
    steps: [
      'Sign in and open Manage Stays to start a stay listing.',
      'Add the accommodation details, contact information and at least one room with its availability and pricing information.',
      'Review the listing and confirm the details before submitting it for review.',
      'You can return to Manage Stays to continue working on your listings.',
    ],
    link: { label: 'Manage stays', path: '/account/manage/stays' },
  },
  {
    title: 'Understand verification badges',
    category: 'Listing with SurePlace',
    summary:
      'Badges indicate evidence reviewed by SurePlace; they are useful signals, not guarantees.',
    keywords: 'verification verified identity agency property documents badge',
    steps: [
      'Read the verification information to understand the kinds of checks represented by badges.',
      'For your own verification, open the verification area in your account and follow the requirements shown for your request.',
      'If a request needs changes, read the staff note, update the information or documents, and submit again.',
      'Always do your own checks before a transaction; a badge does not guarantee a person, property, stay or outcome.',
    ],
    link: { label: 'How verification works', path: '/verification' },
  },
  {
    title: 'Change your password or recover access',
    category: 'Account & safety',
    summary: 'Use the password reset flow if you cannot sign in.',
    keywords: 'password forgot reset login locked access security',
    steps: [
      'Choose Forgot password on the sign-in page.',
      'Enter your account email and check your inbox for the reset instructions.',
      'Use the link to choose a new password. Choose a unique password and do not share it.',
    ],
    link: { label: 'Reset password', path: '/forgot-password' },
  },
  {
    title: 'Manage messages and account details',
    category: 'Account & safety',
    summary: 'Use your account workspace to review conversations and keep your profile current.',
    keywords: 'message inbox profile settings details account contact',
    steps: [
      'Sign in and open Messages to review your conversations.',
      'Open Profile or Settings in your account to review available personal and security options.',
      'Keep your contact information current so people can reach you about your enquiries or listings.',
    ],
    link: { label: 'Open your account', path: '/account' },
  },
];

@Component({
  selector: 'sp-help-centre',
  standalone: true,
  imports: [SuriGuideComponent, RouterLink],
  template: `
    <main class="help-page">
      <section class="help-hero" aria-labelledby="help-title">
        <img src="/hero-eswatini-home.jpg" alt="Homes and landscape in Eswatini" />
        <div class="help-hero-shade"></div>
        <div class="help-hero-content">
          <sp-suri-guide
            class="help-suri"
            size="small"
            variant="support"
            pose="support"
            message="I’m here to help you find your way."
          />
          <p class="eyebrow">SUREPLACE SUPPORT</p>
          <h1 id="help-title">How can we help?</h1>
          <p class="help-hero-copy">
            Find answers about properties, stays, bookings and your SurePlace account.
          </p>
          <form class="help-search" role="search" (submit)="$event.preventDefault()">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              #searchBox
              type="search"
              [value]="query()"
              (input)="query.set(searchBox.value)"
              placeholder="Search for help..."
              aria-label="Search help articles"
            />
            @if (query()) {
              <button
                type="button"
                aria-label="Clear search"
                (click)="query.set(''); searchBox.focus()"
              >
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            }
          </form>
          <p class="help-search-status" role="status" aria-live="polite">
            {{ filteredArticles().length }}
            {{ filteredArticles().length === 1 ? 'guide' : 'guides' }}
            {{ query() ? 'found' : 'to explore' }}
          </p>
          <div class="help-popular" aria-label="Popular help searches">
            <span>Popular:</span>
            @for (shortcut of shortcuts; track shortcut.label) {
              <button
                type="button"
                (click)="searchBox.value = shortcut.term; search(shortcut.term)"
              >
                {{ shortcut.label }}
              </button>
            }
          </div>
        </div>
      </section>

      <section class="help-content" aria-label="Help topics and guides">
        @if (intro.native) {
          <section class="tour-invite" aria-labelledby="tour-title">
            <div>
              <h2 id="tour-title">New to SurePlace?</h2>
              <p>Take a quick tour with Suri and learn how everything works.</p>
            </div>
            <button class="button-secondary" type="button" (click)="intro.replay()">
              Take the tour <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          </section>
        }
        <div class="section-heading">
          <div>
            <p class="eyebrow">BROWSE BY TOPIC</p>
            <h2>What do you need help with?</h2>
          </div>
          <button class="text-button" type="button" (click)="clearFilters()">
            View all guides <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
        <div class="topics" role="group" aria-label="Filter by help topic">
          @for (category of categories; track category.name) {
            <button
              type="button"
              class="topic"
              [class.active]="selectedCategory() === category.name"
              [attr.aria-pressed]="selectedCategory() === category.name"
              (click)="selectCategory(category.name)"
            >
              <span class="topic-icon"><i [class]="category.icon" aria-hidden="true"></i></span
              ><span
                ><strong>{{ category.name }}</strong
                ><small>{{ category.description }}</small></span
              ><i class="fa-solid fa-arrow-right topic-arrow" aria-hidden="true"></i>
            </button>
          }
        </div>

        <section class="guide-section" aria-labelledby="guides-title">
          <div class="section-heading guide-heading">
            <div>
              <p class="eyebrow">HELP GUIDES</p>
              <h2 id="guides-title">
                {{ selectedCategory() || (query() ? 'Search results' : 'Popular questions') }}
              </h2>
            </div>
            <span class="count"
              >{{ filteredArticles().length }}
              {{ filteredArticles().length === 1 ? 'answer' : 'answers' }}</span
            >
          </div>
          @if (filteredArticles().length) {
            <div class="guide-grid">
              @for (article of filteredArticles(); track article.title) {
                <details class="guide">
                  <summary>
                    <span class="guide-category">{{ article.category }}</span
                    ><strong>{{ article.title }}</strong
                    ><span class="summary-bottom"
                      ><small>{{ article.summary }}</small
                      ><i class="fa-solid fa-plus" aria-hidden="true"></i
                    ></span>
                  </summary>
                  <div class="answer">
                    <ol>
                      @for (step of article.steps; track step) {
                        <li>{{ step }}</li>
                      }
                    </ol>
                    @if (article.link) {
                      <a class="inline-link" [routerLink]="article.link.path"
                        >{{ article.link.label }}
                        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i
                      ></a>
                    }
                  </div>
                </details>
              }
            </div>
          } @else {
            <div class="empty" role="status">
              <span class="empty-icon"
                ><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i
              ></span>
              <h3>No matching guides yet</h3>
              <p>Try a shorter search term or browse all topics to find a related answer.</p>
              <button class="button-primary" type="button" (click)="clearFilters()">
                Browse all guides
              </button>
            </div>
          }
        </section>

        <section class="safety" aria-label="Safety reminder">
          <span class="safety-icon"
            ><i class="fa-solid fa-shield-halved" aria-hidden="true"></i
          ></span>
          <div>
            <strong>A safer way to find your place</strong>
            <p>
              Review listing details, ask questions and independently confirm people and payment
              terms. A SurePlace verification badge is not a transaction guarantee.
            </p>
          </div>
          <a routerLink="/verification"
            >Our verification approach <i class="fa-solid fa-arrow-right" aria-hidden="true"></i
          ></a>
        </section>
        <section class="contact">
          <div class="contact-icon">
            <i class="fa-regular fa-circle-question" aria-hidden="true"></i>
          </div>
          <div>
            <p class="eyebrow">WE’RE HERE TO HELP</p>
            <h2>Still have a question?</h2>
            <p>
              Sign in to manage your account or open a conversation about a property or stay from
              its listing page.
            </p>
          </div>
          <div class="contact-actions">
            <a class="button-primary" routerLink="/login">Sign in to SurePlace</a
            ><a class="button-secondary" routerLink="/properties">Browse listings</a>
          </div>
        </section>
      </section>
    </main>
  `,
  styleUrl: './help-centre.component.scss',
})
export class HelpCentreComponent {
  readonly intro = inject(MobileIntroService);
  private seo = inject(SeoService);
  readonly shortcuts = [
    { label: 'Booking a stay', term: 'booking' },
    { label: 'Account verification', term: 'verification' },
    { label: 'Listing a property', term: 'create a property' },
    { label: 'Contacting an agent', term: 'contact agent' },
  ];
  search(term: string) {
    this.selectedCategory.set(null);
    this.query.set(term);
  }
  readonly categories = CATEGORIES;
  readonly query = signal('');
  readonly selectedCategory = signal<HelpCategory | null>(null);
  readonly filteredArticles = computed(() => {
    const term = this.query().trim().toLocaleLowerCase();
    return ARTICLES.filter((article) => {
      const matchesCategory =
        !this.selectedCategory() || article.category === this.selectedCategory();
      const searchable =
        `${article.title} ${article.category} ${article.summary} ${article.keywords} ${article.steps.join(' ')}`.toLocaleLowerCase();
      return matchesCategory && (!term || searchable.includes(term));
    });
  });

  constructor() {
    this.seo.apply({
      title: 'Help Centre | SurePlace',
      description:
        'Find practical answers about SurePlace accounts, property listings, stays, bookings and verification.',
      path: '/help',
      image: '/hero-eswatini-home.jpg',
      exactTitle: true,
    });
  }

  selectCategory(category: HelpCategory) {
    this.selectedCategory.set(this.selectedCategory() === category ? null : category);
  }

  clearFilters() {
    this.selectedCategory.set(null);
    this.query.set('');
  }
}

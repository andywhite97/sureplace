import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

type HelpCategory = 'Getting started' | 'Finding a place' | 'Stays & bookings' | 'Listing with SurePlace' | 'Account & safety';
type HelpArticle = {
  title: string;
  category: HelpCategory;
  summary: string;
  steps: string[];
  keywords: string;
  link?: { label: string; path: string };
};

const CATEGORIES: { name: HelpCategory; icon: string; description: string }[] = [
  { name: 'Getting started', icon: 'fa-solid fa-compass', description: 'Accounts, email and your profile' },
  { name: 'Finding a place', icon: 'fa-solid fa-house', description: 'Search, save and contact' },
  { name: 'Stays & bookings', icon: 'fa-solid fa-bed', description: 'Find a stay and request dates' },
  { name: 'Listing with SurePlace', icon: 'fa-solid fa-building', description: 'Create, manage and verify listings' },
  { name: 'Account & safety', icon: 'fa-solid fa-shield-halved', description: 'Security and safer decisions' },
];

const ARTICLES: HelpArticle[] = [
  { title: 'Create your SurePlace account', category: 'Getting started', summary: 'Sign up to save listings, message providers and manage your own listings.', keywords: 'register sign up account create', steps: ['Choose Sign up and enter your details using an email address you can access.', 'Follow the verification link sent to your inbox. Check junk mail if it does not arrive.', 'Return to SurePlace and sign in. Some actions require a verified email or additional account details.'], link: { label: 'Create an account', path: '/register' } },
  { title: 'I did not receive my verification email', category: 'Getting started', summary: 'Check the address you registered with and request another verification email.', keywords: 'email verify resend confirmation inbox', steps: ['Check your spam or junk folder and search for “SurePlace”.', 'Make sure you are checking the same email address you entered during registration.', 'Open the verification help from the sign-in screen to request another email. If the address is incorrect, contact support through the available account channels.'], link: { label: 'Go to sign in', path: '/login' } },
  { title: 'Search property listings', category: 'Finding a place', summary: 'Narrow properties by location and the details that matter to you.', keywords: 'search property buy rent filters location price bedrooms', steps: ['Open Properties and enter a location or adjust the available search filters.', 'Open a result to review its description, price, location, photos and contact details.', 'Listing information is supplied by its owner or agent. Confirm important details directly before making a decision.'], link: { label: 'Browse properties', path: '/properties' } },
  { title: 'Find a place to stay', category: 'Finding a place', summary: 'Browse accommodation and review a stay’s details before requesting a booking.', keywords: 'stay accommodation hotel holiday search', steps: ['Open Stays and search for accommodation that suits your trip.', 'Review the stay, room details, dates and displayed price on the stay page.', 'Availability and booking details can change. Check the current information before sending a request.'], link: { label: 'Browse stays', path: '/stays' } },
  { title: 'Save a property or stay', category: 'Finding a place', summary: 'Keep interesting listings handy in your saved items.', keywords: 'favorite bookmark saved shortlist heart', steps: ['Sign in to your SurePlace account.', 'Use the save or favourite control on a listing card or detail page.', 'Return to Saved in your account to see items you have saved.'], link: { label: 'Sign in', path: '/login' } },
  { title: 'Contact an owner or agent safely', category: 'Finding a place', summary: 'Use the contact options on the listing and verify details before committing.', keywords: 'message contact agent owner scam fraud report', steps: ['Open the property or stay and use the contact options shown on that listing.', 'Ask questions, arrange a viewing where appropriate, and keep written communication for reference.', 'Never rely on a badge alone or send money before independently confirming the listing, provider and terms. SurePlace verification is not a guarantee of a transaction.'], link: { label: 'Learn about verification', path: '/verification' } },
  { title: 'Request a booking for a stay', category: 'Stays & bookings', summary: 'Choose an available room and dates, then send the host a booking request.', keywords: 'booking reserve dates room request price payment', steps: ['On a stay page, select a room and dates with availability.', 'Review the dates, nightly prices and total shown before continuing.', 'Sign in and submit the guest details to send your request. A request is not a confirmed reservation; check its status in your account and follow up with the host if needed.', 'SurePlace does not take payment at this stage. Confirm payment arrangements and terms directly with the provider.'], link: { label: 'View your bookings', path: '/account/bookings' } },
  { title: 'Where can I see my booking request?', category: 'Stays & bookings', summary: 'Check the status and details of booking requests from your account.', keywords: 'booking status confirmation pending host', steps: ['Sign in using the account used to make the request.', 'Open Bookings from your account to review the request and its current status.', 'Use the conversation associated with the booking, when available, to communicate with the host.'], link: { label: 'Open bookings', path: '/account/bookings' } },
  { title: 'Create a property listing', category: 'Listing with SurePlace', summary: 'Start a property draft, add its details and photos, then submit it for review.', keywords: 'list property create listing owner sell rent submit review', steps: ['Sign in and open Manage Properties, then choose to create a property.', 'Complete the required information including property type, sale or rental details, location and price.', 'Add photos. The property form requires listing details and at least one uploaded photo before submission.', 'Review your information, confirm it is accurate and submit the listing for review.'], link: { label: 'Manage properties', path: '/account/manage/properties' } },
  { title: 'Create a stay listing', category: 'Listing with SurePlace', summary: 'Set up accommodation details and rooms, then submit the stay for review.', keywords: 'host stay accommodation create room listing submit review', steps: ['Sign in and open Manage Stays to start a stay listing.', 'Add the accommodation details, contact information and at least one room with its availability and pricing information.', 'Review the listing and confirm the details before submitting it for review.', 'You can return to Manage Stays to continue working on your listings.'], link: { label: 'Manage stays', path: '/account/manage/stays' } },
  { title: 'Understand verification badges', category: 'Listing with SurePlace', summary: 'Badges indicate evidence reviewed by SurePlace; they are useful signals, not guarantees.', keywords: 'verification verified identity agency property documents badge', steps: ['Read the verification information to understand the kinds of checks represented by badges.', 'For your own verification, open the verification area in your account and follow the requirements shown for your request.', 'If a request needs changes, read the staff note, update the information or documents, and submit again.', 'Always do your own checks before a transaction; a badge does not guarantee a person, property, stay or outcome.'], link: { label: 'How verification works', path: '/verification' } },
  { title: 'Change your password or recover access', category: 'Account & safety', summary: 'Use the password reset flow if you cannot sign in.', keywords: 'password forgot reset login locked access security', steps: ['Choose Forgot password on the sign-in page.', 'Enter your account email and check your inbox for the reset instructions.', 'Use the link to choose a new password. Choose a unique password and do not share it.'], link: { label: 'Reset password', path: '/forgot-password' } },
  { title: 'Manage messages and account details', category: 'Account & safety', summary: 'Use your account workspace to review conversations and keep your profile current.', keywords: 'message inbox profile settings details account contact', steps: ['Sign in and open Messages to review your conversations.', 'Open Profile or Settings in your account to review available personal and security options.', 'Keep your contact information current so people can reach you about your enquiries or listings.'], link: { label: 'Open your account', path: '/account' } },
];

@Component({
  selector: 'sp-help-centre',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="help-page">
      <section class="hero" aria-labelledby="help-title">
        <img src="/hero-eswatini-home.jpg" alt="Homes and landscape in Eswatini" />
        <div class="hero-shade"></div>
        <div class="hero-content">
          <p class="eyebrow">SUREPLACE SUPPORT</p>
          <h1 id="help-title">How can we help?</h1>
          <p class="hero-copy">Practical answers for finding a home, booking a stay and using SurePlace.</p>
          <form class="search" role="search" (submit)="$event.preventDefault()">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input #searchBox type="search" [value]="query()" (input)="query.set(searchBox.value)" placeholder="Search by topic, question or keyword" aria-label="Search help articles" />
            @if (query()) { <button type="button" aria-label="Clear search" (click)="query.set(''); searchBox.focus()"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button> }
            <span class="shortcut">{{ filteredArticles().length }} {{ filteredArticles().length === 1 ? 'guide' : 'guides' }}</span>
          </form>
          <p class="popular"><span>Popular:</span> <button type="button" (click)="searchBox.value='booking'; query.set('booking')">booking</button><button type="button" (click)="searchBox.value='verification'; query.set('verification')">verification</button><button type="button" (click)="searchBox.value='list a property'; query.set('list a property')">list a property</button></p>
        </div>
      </section>

      <section class="content" aria-label="Help topics and guides">
        <div class="section-heading"><div><p class="eyebrow">BROWSE BY TOPIC</p><h2>What do you need help with?</h2></div><button class="text-button" type="button" (click)="clearFilters()">View all guides <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div>
        <div class="topics" role="group" aria-label="Filter by help topic">
          @for (category of categories; track category.name) {
            <button type="button" class="topic" [class.active]="selectedCategory() === category.name" [attr.aria-pressed]="selectedCategory() === category.name" (click)="selectCategory(category.name)">
              <span class="topic-icon"><i [class]="category.icon" aria-hidden="true"></i></span><span><strong>{{ category.name }}</strong><small>{{ category.description }}</small></span><i class="fa-solid fa-arrow-right topic-arrow" aria-hidden="true"></i>
            </button>
          }
        </div>

        <section class="guide-section" aria-labelledby="guides-title">
          <div class="section-heading guide-heading"><div><p class="eyebrow">HELP GUIDES</p><h2 id="guides-title">{{ selectedCategory() || (query() ? 'Search results' : 'Popular questions') }}</h2></div><span class="count">{{ filteredArticles().length }} {{ filteredArticles().length === 1 ? 'answer' : 'answers' }}</span></div>
          @if (filteredArticles().length) {
            <div class="guide-grid">
              @for (article of filteredArticles(); track article.title) {
                <details class="guide">
                  <summary><span class="guide-category">{{ article.category }}</span><strong>{{ article.title }}</strong><span class="summary-bottom"><small>{{ article.summary }}</small><i class="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
                  <div class="answer"><ol>@for (step of article.steps; track step) { <li>{{ step }}</li> }</ol>@if (article.link) { <a class="inline-link" [routerLink]="article.link.path">{{ article.link.label }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a> }</div>
                </details>
              }
            </div>
          } @else {
            <div class="empty" role="status"><span class="empty-icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span><h3>No matching guides yet</h3><p>Try a shorter search term or browse all topics to find a related answer.</p><button class="button-primary" type="button" (click)="clearFilters()">Browse all guides</button></div>
          }
        </section>

        <section class="safety" aria-label="Safety reminder"><span class="safety-icon"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i></span><div><strong>A safer way to find your place</strong><p>Review listing details, ask questions and independently confirm people and payment terms. A SurePlace verification badge is not a transaction guarantee.</p></div><a routerLink="/verification">Our verification approach <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></section>
        <section class="contact"><div class="contact-icon"><i class="fa-regular fa-circle-question" aria-hidden="true"></i></div><div><p class="eyebrow">WE’RE HERE TO HELP</p><h2>Still have a question?</h2><p>Sign in to manage your account or open a conversation about a property or stay from its listing page.</p></div><div class="contact-actions"><a class="button-primary" routerLink="/login">Sign in to SurePlace</a><a class="button-secondary" routerLink="/properties">Browse listings</a></div></section>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.help-page{--ink:#102e38;--muted:#5f747b;--teal:#079b87;--mint:#e7f7f3;--line:#dfe9e8;background:#f5f8f7;color:var(--ink);padding-bottom:4rem}.hero{position:relative;isolation:isolate;min-height:350px;display:grid;align-items:center;overflow:hidden;background:#082e2d;color:#fff}.hero>img,.hero-shade{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.hero>img{object-fit:cover;object-position:center 53%}.hero-shade{background:linear-gradient(90deg,rgba(5,36,38,.95),rgba(6,46,45,.72) 56%,rgba(6,42,44,.35))}.hero-content{width:min(1160px,calc(100% - 2.5rem));margin:auto;padding:3.2rem 0}.eyebrow{margin:0 0 .55rem;color:var(--teal);font-size:.72rem;font-weight:850;letter-spacing:.13em}.hero .eyebrow{color:#73e4d2}.hero h1{margin:0;font-size:clamp(2.3rem,5vw,3.6rem);line-height:1.06;letter-spacing:-.035em}.hero-copy{margin:.65rem 0 1.4rem;color:#e3f0ee;font-size:1.04rem}.search{display:flex;align-items:center;gap:.75rem;width:min(720px,100%);min-height:58px;padding:.4rem .8rem .4rem 1rem;border:1px solid rgba(255,255,255,.55);border-radius:.85rem;background:#fff;color:var(--ink);box-shadow:0 10px 35px #001c1d45}.search>i{color:var(--teal)}.search input{flex:1;min-width:0;border:0;outline:0;color:var(--ink);font:inherit}.search input::placeholder{color:#77878d}.search button{width:34px;height:34px;border:0;border-radius:.55rem;background:#eff6f4;color:#36555c;cursor:pointer}.shortcut{padding-left:.65rem;border-left:1px solid var(--line);color:var(--muted);font-size:.8rem;white-space:nowrap}.popular{display:flex;flex-wrap:wrap;gap:.4rem .9rem;align-items:center;margin:.75rem 0 0;color:#e3f0ee;font-size:.84rem}.popular span{color:#b8d2ce}.popular button{padding:0;border:0;background:transparent;color:#fff;text-decoration:underline;text-underline-offset:3px;cursor:pointer;font:inherit}.content{width:min(1160px,calc(100% - 2.5rem));margin:0 auto}.section-heading{display:flex;justify-content:space-between;align-items:end;gap:1rem;margin:2.2rem 0 1rem}.section-heading h2,.contact h2{margin:0;font-size:clamp(1.3rem,2.8vw,1.8rem);letter-spacing:-.02em}.section-heading .eyebrow{margin-bottom:.35rem}.text-button{border:0;background:none;color:#087e70;font:inherit;font-weight:750;cursor:pointer}.text-button i{margin-left:.25rem}.topics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}.topic{display:flex;align-items:center;gap:.85rem;min-height:86px;padding:1rem;border:1px solid var(--line);border-radius:.85rem;background:#fff;color:var(--ink);text-align:left;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.topic:hover,.topic.active{transform:translateY(-2px);border-color:#62c8b8;box-shadow:0 8px 22px #113c3810}.topic.active{background:#f0fbf8}.topic-icon{display:grid;place-items:center;flex:none;width:42px;height:42px;border-radius:.75rem;background:var(--mint);color:var(--teal);font-size:1.1rem}.topic>span:nth-child(2){display:grid;gap:.25rem}.topic strong{font-size:.92rem}.topic small{color:var(--muted);font-size:.78rem}.topic-arrow{margin-left:auto;color:#72a59c;font-size:.8rem}.guide-section{margin-top:2.3rem}.guide-heading{margin-bottom:.9rem}.count{color:var(--muted);font-size:.85rem}.guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.guide{align-self:start;border:1px solid var(--line);border-radius:.8rem;background:#fff;overflow:hidden;transition:border-color .18s ease,box-shadow .18s ease}.guide[open]{border-color:#a8dcd3;box-shadow:0 8px 22px #113c380b}.guide summary{display:grid;gap:.45rem;padding:1rem;cursor:pointer;list-style:none}.guide summary::-webkit-details-marker{display:none}.guide-category{color:#078978;font-size:.66rem;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.guide summary>strong{font-size:.96rem}.summary-bottom{display:flex;align-items:center;gap:.75rem;justify-content:space-between}.summary-bottom small{color:var(--muted);font-size:.8rem;line-height:1.45}.summary-bottom i{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:#eef7f5;color:#0a8879;transition:transform .18s ease}.guide[open] .summary-bottom i{transform:rotate(45deg)}.answer{padding:.1rem 1rem 1rem;border-top:1px solid #edf2f1}.answer ol{padding-left:1.2rem;color:#435c63;font-size:.88rem;line-height:1.6}.answer li{padding:.25rem 0 .25rem .2rem}.inline-link{display:inline-flex;gap:.5rem;align-items:center;color:#087e70;font-size:.87rem;font-weight:800;text-decoration:none}.inline-link:hover{text-decoration:underline;text-underline-offset:3px}.empty{display:grid;justify-items:center;padding:2.5rem 1rem;border:1px dashed #bfd4d0;border-radius:1rem;background:#fff;text-align:center}.empty-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--mint);color:var(--teal)}.empty h3{margin:.8rem 0 .25rem}.empty p{max-width:420px;margin:.25rem 0 1rem;color:var(--muted);line-height:1.5}.button-primary,.button-secondary{display:inline-flex;justify-content:center;align-items:center;min-height:44px;padding:.7rem 1rem;border:1px solid var(--teal);border-radius:.65rem;background:var(--teal);color:#fff;text-decoration:none;font:inherit;font-size:.88rem;font-weight:800;transition:background .16s ease,transform .16s ease,box-shadow .16s ease;cursor:pointer}.button-primary:hover{transform:translateY(-1px);background:#087e70;box-shadow:0 5px 14px #079b8733}.button-secondary{background:#fff;color:#087e70}.button-secondary:hover{background:#effaf7}.safety{display:flex;align-items:center;gap:1rem;margin-top:2rem;padding:1.2rem 1.3rem;border:1px solid #cfeae3;border-radius:.9rem;background:#e9f8f4}.safety-icon,.contact-icon{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:50%;background:#d3f0e9;color:#058b7b;font-size:1.05rem}.safety strong{font-size:.95rem}.safety p{margin:.3rem 0 0;color:#4e686e;font-size:.84rem;line-height:1.5}.safety>a{display:flex;gap:.45rem;align-items:center;margin-left:auto;color:#087e70;font-size:.84rem;font-weight:800;text-decoration:none;white-space:nowrap}.contact{display:flex;align-items:center;gap:1rem;margin-top:1rem;padding:1.5rem;border:1px solid var(--line);border-radius:1rem;background:#fff}.contact-icon{width:50px;height:50px;font-size:1.2rem}.contact>div:nth-child(2){flex:1}.contact .eyebrow{margin:0 0 .3rem}.contact>div>p:last-child{max-width:650px;margin:.45rem 0 0;color:var(--muted);font-size:.87rem;line-height:1.5}.contact-actions{display:flex;gap:.55rem;flex-wrap:wrap}@media(max-width:780px){.topics{grid-template-columns:repeat(2,minmax(0,1fr))}.contact{align-items:flex-start;flex-wrap:wrap}.contact-actions{width:100%;padding-left:66px}}@media(max-width:560px){.help-page{padding-bottom:2rem}.hero{min-height:340px}.hero-content,.content{width:calc(100% - 2rem)}.hero-content{padding:2.5rem 0}.hero-copy{max-width:32rem;font-size:.95rem}.search{min-height:54px;gap:.5rem;padding-left:.75rem}.search input{font-size:.88rem}.shortcut{font-size:.72rem}.topics,.guide-grid{grid-template-columns:1fr}.topic{min-height:74px;padding:.8rem}.section-heading{align-items:flex-start}.section-heading h2{font-size:1.35rem}.text-button{font-size:.82rem;white-space:nowrap}.safety{align-items:flex-start;flex-wrap:wrap}.safety>a{margin-left:3.4rem}.contact{padding:1.1rem}.contact-actions{padding-left:0}.contact-actions>a{flex:1}.contact-icon{width:42px;height:42px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
  `],
})
export class HelpCentreComponent {
  private seo = inject(SeoService);
  readonly categories = CATEGORIES;
  readonly query = signal('');
  readonly selectedCategory = signal<HelpCategory | null>(null);
  readonly filteredArticles = computed(() => {
    const term = this.query().trim().toLocaleLowerCase();
    return ARTICLES.filter((article) => {
      const matchesCategory = !this.selectedCategory() || article.category === this.selectedCategory();
      const searchable = `${article.title} ${article.category} ${article.summary} ${article.keywords} ${article.steps.join(' ')}`.toLocaleLowerCase();
      return matchesCategory && (!term || searchable.includes(term));
    });
  });

  constructor() {
    this.seo.apply({
      title: 'Help Centre | SurePlace',
      description: 'Find practical answers about SurePlace accounts, property listings, stays, bookings and verification.',
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

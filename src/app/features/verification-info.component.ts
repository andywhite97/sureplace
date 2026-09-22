import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/services/seo.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">Trust on SurePlace</p>
          <h1>Know what has been verified.</h1>
          <p class="lead">
            Verification badges help you understand which identity or listing details SurePlace has
            reviewed. They support safer decisions, but they do not replace your own checks.
          </p>
          <div class="actions">
            <a class="primary" routerLink="/properties">Browse properties</a>
            <a routerLink="/stays">Explore stays</a>
          </div>
        </div>
        <div class="shield" aria-hidden="true"><i class="fa-solid fa-shield-check"></i></div>
      </section>

      <section class="content" aria-labelledby="badge-heading">
        <header>
          <p class="eyebrow">Badge guide</p>
          <h2 id="badge-heading">What each verification means</h2>
        </header>
        <div class="cards">
          <article>
            <span><i class="fa-solid fa-user-check" aria-hidden="true"></i></span>
            <h3>Identity verified</h3>
            <p>The person has completed SurePlace's identity review process.</p>
          </article>
          <article>
            <span><i class="fa-solid fa-building-circle-check" aria-hidden="true"></i></span>
            <h3>Agency verified</h3>
            <p>The agency's submitted business details have been reviewed.</p>
          </article>
          <article>
            <span><i class="fa-solid fa-house-circle-check" aria-hidden="true"></i></span>
            <h3>Listing verified</h3>
            <p>Evidence connected to the property or stay has been reviewed.</p>
          </article>
        </div>
      </section>

      <section class="safety">
        <div>
          <p class="eyebrow">Stay alert</p>
          <h2>A badge is one part of a safe decision.</h2>
        </div>
        <ul>
          <li>
            <i class="fa-solid fa-circle-check"></i><span>View a property before paying.</span>
          </li>
          <li>
            <i class="fa-solid fa-circle-check"></i
            ><span>Keep important conversations on SurePlace.</span>
          </li>
          <li>
            <i class="fa-solid fa-circle-check"></i
            ><span>Confirm names, contact details and payment instructions.</span>
          </li>
          <li>
            <i class="fa-solid fa-circle-check"></i
            ><span>Report suspicious or inaccurate listings.</span>
          </li>
        </ul>
      </section>

      <section class="cta">
        <div>
          <h2>Need verification for your listing?</h2>
          <p>Sign in to see which checks are available for your account, agency or listing.</p>
        </div>
        <a routerLink="/account/manage/verification">Open verification</a>
      </section>
    </main>
  `,
  styles: [
    `
      main {
        width: min(1180px, calc(100% - 2rem));
        margin: auto;
        padding: clamp(1.5rem, 4vw, 4rem) 0 6rem;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
        align-items: center;
        gap: clamp(2rem, 6vw, 6rem);
        padding: clamp(2rem, 6vw, 5rem);
        border-radius: 2rem;
        background: linear-gradient(135deg, #062f33, #0b625b);
        color: #fff;
        overflow: hidden;
      }
      .eyebrow {
        margin: 0;
        color: #65dfcc;
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .hero h1 {
        max-width: 720px;
        margin: 0.5rem 0 1rem;
        font-size: clamp(2.5rem, 6vw, 5rem);
        line-height: 0.98;
      }
      .lead {
        max-width: 650px;
        margin: 0;
        color: #d8efeb;
        font-size: clamp(1rem, 2vw, 1.18rem);
        line-height: 1.7;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1.6rem;
      }
      .actions a,
      .cta a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 1.1rem;
        border: 1px solid #ffffff66;
        border-radius: 999px;
        color: #fff;
        font-weight: 850;
        text-decoration: none;
      }
      .actions .primary,
      .cta a {
        border-color: transparent;
        background: var(--teal);
      }
      .shield {
        display: grid;
        place-items: center;
        aspect-ratio: 1;
        border-radius: 50%;
        background: #ffffff12;
        font-size: clamp(6rem, 15vw, 11rem);
        color: #65dfcc;
        box-shadow: inset 0 0 0 1px #ffffff18;
      }
      .content {
        padding: clamp(3.5rem, 7vw, 6rem) 0;
      }
      .content header {
        text-align: center;
      }
      .content h2,
      .safety h2,
      .cta h2 {
        margin: 0.45rem 0;
        font-size: clamp(1.8rem, 4vw, 3rem);
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        margin-top: 2rem;
      }
      .cards article {
        padding: 1.5rem;
        border: 1px solid var(--line);
        border-radius: 1.2rem;
        background: #fff;
        box-shadow: 0 14px 35px rgba(13, 53, 52, 0.06);
      }
      .cards span {
        display: grid;
        place-items: center;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        background: var(--mist);
        color: var(--teal);
        font-size: 1.2rem;
      }
      .cards h3 {
        margin: 1rem 0 0.4rem;
      }
      .cards p,
      .cta p {
        margin: 0;
        color: var(--slate);
        line-height: 1.65;
      }
      .safety {
        display: grid;
        grid-template-columns: 0.8fr 1.2fr;
        gap: 2rem;
        padding: clamp(1.5rem, 4vw, 3rem);
        border-radius: 1.5rem;
        background: var(--mist);
      }
      .safety ul {
        display: grid;
        gap: 0.75rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .safety li {
        display: flex;
        gap: 0.65rem;
        padding: 0.85rem;
        border-radius: 0.8rem;
        background: #fff;
        font-weight: 700;
      }
      .safety i {
        color: var(--teal);
      }
      .cta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 2rem;
        margin-top: 1rem;
        padding: clamp(1.5rem, 4vw, 3rem);
        border: 1px solid var(--line);
        border-radius: 1.5rem;
        background: #fff;
      }
      .cta h2 {
        font-size: clamp(1.5rem, 3vw, 2.25rem);
      }
      .cta a {
        flex: none;
      }
      @media (max-width: 760px) {
        main {
          width: min(100% - 1rem, 1180px);
          padding-top: 0.5rem;
        }
        .hero {
          grid-template-columns: 1fr;
          padding: 2rem 1.25rem;
          border-radius: 1.25rem;
        }
        .shield {
          display: none;
        }
        .cards {
          grid-template-columns: 1fr;
        }
        .safety {
          grid-template-columns: 1fr;
        }
        .cta {
          align-items: stretch;
          flex-direction: column;
        }
        .cta a {
          width: 100%;
        }
      }
    `,
  ],
})
export class VerificationInfoComponent {
  private seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title: 'SurePlace verification | Safer property decisions',
      description: 'Understand SurePlace identity, agency and listing verification badges.',
      path: '/verification',
      robots: 'index, follow',
    });
  }
}

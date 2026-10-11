import type { VNode } from "preact";
import {
  landingCards,
  landingName,
  landingTagline,
} from "../content/landing.ts";

export function Landing({ docsOrigin }: { docsOrigin: string }): VNode {
  return (
    <main id="main-content" class="landing" tabIndex={-1}>
      <section class="hero">
        <div class="hero-container">
          <div class="hero-art">
            <div class="hero-image-container">
              <img
                class="hero-image"
                src="/mw.gif"
                alt="A moonwell"
                width="256"
                height="256"
              />
            </div>
          </div>
          <div class="hero-copy">
            <h1 class="visually-hidden">{landingName}</h1>
            <p class="tagline pixel-heading">{landingTagline}</p>
          </div>
        </div>
      </section>
      <section class="cards" aria-label="Moonwell projects">
        <ul class="card-grid">
          {landingCards.map((card) => (
            <li key={card.path}>
              <a class="card" href={`${docsOrigin}${card.path}`}>
                <article class="card-box">
                  <h2 class="card-title pixel-heading">{card.title}</h2>
                  <p class="card-description">{card.description}</p>
                </article>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

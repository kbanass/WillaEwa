# WillaEwa

Strona [willaewanadmorzem.pl](https://willaewanadmorzem.pl) — pensjonat w Krynicy Morskiej.

## Architektura

Statyczna strona Astro hostowana na Cloudflare Pages, z backendem jako Cloudflare Pages
Functions (bez osobnego serwera/VPS) i treścią w Sanity CMS.

```
astro/         strona (Astro, output: "static"), Cloudflare Pages
functions/     API strony — Cloudflare Pages Functions (/api/*)
sanity/studio/ CMS (Sanity Studio) — treść: galeria, pokoje, artykuły, opinie, ustawienia
cron-worker/   osobny Cloudflare Worker — codzienna synchronizacja opinii Google (SerpAPI → Sanity)
```

- **Deploy strony**: git push na `main` → Cloudflare Pages buduje `astro/` i wdraża
  `functions/` automatycznie. Brak ręcznego wdrażania.
- **Webhook Sanity**: zmiana treści (galeria, pokoje, artykuły, ustawienia) w Sanity
  wywołuje rebuild Cloudflare Pages przez deploy hook.
- **cron-worker**: uruchamia się codziennie (patrz `cron-worker/wrangler.toml`), pobiera
  nowe opinie z Google Maps przez SerpAPI, zapisuje je jako dokumenty `review` w Sanity
  (status `pending` — wymagają akceptacji w panelu), wysyła powiadomienia (Telegram/e-mail)
  i aktualizuje ogólną ocenę/liczbę opinii Google widoczną na stronie. Wdraża się osobno:
  `cd cron-worker && npx wrangler deploy`.

## Rozwój lokalny

```sh
cd astro && npm install && npm run dev
```

Do edycji CMS lokalnie: `cd sanity/studio && npm install && npm run dev`.

### Gdzie co jest (`astro/src/`)

- `lib/site.ts` — dane obiektu (nazwa, adres, zapasowe numery telefonu, link do Map Google).
  Numery ustawione w Sanity (siteSettings) mają pierwszeństwo.
- `lib/sanity.ts` — klient Sanity, zapytania GROQ, `getSiteSettings()`.
- `lib/hero.ts`, `lib/lightbox.ts`, `lib/reviews.ts` — logika współdzielona przez komponenty
  (slajdy Hero, podgląd zdjęć PhotoSwipe, karta opinii na stronie i w panelu).
- `styles/` — style globalne: `variables.css` (kolory, fonty, odstępy — wartości dodawaj tutaj,
  nie wpisuj ich na sztywno), `reset.css`, `style.css` (layout, nagłówek, stopka, animacje),
  `forms.css`, `photoswipe.css`, `review-card.css`. Style jednego komponentu trzymaj w jego
  `<style>`.

### Typy z Sanity

`sanity/studio/schema.json` i `astro/src/sanity.types.ts` są wygenerowane i trzymane w repo —
build na Cloudflare ich nie generuje (nie instaluje zależności Sanity Studio). Po każdej zmianie
schematu w `sanity/studio/schemaTypes/` albo zapytania GROQ w `astro/src/lib/sanity.ts` odpal:

```sh
cd sanity/studio && npm run typegen
```

i zacommituj oba pliki. `npm run dev:all` w `astro/` generuje typy zapytań na bieżąco
(bez ekstrakcji schematu).

## Zmienne środowiskowe

Cloudflare Pages Functions (`functions/`) i `cron-worker` używają sekretów ustawianych
przez dashboard Cloudflare / `wrangler secret put` (nie w repo):

- `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN`
- `JWT_SECRET`, `ADMIN_PASSWORD_HASH` — logowanie do panelu
- `SERPAPI_API_KEY`, `GOOGLE_PLACE_ID` — synchronizacja opinii (cron-worker)
- `RESEND_API_KEY`, `MAIL_FROM`, `OWNER_EMAIL` — powiadomienia e-mail
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — powiadomienia Telegram (opcjonalne)
- `CF_PAGES_DEPLOY_HOOK` — wyzwala rebuild Cloudflare Pages po nowych opiniach
- `DOMAIN_NAME`, `REBUILD_SECRET` (opcjonalny sekret webhooka Sanity)

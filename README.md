# byjoba-web

The pages at byjoba.com and jonasbarsten.com: two lists of what Jonas Barsten makes and works on, generated from one content file.

- **byjoba.com** lists the software and hardware Jonas makes on his own initiative. The name is written byJoBa and stands for "by Jonas Barsten".
- **jonasbarsten.com** lists everything else, with one entry that points to byjoba.com. Nothing is listed on both sites.

Design: `byjoba-tools/specs/2026-10-04-landing-pages-design.md`.

## Layout

| Path | What it is |
|---|---|
| `content/projects.json` | All content: the two sites, their sections, and every entry. |
| `content/shows.json` | The shows played, per entry id. |
| `content/places.json` | The countries, cities, events and venues the shows name. |
| `site/` | The generator. Plain ESM JavaScript on Node 24, no dependencies. |
| `static/<domain>/` | Files copied into that site as they are. |
| `dist/<domain>/` | Build output. Not in git. |

## Commands

```bash
npm test         # validation, rendering, build and content tests
npm run build    # writes dist/byjoba.com and dist/jonasbarsten.com
```

Preview after a build, one terminal per site:

```bash
python3 -m http.server -d dist/byjoba.com 8791
python3 -m http.server -d dist/jonasbarsten.com 8792
```

Locally the visitor counter shows its alt text and the contact page cannot fetch the address; both need the deployed API.

## Content model

A site in `sites`, keyed by its domain:

| Field | Required | Meaning |
|---|---|---|
| `title` | yes | Short name, shown as the page heading. |
| `pageTitle` | yes | The `<title>` and link-preview title; what search results show. |
| `description` | yes | Meta description, about 150 characters. |
| `intro` | yes | The one line under the heading. |
| `turnstileSiteKey` | yes | Public Cloudflare Turnstile key for the contact page. |
| `jsonLd` | no | schema.org structured data, embedded as it is on the list page. |
| `sections` | yes | Ordered headings; each has a `title` and a `category`, and optionally a `note`: one line under the heading that says how to read the cards. |

An entry in `projects`:

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Lowercase slug, unique. The anchor: `byjoba.com/#kiwi`. |
| `name` | yes | Display name. |
| `site` | yes | The one domain the entry lives on. |
| `category` | yes | A category of a section on that site. |
| `summary` | yes | One line, shown in the list. |
| `about` | no | Short paragraph, shown when expanded. |
| `years` | no | Free text, e.g. `2016–`. |
| `status` | yes | Shown as a badge after the name. One of `in-development` (being made, not out yet), `active` (out or running, still worked on), `ended` (was active, has stopped), `one-off` (a single piece of work, delivered). |
| `role` | no | Shown after the summary. |
| `media` | no | List of `{ "label", "url" }` for YouTube videos (`https://www.youtube.com/watch?v=…`), NRK TV programmes (`https://tv.nrk.no/…/<programme id>`) and Spotify tracks (`https://open.spotify.com/track/…`). Shown as small players when the entry is expanded; the line says how many there are. |
| `badges` | no | List of short texts stacked at the top right of the card's header. The music cards use `"live"` and `"studio"`. Any text works, on any entry, but a badge reads as a fact about the thing named, so do not use badges for Jonas's role; that goes in `summary`. |
| `url` | no | Where the name links to. Without it the name is plain text. `https://…`, or `/…` for a file under `static/<site>/`. |
| `releases` | no | List of `{ "title", "year", "url"?, "cover"? }`: the records the entry appears on, shown with their covers inside the opened card and counted in its marker. `cover` is a path to an image of our own under `static/<site>/`, e.g. `/covers/vidde.jpg`. |
| `shows` | no | Not written in `projects.json`: the lists live in `content/shows.json`, keyed by entry id, because they are many. Each is a list of `{ "date", "event"?, "venue"?, "place"?, "country"?, "note"?, "review"? }`: the shows played with the act. `event` is the festival, showcase or programme; `venue` is the physical place; `place` is the city. Every one of those names must be in `content/places.json` (see Places below), so one venue is always spelled one way. A festival on its own grounds is both the event and the venue (`"event": "Slottsfjell", "venue": "Slottsfjell"`) and is shown once. `country` is only for a show without a `place`; otherwise the country comes from the city. `review` is `{ "label", "url" }`, a published review of that show, labelled with the publication's name. A site with shows also gets `/shows.html`, which lists them all by year; the list page links to it from its footer. `date` is `2019-08-07`, or `2019-08` or `2019` when that is all the source gives. `note` is for things like `stand-in`. A button inside the opened card opens the list in a popover (no script), and the marker counts them. Only shows Jonas played; a calendar entry is not proof of that, so check before adding. |
| `links` | no | List of `{ "label", "url" }`, shown by label inside the opened card and counted in its marker ("1 video · 1 link"). They never make the name a link. |

### Places

`content/places.json` holds the names the shows refer to, each once:

| Table | Shape | Meaning |
|---|---|---|
| `countries` | `{ "NO": "Norway" }` | ISO 3166 two-letter code to English name. The lists show the code; the name is its expansion. |
| `cities` | `{ "Oslo": "NO" }` | City to country code. |
| `events` | `["by:Larm"]` | Festivals, showcases, award shows and TV and radio programmes. |
| `venues` | `[{ "name": "Blå", "city": "Oslo" }]` | A venue and the city it is in. Two cities can have a venue of the same name. `city` is left out when it is not known. |

To add a show at a new venue, add the venue (and its city, if new) here first; the build names anything it does not find. The shows page counts its venues, events, cities and countries from what the shows use.

Entries appear in file order. A site's `sections` set the headings and their order; a section with no entries is left out. The build fails with a list of errors when the content is invalid.

## Search engines

Each build also writes `robots.txt`, `sitemap.xml` and `favicon.svg`. The list page and the shows page are indexable; the contact and not-found pages are marked `noindex`. Lighthouse scores 100 for SEO, accessibility and performance on both sites; check again after a change to the markup or the stylesheet:

```bash
npx lighthouse http://localhost:8791/ --only-categories=seo,accessibility,best-practices,performance
```

## Deploy

Not set up yet. Hosting, the visitor counter, the contact endpoint and the deploy workflow are plan 2 (`byjoba-tools/plans/`).

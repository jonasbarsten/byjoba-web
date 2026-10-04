# byjoba-web

The pages at byjoba.com and jonasbarsten.com: two lists of what Jonas Barsten makes and works on, generated from one content file.

- **byjoba.com** lists the software and hardware Jonas makes on his own initiative. The name is written byJoBa and stands for "by Jonas Barsten".
- **jonasbarsten.com** lists everything else, with one entry that points to byjoba.com. Nothing is listed on both sites.

Design: `byjoba-tools/specs/2026-10-04-landing-pages-design.md`.

## Layout

| Path | What it is |
|---|---|
| `content/projects.json` | All content: the two sites, their sections, and every entry. |
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
| `sections` | yes | Ordered headings; each has a `title` and a `category`. |

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
| `media` | no | List of `{ "label", "url" }` for YouTube videos (`https://www.youtube.com/watch?v=…`) and Spotify tracks (`https://open.spotify.com/track/…`). Shown as small players when the entry is expanded; the line says how many there are. |
| `links` | no | List of `{ "label", "url" }`; `url` is `https://…`, or `/…` for a file under `static/<site>/`. |

Entries appear in file order. A site's `sections` set the headings and their order; a section with no entries is left out. The build fails with a list of errors when the content is invalid.

## Search engines

Each build also writes `robots.txt`, `sitemap.xml` and `favicon.svg`. Only the list page is indexable; the contact and not-found pages are marked `noindex`. Lighthouse scores 100 for SEO, accessibility and performance on both sites; check again after a change to the markup or the stylesheet:

```bash
npx lighthouse http://localhost:8791/ --only-categories=seo,accessibility,best-practices,performance
```

## Deploy

Not set up yet. Hosting, the visitor counter, the contact endpoint and the deploy workflow are plan 2 (`byjoba-tools/plans/`).

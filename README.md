# byjoba-web

The engine behind byjoba.com and jonasbarsten.com, two lists of what Jonas Barsten makes and works on, and byjoba.com's content.

- **byjoba.com** lists the software and hardware Jonas makes on his own initiative. The name is written byJoBa and stands for "by Jonas Barsten". Its content is in this repo.
- **jonasbarsten.com** lists everything else, with one entry that points to byjoba.com. Its content lives in [jonasbarsten/jonasbarsten.com](https://github.com/jonasbarsten/jonasbarsten.com), whose workflows build it with this repo's generator at `main`. Nothing is listed on both sites.

Design: `byjoba-tools/specs/2026-10-04-landing-pages-design.md`.

## Layout

| Path | What it is |
|---|---|
| `content/projects.json` | byjoba.com's content: the site, its sections, and every entry. |
| `content/shows.json` | The shows played, per entry id. Empty here: byjoba.com has none. |
| `content/places.json` | The countries, cities, events and venues the shows name. Empty here. |
| `site/` | The generator. Plain ESM JavaScript on Node 24, no dependencies: `build.mjs` (the command line), `render.mjs` (the pages, sitemap, robots.txt and llms.txt), `validate.mjs` (the content rules), `media.mjs` (video and track links), `indexnow.mjs` (the post-deploy submission), the stylesheet, the contact page script and the favicon. Tests in `site/test/`. |
| `static/<domain>/` | Files copied into that site as they are, such as byjoba.com's `share.png`. |
| `tools/share-card.html` | The template the share images are made from (see Share images). Not part of any site. |
| `dist/<domain>/` | Build output. Not in git. |

## Commands

```bash
npm test         # validation, rendering, build and content tests
npm run build    # writes dist/byjoba.com
python3 -m http.server -d dist/byjoba.com 8791
```

The generator builds any content directory laid out like `content/` (with `static/` beside it):

```bash
node site/build.mjs --content <dir> --out <dir>             # build it
CONTENT_DIR=<dir> node --test site/test/content.test.mjs   # check it
```

The jonasbarsten.com repo uses exactly these, from a checkout of this repo, in its CI and deploy. A change to the generator on `main` reaches jonasbarsten.com on its next deploy, so check it against that repo's content first. With that repo at `~/Development/jonasbarsten.com`, run both commands from here with `../../jonasbarsten.com/content` as the content directory.

Locally the visitor counter shows its alt text and the contact page cannot fetch the address; both are served by byjoba-api through the deployed site.

## Content model

A site in `sites`, keyed by its domain:

| Field | Required | Meaning |
|---|---|---|
| `title` | yes | Short name, shown as the page heading. |
| `pageTitle` | yes | The `<title>` and link-preview title; what search results show. |
| `description` | yes | Meta description, about 150 characters. |
| `intro` | yes | The one line under the heading. |
| `turnstileSiteKey` | yes | Public Cloudflare Turnstile key for the contact page. |
| `jsonLd` | no | schema.org structured data for the list page, e.g. an `Organization` or a `ProfilePage`. The build puts it in a `@graph` after a `WebSite` node (`@id` `https://<domain>/#website`) naming the site. |
| `shareImage` | no | The link-preview image: `{ "path": "/share.png", "width": 1200, "height": 630, "alt": "…" }`. The file goes in `static/<domain>/`; the build fails without it. With it, previews use the large card. |
| `counterSince` | no | The day the visitor counter began, `YYYY-MM-DD`. The footer then reads "visitors since 6 October 2026:" before the counter, and "visitors:" without it. |
| `collapsedSections` | no | `true` shows each section of the list page closed: its heading opens it (no script). A link to a card inside, like `/#atlanter-details`, opens both. |
| `indexNowKey` | no | 8–128 letters, digits and dashes. The build serves it at `/<key>.txt`, and the deploy submits the indexed pages to IndexNow with it. Public by design. |
| `disclaimer` | no | One line shown small and dim at the top of every page of the site, e.g. how the content was gathered. |
| `related` | no | Hostnames of other sites the footer links to, e.g. `["byjoba.com"]`. Named here because each site's content can live in its own repo. |
| `sections` | yes | Ordered headings; each has a `title` and a `category`, and optionally a `note`: a line under the heading that says how to read the cards (or a list of lines, each shown on its own line), and an `order`: a list of entry ids in that section, shown first and in that order; the section's other entries follow in file order. |

An entry in `projects`:

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Lowercase slug, unique. The anchor: `byjoba.com/#kiwi`. |
| `name` | yes | Display name. |
| `site` | yes | The one domain the entry lives on. |
| `category` | yes | A category of a section on that site. |
| `summary` | yes | One phrase, shown on the card face without its closing full stop: what the thing is, or Jonas's part in it (e.g. "Drummer"). Details such as concerts go in `about`; a second sentence fails the build. |
| `about` | no | Short paragraph, shown when expanded. |
| `years` | no | Free text, e.g. `2016–`. |
| `status` | yes | Shown as a badge after the name. One of `in-development` (being made, not out yet), `active` (out or running, still worked on), `ended` (was active, has stopped), `one-off` (a single piece of work, delivered). |
| `role` | no | Shown after the summary. |
| `media` | no | List of `{ "label", "url" }` for YouTube videos (`https://www.youtube.com/watch?v=…`), NRK TV programmes (`https://tv.nrk.no/…/<programme id>`) and Spotify tracks (`https://open.spotify.com/track/…`). Shown when the entry is expanded as links that open the video or track on its own service in a new tab: a YouTube video with its thumbnail (loaded only when the entry is opened), NRK and Spotify with the item's optional `poster`, or the service's name without one. Nothing is embedded. `poster` is an https image on `gfx.nrk.no` or `i.scdn.co`, the hosts the pages' CSP allows: for NRK, an image from `https://psapi.nrk.no/playback/metadata/program/<programme id>` (`preplay.poster.images`, the 600 px one); for Spotify, the `thumbnail_url` from `https://open.spotify.com/oembed?url=<track url>`, with its host changed to `i.scdn.co`. The marker says how many there are. |
| `badges` | no | List of short texts stacked at the top right of the card's header. The music cards use `"live"` and `"studio"`. Any text works, on any entry, but a badge reads as a fact about the thing named, so do not use badges for Jonas's role; that goes in `summary`. |
| `url` | no | Where the name links to. Without it the name is plain text. `https://…`, or `/…` for a file under `static/<site>/`. |
| `releases` | no | List of `{ "title", "year", "url"?, "cover"? }`: the records the entry appears on, shown with their covers inside the opened card and counted in its marker. `cover` is a path to an image of our own under `static/<site>/`, e.g. `/covers/vidde.jpg`. |
| `shows` | no | Not written in `projects.json`: the lists live in `content/shows.json`, keyed by entry id, because they are many. Each is a list of `{ "date", "act"?, "event"?, "venue"?, "place"?, "country"?, "note"?, "review"? }`: the shows played with the act. `act` names the artist when it is not the card's own, as on the card for single concerts; the shows page counts each artist once. `event` is the festival, showcase or programme; `venue` is the physical place; `place` is the city. Every one of those names must be in `content/places.json` (see Places below), so one venue is always spelled one way. A festival on its own grounds is both the event and the venue (`"event": "Slottsfjell", "venue": "Slottsfjell"`) and is shown once. `country` is only for a show without a `place`; otherwise the country comes from the city. `review` is `{ "label", "url" }`, a published review of that show, labelled with the publication's name; it is validated but not shown on the pages for now. A site with shows also gets `/shows.html`, which lists them all in one table, newest first, under the site's name and a line that counts the shows, artists, venues, events, cities and countries; the list page links to it from its footer. `date` is `2019-08-07`, or `2019-08` or `2019` when that is all the source gives. `note` is for things like `stand-in`. A button inside the opened card opens the list in a popover (no script), and the marker counts them. Only shows Jonas played; a calendar entry is not proof of that, so check before adding. |
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

Entries appear in file order, after any a section's `order` names. A site's `sections` set the headings and their order; a section with no entries is left out. The build fails with a list of errors when the content is invalid.

## Search engines

Besides the pages, each build writes:

- `robots.txt`, which allows everything and names the sitemap.
- `sitemap.xml`: the list page, and the shows page when the site has one. Every entry's `lastmod` is the date of the content repo's last commit, so the build runs inside a git checkout. The contact and not-found pages are marked `noindex` and left out.
- `llms.txt`: the site as Markdown (llmstxt.org) for language models and agents: the title, description, pages, then every section and entry in page order, each entry linking to its card. It holds nothing the pages do not show.
- `<indexNowKey>.txt`, when the site has an IndexNow key.

In the pages:

- The list page's structured data starts with a `WebSite` node, which Google reads for the site name in results, followed by the site's `jsonLd` (byjoba.com an `Organization`, jonasbarsten.com a `ProfilePage` whose `Person` lists his profiles under `sameAs`).
- Every page carries Open Graph tags and, when the site has a `shareImage`, the large preview card.

After a deploy, `node site/indexnow.mjs --content <dir> --site <domain>` submits the indexed pages to IndexNow (Bing, and through it ChatGPT search and Copilot, plus Yandex, Seznam and Naver). Google does not take IndexNow and finds changes through the sitemap. Both domains are verified in Google Search Console, by TXT records in byjoba-iac (`txtRecords` in `WEB_SITES`), and imported from there into Bing Webmaster Tools.

On the live sites (2026-10-07), Lighthouse scores 100 for accessibility, best practices, SEO and agentic browsing on all three pages, and 99–100 for performance on mobile, 100 on desktop. Check again after a change to the markup or the stylesheet, against the live site, since the response headers (the CSP among them) come from CloudFront:

```bash
npx lighthouse https://byjoba.com/ --chrome-flags="--headless=new"                    # mobile
npx lighthouse https://byjoba.com/ --preset=desktop --chrome-flags="--headless=new"   # desktop
```

### Share images

A site's `share.png` (1200×630) is `tools/share-card.html` rendered with headless Chrome: the JB badge, the title, one or two lines, and the domain, on the favicon's near-black. The text comes from the address, a newline written `%0A`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 --screenshot=share.png \
  "file://$PWD/tools/share-card.html?title=byJoBa&line=Apps%2C%20music%20tools%20and%20hardware%0Amade%20by%20Jonas%20Barsten.&domain=byjoba.com"
```

Put the result in `static/<domain>/share.png` and keep the site's `shareImage.alt` in step with the text. jonasbarsten.com's is made the same way, with `title=Jonas%20Barsten&line=Drummer%20and%20musical%20director.%0AAlso%20creates%20tools%20and%20rooms%20for%20music.&domain=jonasbarsten.com`. Apps cache link previews, so a chat that already shows the link may keep the old image for a while.

## Deploy

Work happens on `dev`; a push to `dev` or a pull request runs `.github/workflows/ci.yml` (tests and build).

Merging to `main` runs `.github/workflows/deploy.yml` in the GitHub environment `production`, which only `main` may use. Only the owner may update `main`, so the merge is the approval and the deploy needs no further step: test, build, then `aws s3 sync --delete` of `dist/byjoba.com` to its bucket, a CloudFront invalidation and an IndexNow submission (a refused submission is a warning only). jonasbarsten.com deploys from its own repo, which checks out this one's `main` to build.

This repo holds no infrastructure. The buckets, the distributions and the deploy roles are in `byjoba-iac`; the visitor counter and the contact endpoint are byjoba-api's web service, which each site's distribution reaches at `/counter.svg` and `/contact`. The workflow assumes the role in the repository variable `AWS_DEPLOY_ROLE_ARN` (`byjoba-web-github-deploy-byjoba`), which trusts only this repo's `production` environment and can sync byjoba.com's bucket and invalidate its distribution and nothing else.

`main` is protected: it cannot be deleted or force-pushed, and only the owner may update it. Workflows from outside contributors need approval.

Editing from the phone: a Claude session on the repo (Claude Code on the web or in the Claude app) follows `CLAUDE.md`: it edits on `dev`, waits for CI, and for a content change merges `dev` into `main`, which deploys. Engine changes stay on `dev` for the owner to merge.

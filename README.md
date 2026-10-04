# byjoba-web

The pages at byjoba.com and jonasbarsten.com: two lists of what Jonas Barsten makes and works on, generated from one content file.

- **byjoba.com** lists the software and hardware Jonas makes on his own initiative. The name is written byJoBa and stands for "by Jonas Barsten".
- **jonasbarsten.com** lists everything else, and the byjoba entries as one-liners that link over.

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
| `status` | no | `wip` shows "in progress". |
| `role` | no | Shown after the summary. |
| `links` | no | List of `{ "label", "url" }`; `url` is `https://…`, or `/…` for a file under `static/<site>/`. |

Entries appear in file order. A site's `sections` set the headings and their order; a section with `"from": "<other domain>"` lists that site's entries as one-liners. The build fails with a list of errors when the content is invalid.

## Deploy

Not set up yet. Hosting, the visitor counter, the contact endpoint and the deploy workflow are plan 2 (`byjoba-tools/plans/`).

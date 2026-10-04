# byjoba-web

Two static sites generated from `content/projects.json`. Read `README.md` for the layout and the content model.

## Changing content

- Add, move or remove an entry by editing `content/projects.json` only. Moving an entry between sites is a change of `site` and `category`.
- Run `npm test` after every content change. The build refuses invalid content.
- Entries appear in file order. Within Music, current engagements come before past ones.

## Copy rules

The pages are purely informational: no voice, no pitch, no personality.

- An entry says what the thing is, what Jonas's part in it was, and when. Nothing else.
- No praise, ranking or scale words (famous, biggest, leading, popular, global).
- No audience figures, revenue or user counts.
- Facts that locate the work are fine in `about`: a tour, a festival, a venue, a collaborator, a year.
- No calls to action. Label links by what they are: site, source, profile, pdf.
- A fact found online is used only when the source is the artist, the venue, the label or an institution.

## Disclosure

- The entry named "TBC" is an unannounced product. Its summary holds technology notes only. Never add its real name, purpose, audience, market or domain to any file, test or commit message in this repo.
- Huba is co-owned and proprietary: one neutral line, no links.
- No email address, postal address or phone number goes in any page or file here. The contact address lives in an SSM parameter.

## Code

- `site/` has no dependencies and must stay that way.
- The list pages carry no script and no inline style.
- Videos and tracks go in `media`, not `links`: an artist's name does not link anywhere. The players load only when a reader opens the entry, so the page itself still calls no third party.
- Work on `dev`. Never push to `main`.

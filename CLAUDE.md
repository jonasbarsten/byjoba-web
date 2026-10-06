# byjoba-web

The generator (the engine) for byjoba.com and jonasbarsten.com, and byjoba.com's content in `content/projects.json`. jonasbarsten.com's content lives in the public repo `jonasbarsten/jonasbarsten.com`, which builds with this repo's generator at `main`. Read `README.md` for the layout and the content model.

## Changing content

- Add, change or remove a byjoba.com entry by editing `content/projects.json` only. Moving an entry to jonasbarsten.com means moving it into that repo's content, with its `site` and `category` changed.
- A generator change reaches jonasbarsten.com on its next deploy: run it against that repo's content before merging to `main` (see the README).
- Run `npm test` after every content change. The build refuses invalid content.
- To change where entries appear, edit the section's `order` (a list of ids shown first, in that order); don't move entries in the file. Entries it doesn't name follow in file order.

## Copy rules

The pages are purely informational: no voice, no pitch, no personality.

- An entry says what the thing is, what Jonas's part in it was, and when. Nothing else.
- The `summary` is one short phrase for the card face, e.g. "Drummer" or "Musical director". Concerts, venues and other details go in `about`. The build rejects a summary with a second sentence.
- No praise, ranking or scale words (famous, biggest, leading, popular, global).
- No audience figures, revenue or user counts.
- Facts that locate the work are fine in `about`: a tour, a festival, a venue, a collaborator, a year.
- No calls to action. Label links by what they are: site, source, profile, pdf.
- A fact found online is used only when the source is the artist, the venue, the label or an institution.

## Disclosure

This repo is public, and so is its history.

- The entry named "TBC" is an unannounced product. Its summary holds technology notes only. Never add its real name, purpose, audience, market or domain to any file, test or commit message in this repo.
- Huba is co-owned and proprietary: one neutral line, no links.
- No email address, postal address or phone number goes in any page or file here. The contact address lives in an SSM parameter.

## Code

- `site/` has no dependencies and must stay that way.
- The list pages carry no script and no inline style.
- Nothing in the Music section has a `url`: an artist's or a release's name does not link anywhere. Videos and tracks go in `media`, other pages in `links`; both show inside the opened card. A test enforces this. Videos and tracks are links to their own service, not embedded players (the players did not react to clicks); only a YouTube thumbnail loads from a third party, and only when a reader opens the entry.
- Work on `dev`. Never push to `main`.

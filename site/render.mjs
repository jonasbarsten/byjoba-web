import { mediaEmbed } from './media.mjs';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

/** Links that leave the page open in a new tab; links within the site (contact, home) do not. */
const NEW_TAB = ' target="_blank" rel="noopener"';

/** A JSON-LD data block. `<` is written as an escape so the data can never close the block. */
const jsonLdBlock = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

/**
 * The share image's tags, absolute as the Open Graph protocol requires. Without
 * one, link previews show the small card with the title and description only.
 */
function shareImageTags(site, domain) {
  const image = site.shareImage;
  if (!image) return ['<meta name="twitter:card" content="summary">'];
  return [
    `<meta property="og:image" content="https://${escapeHtml(domain)}${escapeHtml(image.path)}">`,
    `<meta property="og:image:width" content="${image.width}">`,
    `<meta property="og:image:height" content="${image.height}">`,
    `<meta property="og:image:alt" content="${escapeHtml(image.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ];
}

/**
 * The list page's structured data: a WebSite node, which Google reads for the
 * site name it shows in results, then the site's own nodes from the content.
 */
function siteJsonLd(site, domain) {
  const url = `https://${domain}/`;
  const website = { '@type': 'WebSite', '@id': `${url}#website`, name: site.title, alternateName: domain, url };
  const own = site.jsonLd ? [Object.fromEntries(Object.entries(site.jsonLd).filter(([key]) => key !== '@context'))] : [];
  return { '@context': 'https://schema.org', '@graph': [website, ...own] };
}

function page({ site, domain, title, description = site.description, canonical, index = false, jsonLd, body, scripts = '' }) {
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    index ? '' : '<meta name="robots" content="noindex">',
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : '',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:site_name" content="${escapeHtml(site.title)}">`,
    '<meta property="og:type" content="website">',
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : '',
    ...shareImageTags(site, domain),
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="stylesheet" href="/style.css">',
    jsonLd ? jsonLdBlock(jsonLd) : '',
  ].filter(Boolean);
  // The site's disclaimer, when it has one, is the first line of every page.
  const disclaimer = site.disclaimer ? `<p class="disclaimer">${escapeHtml(site.disclaimer)}</p>\n` : '';
  return `<!doctype html>\n<html lang="en">\n<head>\n${head.join('\n')}\n</head>\n<body>\n${disclaimer}${body}\n${scripts}</body>\n</html>\n`;
}

/**
 * Links to the site's related sites, e.g. `<a href="https://byjoba.com/">byjoba.com</a>`.
 * Named in the site's content, since each site's content lives in its own repo.
 */
function otherSites(content, domain) {
  return (content.sites[domain].related ?? []).map((other) => `<a href="https://${escapeHtml(other)}/"${NEW_TAB}>${escapeHtml(other)}</a>`);
}

const count = (n, word, plural = `${word}s`) => (n ? `${n} ${n === 1 ? word : plural}` : '');

/** What an opened card holds besides text, e.g. "2 videos · 1 track · 1 link"; empty when it holds none of those. */
function contentsHint(entry) {
  const kinds = (entry.media ?? []).map((item) => mediaEmbed(item.url).kind);
  return [
    count(entry.shows?.length ?? 0, 'show'),
    count(kinds.filter((kind) => kind === 'video').length, 'video'),
    count(kinds.filter((kind) => kind === 'track').length, 'track'),
    count(entry.releases?.length ?? 0, 'release'),
    count(entry.links?.length ?? 0, 'link'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The role, shown under the summary on the face of the card. */
const meta = (entry) => (entry.role ? `<span class="meta">${escapeHtml(entry.role)}</span>` : '');

/**
 * An entry's videos and tracks, each a link to it on its own service, opening in
 * a new tab. Embedded players did not react to clicks on the live pages. A
 * YouTube video shows its thumbnail; `loading="lazy"` keeps it from loading
 * until the entry is opened, so a reader who opens nothing reaches no third
 * party. NRK and Spotify show the item's `poster` when the content gives one
 * (looked up once and pinned there, so the build needs no network), and the
 * service's name otherwise.
 */
function mediaBlock(entry) {
  if (!entry.media?.length) return '';
  const figures = entry.media.map((item) => {
    const { kind, service, poster: thumbnail } = mediaEmbed(item.url);
    const poster = item.poster ?? thumbnail;
    const label = escapeHtml(item.label);
    const face = poster ? `<img src="${escapeHtml(poster)}" alt="" loading="lazy">` : `<span class="service">${service}</span>`;
    return `<figure class="${kind}"><a class="poster" href="${escapeHtml(item.url)}"${NEW_TAB} aria-label="${label}, on ${service}">${face}</a><figcaption>${label}</figcaption></figure>`;
  });
  const kinds = new Set(entry.media.map((item) => mediaEmbed(item.url).kind));
  const heading = kinds.size === 2 ? 'Videos and tracks' : kinds.has('video') ? 'Videos' : 'Tracks';
  return `<h3>${heading}</h3><div class="media">${figures.join('')}</div>`;
}

const STATUS_LABELS = { 'in-development': 'in development', active: 'active', ended: 'ended', 'one-off': 'one-off' };

/** The first line inside an opened card: the status as a badge, then the years when the entry has them. */
/**
 * The first line inside an opened card. Its id, `<entry id>-details`, is the
 * anchor that opens the card: a browser opens a closed <details> when a link's
 * target is inside its hidden content, with no script.
 */
function statusLine(entry) {
  const years = entry.years ? ` ${escapeHtml(entry.years)}` : '';
  return `<p class="status" id="${escapeHtml(entry.id)}-details"><span class="badge">${escapeHtml(STATUS_LABELS[entry.status])}</span>${years}</p>`;
}

/**
 * One entry as a card. Its face holds the name, the summary and the role. The
 * name is a link only when the entry has a `url`; `links` never touch the name.
 *
 * Every card opens, since every entry has a status: inside come the status and
 * years, then the about, releases, links and media. The "more" marker on the
 * face says what is inside when that is more than text.
 */
function renderEntry(entry, places) {
  const name = entry.url
    ? `<a class="name" href="${escapeHtml(entry.url)}"${NEW_TAB}>${escapeHtml(entry.name)}</a>`
    : `<span class="name">${escapeHtml(entry.name)}</span>`;
  // Free-form labels at the top right of the header, such as "live" and "studio" on the music cards.
  const badges = entry.badges?.length
    ? `<span class="badges">${entry.badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join('')}</span>`
    : '';
  // The card face shows the summary without its closing full stop; a stop between sentences stays.
  const summary = entry.summary.replace(/\.$/, '');
  const face = `<span class="head">${name}${badges}</span><span class="summary">${escapeHtml(summary)}</span>${meta(entry)}`;
  const about = entry.about ? `<p>${escapeHtml(entry.about)}</p>` : '';
  const links = entry.links?.length
    ? `<h3>Links</h3><p class="links">${entry.links.map((link) => `<a href="${escapeHtml(link.url)}"${NEW_TAB}>${escapeHtml(link.label)}</a>`).join(' · ')}</p>`
    : '';
  const more = `<span class="more">${escapeHtml(contentsHint(entry) || 'More')}</span>`;
  return `<li id="${escapeHtml(entry.id)}"><details><summary>${face}${more}</summary>${statusLine(entry)}${about}${showList(entry, places)}${releaseList(entry)}${links}${mediaBlock(entry)}</details></li>`;
}

/**
 * The records an entry appears on: cover, title and year, the title linked when
 * the release has a url. The cover is decorative next to its caption, hence the
 * empty alt; a release without one gets a blank square so the row stays even.
 */
function releaseList(entry) {
  if (!entry.releases?.length) return '';
  const figures = entry.releases.map((release) => {
    const image = release.cover
      ? `<img src="${escapeHtml(release.cover)}" alt="" width="96" height="96" loading="lazy">`
      : '<span class="nocover"></span>';
    // The cover links like the title, as a larger target; the title is the link
    // keyboards and screen readers use, so the cover stays out of their way.
    const cover = release.url && release.cover
      ? `<a class="cover" href="${escapeHtml(release.url)}"${NEW_TAB} tabindex="-1" aria-hidden="true">${image}</a>`
      : image;
    const title = release.url
      ? `<a href="${escapeHtml(release.url)}"${NEW_TAB}>${escapeHtml(release.title)}</a>`
      : escapeHtml(release.title);
    return `<figure>${cover}<figcaption>${title} <span class="year">${escapeHtml(release.year)}</span></figcaption></figure>`;
  });
  return `<h3>Releases</h3><div class="releases">${figures.join('')}</div>`;
}

/** "2013-08-07" as "07.08.13"; a day or month the date lacks is dashes: "––.08.13", "––.––.13". */
function showDate(date) {
  const [year, month = '––', day = '––'] = date.split('-');
  return `${day}.${month}.${year.slice(2)}`;
}

/**
 * The shows played with an act: a button inside the opened card, and the list
 * it opens. The list is a popover, which the browser opens and closes itself,
 * so the page still carries no script.
 */
const cell = (value) => `<td>${value ? escapeHtml(value) : ''}</td>`;

/** A show's date cell. */
const dateCell = (show) => `<td><time datetime="${escapeHtml(show.date)}">${showDate(show.date)}</time></td>`;

/** A show's country cell: the code, which expands to the country's name. */
function countryCell(show, places) {
  const code = countryOf(show, places);
  if (!code) return '<td></td>';
  return `<td><abbr title="${escapeHtml(places.countries[code])}">${escapeHtml(code)}</abbr></td>`;
}

/** A show's country code: its city's, or its own when it names no city. */
const countryOf = (show, places) => (show.place ? places.cities[show.place] : show.country);

/** A show's event and venue in one cell; a festival on its own grounds is both, and is named once. */
const whereCell = (show) => cell([...new Set([show.event, show.venue].filter(Boolean))].join(' · '));

/**
 * A show's last cell: its note, when it has one. A show's `review` stays in the
 * content but is not shown: the owner took the reviews off the pages for now.
 */
function noteCell(show, { withAct = false } = {}) {
  const parts = [];
  // A card's own list has no act column, so an act other than the card's goes first in the note.
  if (withAct && show.act) parts.push(escapeHtml(show.act));
  // On the shows page the act has its own column; the note says the show is not one of a card's own.
  if (!withAct && show.act) parts.push('stand-in / one-off');
  if (show.note) parts.push(escapeHtml(show.note));
  return `<td>${parts.join(' · ')}</td>`;
}

/** A table of shows: its columns named in a header row, then the rows. */
function showTable(columns, rows) {
  const head = columns.map((column) => `<th scope="col">${column}</th>`).join('');
  return `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${rows.join('\n')}\n</tbody>\n</table>`;
}

/** Newest first; the dates are ISO, so text order is date order. */
const newestFirst = (shows) => [...shows].sort((a, b) => b.date.localeCompare(a.date));

function showList(entry, places) {
  if (!entry.shows?.length) return '';
  const id = `shows-${escapeHtml(entry.id)}`;
  const total = count(entry.shows.length, 'show');
  const rows = newestFirst(entry.shows).map((show) => `<tr>${dateCell(show)}${whereCell(show)}${cell(show.place)}${countryCell(show, places)}${noteCell(show, { withAct: true })}</tr>`);
  const button = `<h3>Shows</h3><p><button type="button" class="open-shows" popovertarget="${id}">List of ${total}</button></p>`;
  // The heading row also links to every show on the site, at the top right.
  const head = `<div class="popover-head"><h3>${escapeHtml(entry.name)}: ${total}</h3><a href="/shows.html">All shows</a></div>`;
  return `${button}<div id="${id}" class="shows" popover>${head}${showTable(['Date', 'Event, venue', 'Place', 'Country', 'Note'], rows)}</div>`;
}

/** A section's entries: those its `order` names first, in that order, then the rest in file order. */
function sectionEntries(content, domain, section) {
  const order = section.order ?? [];
  const rank = (entry) => (order.includes(entry.id) ? order.indexOf(entry.id) : order.length);
  // Array.prototype.sort is stable, so entries of equal rank keep their file order.
  return content.projects.filter((entry) => entry.site === domain && entry.category === section.category).sort((a, b) => rank(a) - rank(b));
}

function renderSection(content, domain, section) {
  const items = sectionEntries(content, domain, section).map((entry) => renderEntry(entry, content.places));
  if (items.length === 0) return '';
  // An optional line under the heading that says how to read the cards below it.
  // A note given as a list shows each line on its own line.
  const note = section.note ? `<p class="note">${[section.note].flat().map(escapeHtml).join('<br>')}</p>\n` : '';
  return `<section>\n<h2>${escapeHtml(section.title)}</h2>\n${note}<ul>\n${items.join('\n')}\n</ul>\n</section>`;
}

/** Every show on a site, each with the entry it belongs to. */
function siteShows(content, domain) {
  return content.projects
    .filter((entry) => entry.site === domain)
    .flatMap((entry) => (entry.shows ?? []).map((show) => ({ ...show, entry })));
}

/**
 * What a list of shows spans, e.g. "76 artists, 969 shows, 396 venues, 151 events, 207 cities
 * and 33 countries", and the lists its counts open. A venue counts once per city: two towns
 * can each have a Kulturhuset.
 */
function showTotals(shows, places) {
  const tallies = [
    tally(shows, 'artists', 'artist', 'artists', actOf),
    { text: count(shows.length, 'show'), list: '' },
    tally(shows, 'venues', 'venue', 'venues', (show) => show.venue && [show.venue, show.place].filter(Boolean).join(', ')),
    tally(shows, 'events', 'event', 'events', (show) => show.event),
    tally(shows, 'cities', 'city', 'cities', (show) => show.place),
    tally(shows, 'countries', 'country', 'countries', (show) => places.countries[countryOf(show, places)]),
  ].filter((part) => part.text);
  const texts = tallies.map((part) => part.text);
  const line = texts.length > 1 ? `${texts.slice(0, -1).join(', ')} and ${texts.at(-1)}` : texts[0];
  return { line, lists: tallies.map((part) => part.list).join('') };
}

/**
 * One of the counts, as a button that opens the list of what it counts: each
 * name with its number of shows, most shows first. The list is a popover, so
 * the page carries no script. Nothing to count gives no text.
 */
function tally(shows, id, word, plural, label) {
  const numbers = new Map();
  for (const name of shows.map(label).filter(Boolean)) numbers.set(name, (numbers.get(name) ?? 0) + 1);
  if (numbers.size === 0) return { text: '', list: '' };
  const heading = count(numbers.size, word, plural);
  const items = [...numbers]
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b, 'nb'))
    .map(([name, number]) => `<li>${escapeHtml(name)} (${number})</li>`);
  return {
    text: `<button type="button" class="count" popovertarget="tally-${id}">${heading}</button>`,
    list: `<div id="tally-${id}" class="shows" popover><h3>${heading}</h3><ol class="tally">\n${items.join('\n')}\n</ol></div>`,
  };
}

/** Who a show was played with: the act it names, or the one its card is about. */
const actOf = (show) => show.act ?? show.entry.name;

/** The act cell: a card's own act links to the card; an act played with once or as a stand-in has no card to link to. */
// The act links to its card's details anchor, which opens the card.
const actCell = (show) => (show.act ? cell(show.act) : `<td><a href="/#${escapeHtml(show.entry.id)}-details">${escapeHtml(show.entry.name)}</a></td>`);

/** Whether a site has a shows page. */
export const hasShows = (content, domain) => siteShows(content, domain).length > 0;

/** All of a site's shows on one page: one table, newest first, the act linking to its card. */
export function renderShows(content, domain) {
  const site = content.sites[domain];
  const shows = newestFirst(siteShows(content, domain));
  // A stand-in or one-off (a show with its own act) is marked so the stylesheet can dim it.
  const rows = shows.map((show) => `<tr${show.act ? ' class="one-off"' : ''}>${dateCell(show)}${actCell(show)}${whereCell(show)}${cell(show.place)}${countryCell(show, content.places)}${noteCell(show)}</tr>`);
  const totals = showTotals(shows, content.places);
  const body = [
    `<header>\n<h1>Shows</h1>\n<p><a href="/">${escapeHtml(site.title)}</a> · ${totals.line}.</p>\n${totals.lists}\n</header>`,
    `<main>\n${showTable(['Date', 'Act', 'Event, venue', 'Place', 'Country', 'Note'], rows)}\n</main>`,
  ].join('\n');
  const description = `The ${count(shows.length, 'show')} ${site.title} has played: date, act, event, venue, place and country.`;
  return page({ site, domain, title: `Shows — ${site.title}`, description, canonical: `https://${domain}/shows.html`, index: true, body });
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "visitors", and since when when the site names the day its counter began: "visitors since 6 October 2026". */
function counterLabel(site) {
  if (!site.counterSince) return 'visitors';
  const [year, month, day] = site.counterSince.split('-').map(Number);
  return `visitors since <time datetime="${site.counterSince}">${day} ${MONTHS[month - 1]} ${year}</time>`;
}

export function renderIndex(content, domain) {
  const site = content.sites[domain];
  const others = [hasShows(content, domain) ? '<a href="/shows.html">shows</a>' : '', ...otherSites(content, domain)].filter(Boolean).join(' · ');
  const sections = site.sections.map((section) => renderSection(content, domain, section)).filter(Boolean);
  const body = [
    `<header>\n<h1>${escapeHtml(site.title)}</h1>\n<p>${escapeHtml(site.intro)}</p>\n</header>`,
    `<main>\n${sections.join('\n')}\n</main>`,
    `<footer>\n<p>${others} · <a href="/contact.html">contact</a></p>\n<p>${counterLabel(site)}: <img src="/counter.svg" alt="visitor counter" width="88" height="20"></p>\n</footer>`,
  ].join('\n');
  return page({ site, domain, title: site.pageTitle, canonical: `https://${domain}/`, index: true, jsonLd: siteJsonLd(site, domain), body });
}

export function renderContact(content, domain) {
  const site = content.sites[domain];
  const body = [
    `<header>\n<h1>Contact</h1>\n<p><a href="/">${escapeHtml(site.title)}</a></p>\n</header>`,
    `<main>\n<div id="turnstile" data-sitekey="${escapeHtml(site.turnstileSiteKey)}"></div>\n<p id="contact-result" hidden></p>\n<noscript><p>Showing the address needs JavaScript.</p></noscript>\n</main>`,
  ].join('\n');
  const scripts = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>\n<script src="/contact.js" defer></script>\n';
  return page({ site, domain, title: `Contact — ${site.title}`, canonical: `https://${domain}/contact.html`, body, scripts });
}

export function renderNotFound(content, domain) {
  const site = content.sites[domain];
  const body = `<main>\n<h1>Not found</h1>\n<p><a href="/">${escapeHtml(site.title)}</a></p>\n</main>`;
  return page({ site, domain, title: `Not found — ${site.title}`, body });
}

/** Text for a Markdown link label: brackets escaped so they cannot end the label. */
const markdownLabel = (text) => text.replace(/[[\]]/g, (bracket) => `\\${bracket}`);
/** Text ending in one full stop. */
const stop = (text) => `${text.replace(/\.$/, '')}.`;
/** A lowercase label, such as a role or a status, as a sentence. */
const sentence = (text) => stop(`${text.charAt(0).toUpperCase()}${text.slice(1)}`);

/** One entry as a Markdown list item: its name linking to its card, then summary, role, years and status, and about. */
function llmsEntry(entry, domain) {
  const status = STATUS_LABELS[entry.status];
  const when = entry.years ? `${entry.years}, ${status}` : status;
  const parts = [stop(entry.summary), entry.role ? sentence(entry.role) : '', sentence(when), entry.about ?? ''].filter(Boolean);
  return `- [${markdownLabel(entry.name)}](https://${domain}/#${entry.id}): ${parts.join(' ')}`;
}

/**
 * The site as Markdown at /llms.txt (llmstxt.org), for language models and agents
 * that would rather not parse the HTML: the title, the description, the pages,
 * then every section and its entries in the order the list page shows them.
 */
export function renderLlmsTxt(content, domain) {
  const site = content.sites[domain];
  const shows = siteShows(content, domain);
  const pages = [
    `- [The list](https://${domain}/): every entry, with its links, videos and releases`,
    shows.length ? `- [Shows](https://${domain}/shows.html): ${count(shows.length, 'show')}, with date, act, event, venue, place and country` : '',
    ...(site.related ?? []).map((other) => `- [${other}](https://${other}/)`),
  ].filter(Boolean);
  const sections = site.sections.flatMap((section) => {
    const entries = sectionEntries(content, domain, section);
    if (entries.length === 0) return [];
    const note = section.note ? [[section.note].flat().join(' '), ''] : [];
    return [`## ${section.title}`, '', ...note, ...entries.map((entry) => llmsEntry(entry, domain)), ''];
  });
  const intro = [site.intro, site.disclaimer].filter(Boolean).join(' ');
  return [`# ${site.title}`, '', `> ${site.description}`, '', intro, '', ...pages, '', ...sections].join('\n');
}

export function renderRobots(domain) {
  return `User-agent: *\nAllow: /\n\nSitemap: https://${domain}/sitemap.xml\n`;
}

/** The pages worth indexing: the list page, and the shows page when the site has one. The contact and not-found pages are marked noindex. */
export const indexedUrls = (content, domain) => (hasShows(content, domain) ? ['', 'shows.html'] : ['']).map((path) => `https://${domain}/${path}`);

/** `lastModified` (YYYY-MM-DD), when given, is the date the content last changed; every page is built from it. */
export function renderSitemap(content, domain, lastModified) {
  const lastmod = lastModified ? `<lastmod>${escapeHtml(lastModified)}</lastmod>` : '';
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...indexedUrls(content, domain).map((url) => `<url><loc>${escapeHtml(url)}</loc>${lastmod}</url>`),
    '</urlset>',
    '',
  ].join('\n');
}

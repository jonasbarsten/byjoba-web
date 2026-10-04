import { mediaEmbed } from './media.mjs';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

/** Links that leave the page open in a new tab; links within the site (contact, home) do not. */
const NEW_TAB = ' target="_blank" rel="noopener"';

/** A JSON-LD data block. `<` is written as an escape so the data can never close the block. */
const jsonLdBlock = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

function page({ site, title, description = site.description, canonical, index = false, jsonLd, body, scripts = '' }) {
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
    '<meta name="twitter:card" content="summary">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="stylesheet" href="/style.css">',
    jsonLd ? jsonLdBlock(jsonLd) : '',
  ].filter(Boolean);
  return `<!doctype html>\n<html lang="en">\n<head>\n${head.join('\n')}\n</head>\n<body>\n${body}\n${scripts}</body>\n</html>\n`;
}

/** Links to every other site, e.g. `<a href="https://byjoba.com/">byjoba.com</a>`. */
function otherSites(content, domain) {
  return Object.keys(content.sites)
    .filter((other) => other !== domain)
    .map((other) => `<a href="https://${escapeHtml(other)}/"${NEW_TAB}>${escapeHtml(other)}</a>`);
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
 * Small players for an entry's videos and tracks. `loading="lazy"` keeps them
 * from loading until the entry is opened, so a reader who opens nothing reaches
 * no third party. YouTube refuses to play without a referrer, hence the policy.
 */
function mediaBlock(entry) {
  if (!entry.media?.length) return '';
  const figures = entry.media.map((item) => {
    const { kind, src } = mediaEmbed(item.url);
    const label = escapeHtml(item.label);
    const allow = kind === 'video' ? 'allow="encrypted-media; picture-in-picture" allowfullscreen' : 'allow="encrypted-media"';
    return `<figure class="${kind}"><iframe src="${escapeHtml(src)}" title="${label}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" ${allow}></iframe><figcaption>${label}</figcaption></figure>`;
  });
  const kinds = new Set(entry.media.map((item) => mediaEmbed(item.url).kind));
  const heading = kinds.size === 2 ? 'Videos and tracks' : kinds.has('video') ? 'Videos' : 'Tracks';
  return `<h3>${heading}</h3><div class="media">${figures.join('')}</div>`;
}

const STATUS_LABELS = { 'in-development': 'in development', active: 'active', ended: 'ended', 'one-off': 'one-off' };

/** The first line inside an opened card: the status as a badge, then the years when the entry has them. */
function statusLine(entry) {
  const years = entry.years ? ` ${escapeHtml(entry.years)}` : '';
  return `<p class="status"><span class="badge">${escapeHtml(STATUS_LABELS[entry.status])}</span>${years}</p>`;
}

/**
 * One entry as a card. Its face holds the name, the summary and the role. The
 * name is a link only when the entry has a `url`; `links` never touch the name.
 *
 * Every card opens, since every entry has a status: inside come the status and
 * years, then the about, releases, links and media. The "more" marker on the
 * face says what is inside when that is more than text.
 */
function renderEntry(entry, countries) {
  const name = entry.url
    ? `<a class="name" href="${escapeHtml(entry.url)}"${NEW_TAB}>${escapeHtml(entry.name)}</a>`
    : `<span class="name">${escapeHtml(entry.name)}</span>`;
  // Free-form labels at the top right of the header, such as "live" and "studio" on the music cards.
  const badges = entry.badges?.length
    ? `<span class="badges">${entry.badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join('')}</span>`
    : '';
  const face = `<span class="head">${name}${badges}</span><span class="summary">${escapeHtml(entry.summary)}</span>${meta(entry)}`;
  const about = entry.about ? `<p>${escapeHtml(entry.about)}</p>` : '';
  const links = entry.links?.length
    ? `<h3>Links</h3><p class="links">${entry.links.map((link) => `<a href="${escapeHtml(link.url)}"${NEW_TAB}>${escapeHtml(link.label)}</a>`).join(' · ')}</p>`
    : '';
  const more = `<span class="more">${escapeHtml(contentsHint(entry) || 'More')}</span>`;
  return `<li id="${escapeHtml(entry.id)}"><details><summary>${face}${more}</summary>${statusLine(entry)}${about}${showList(entry, countries)}${releaseList(entry)}${links}${mediaBlock(entry)}</details></li>`;
}

/**
 * The records an entry appears on: cover, title and year, the title linked when
 * the release has a url. The cover is decorative next to its caption, hence the
 * empty alt; a release without one gets a blank square so the row stays even.
 */
function releaseList(entry) {
  if (!entry.releases?.length) return '';
  const figures = entry.releases.map((release) => {
    const cover = release.cover
      ? `<img src="${escapeHtml(release.cover)}" alt="" width="96" height="96" loading="lazy">`
      : '<span class="nocover"></span>';
    const title = release.url
      ? `<a href="${escapeHtml(release.url)}"${NEW_TAB}>${escapeHtml(release.title)}</a>`
      : escapeHtml(release.title);
    return `<figure>${cover}<figcaption>${title} <span class="year">${escapeHtml(release.year)}</span></figcaption></figure>`;
  });
  return `<h3>Releases</h3><div class="releases">${figures.join('')}</div>`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2013-08-07" as "7 Aug 2013", "2013-08" as "Aug 2013", "2013" as it is. */
function showDate(date) {
  const [year, month, day] = date.split('-');
  return [day && Number(day), month && MONTHS[Number(month) - 1], year].filter(Boolean).join(' ');
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
function countryCell(show, countries) {
  if (!show.country) return '<td></td>';
  return `<td><abbr title="${escapeHtml(countries[show.country])}">${escapeHtml(show.country)}</abbr></td>`;
}

/** A show's last cell: its note, then a link to a review of it, when it has them. */
function noteCell(show) {
  const parts = [];
  if (show.note) parts.push(escapeHtml(show.note));
  if (show.review) parts.push(`<a href="${escapeHtml(show.review.url)}"${NEW_TAB}>${escapeHtml(show.review.label)}</a>`);
  return `<td>${parts.join(' · ')}</td>`;
}

/** A table of shows: its columns named in a header row, then the rows. */
function showTable(columns, rows) {
  const head = columns.map((column) => `<th scope="col">${column}</th>`).join('');
  return `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${rows.join('\n')}\n</tbody>\n</table>`;
}

/** Newest first; the dates are ISO, so text order is date order. */
const newestFirst = (shows) => [...shows].sort((a, b) => b.date.localeCompare(a.date));

function showList(entry, countries) {
  if (!entry.shows?.length) return '';
  const id = `shows-${escapeHtml(entry.id)}`;
  const total = count(entry.shows.length, 'show');
  const rows = newestFirst(entry.shows).map((show) => `<tr>${dateCell(show)}${cell(show.venue)}${cell(show.place)}${countryCell(show, countries)}${noteCell(show)}</tr>`);
  const button = `<h3>Shows</h3><p><button type="button" class="open-shows" popovertarget="${id}">List of ${total}</button></p>`;
  return `${button}<div id="${id}" class="shows" popover><h3>${escapeHtml(entry.name)}: ${total}</h3>${showTable(['Date', 'Venue', 'Place', 'Country', 'Note'], rows)}</div>`;
}

function renderSection(content, domain, section) {
  const items = content.projects.filter((entry) => entry.site === domain && entry.category === section.category).map((entry) => renderEntry(entry, content.countries));
  if (items.length === 0) return '';
  // An optional line under the heading that says how to read the cards below it.
  const note = section.note ? `<p class="note">${escapeHtml(section.note)}</p>\n` : '';
  return `<section>\n<h2>${escapeHtml(section.title)}</h2>\n${note}<ul>\n${items.join('\n')}\n</ul>\n</section>`;
}

/** Every show on a site, each with the entry it belongs to. */
function siteShows(content, domain) {
  return content.projects
    .filter((entry) => entry.site === domain)
    .flatMap((entry) => (entry.shows ?? []).map((show) => ({ ...show, entry })));
}

/**
 * What a list of shows spans, e.g. "954 shows, 477 venues, 215 cities and 33 countries".
 * A venue counts once per city, and a city once per country: two towns can each have a Kulturhuset.
 */
function showTotals(shows) {
  const distinct = (key) => new Set(shows.map(key).filter(Boolean)).size;
  const parts = [
    count(shows.length, 'show'),
    count(distinct((show) => show.venue && [show.venue, show.place, show.country].join('\n')), 'venue'),
    count(distinct((show) => show.place && [show.place, show.country].join('\n')), 'city', 'cities'),
    count(distinct((show) => show.country), 'country', 'countries'),
  ].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
}

/** Whether a site has a shows page. */
export const hasShows = (content, domain) => siteShows(content, domain).length > 0;

/** All of a site's shows on one page: a table per year, newest first, the act linking to its card. */
export function renderShows(content, domain) {
  const site = content.sites[domain];
  const shows = newestFirst(siteShows(content, domain));
  const years = [...new Set(shows.map((show) => show.date.slice(0, 4)))];
  const tables = years.map((year) => {
    const rows = shows
      .filter((show) => show.date.startsWith(year))
      .map((show) => `<tr>${dateCell(show)}<td><a href="/#${escapeHtml(show.entry.id)}">${escapeHtml(show.entry.name)}</a></td>${cell(show.venue)}${cell(show.place)}${countryCell(show, content.countries)}${noteCell(show)}</tr>`);
    return `<section>\n<h2>${year}</h2>\n${showTable(['Date', 'Act', 'Venue', 'Place', 'Country', 'Note'], rows)}\n</section>`;
  });
  const body = [
    `<header>\n<h1>Shows</h1>\n<p><a href="/">${escapeHtml(site.title)}</a> · ${showTotals(shows)}, newest first.</p>\n</header>`,
    `<main>\n${tables.join('\n')}\n</main>`,
  ].join('\n');
  const description = `The ${count(shows.length, 'show')} ${site.title} has played, by year: date, act, venue, place and country.`;
  return page({ site, title: `Shows — ${site.title}`, description, canonical: `https://${domain}/shows.html`, index: true, body });
}

export function renderIndex(content, domain) {
  const site = content.sites[domain];
  const others = [hasShows(content, domain) ? '<a href="/shows.html">shows</a>' : '', ...otherSites(content, domain)].filter(Boolean).join(' · ');
  const sections = site.sections.map((section) => renderSection(content, domain, section)).filter(Boolean);
  const body = [
    `<header>\n<h1>${escapeHtml(site.title)}</h1>\n<p>${escapeHtml(site.intro)}</p>\n</header>`,
    `<main>\n${sections.join('\n')}\n</main>`,
    `<footer>\n<p>${others} · <a href="/contact.html">contact</a></p>\n<p><img src="/counter.svg" alt="visitor counter" width="88" height="20"></p>\n</footer>`,
  ].join('\n');
  return page({ site, title: site.pageTitle, canonical: `https://${domain}/`, index: true, jsonLd: site.jsonLd, body });
}

export function renderContact(content, domain) {
  const site = content.sites[domain];
  const body = [
    `<header>\n<h1>Contact</h1>\n<p><a href="/">${escapeHtml(site.title)}</a></p>\n</header>`,
    `<main>\n<div id="turnstile" data-sitekey="${escapeHtml(site.turnstileSiteKey)}"></div>\n<p id="contact-result" hidden></p>\n<noscript><p>Showing the address needs JavaScript.</p></noscript>\n</main>`,
  ].join('\n');
  const scripts = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>\n<script src="/contact.js" defer></script>\n';
  return page({ site, title: `Contact — ${site.title}`, canonical: `https://${domain}/contact.html`, body, scripts });
}

export function renderNotFound(content, domain) {
  const site = content.sites[domain];
  const body = `<main>\n<h1>Not found</h1>\n<p><a href="/">${escapeHtml(site.title)}</a></p>\n</main>`;
  return page({ site, title: `Not found — ${site.title}`, body });
}

export function renderRobots(domain) {
  return `User-agent: *\nAllow: /\n\nSitemap: https://${domain}/sitemap.xml\n`;
}

/** The list page and the shows page are worth indexing; the contact and not-found pages are marked noindex. */
export function renderSitemap(content, domain) {
  const paths = hasShows(content, domain) ? ['', 'shows.html'] : [''];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => `<url><loc>https://${escapeHtml(domain)}/${path}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

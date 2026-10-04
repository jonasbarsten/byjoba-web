import { mediaEmbed } from './media.mjs';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

/** Links that leave the page open in a new tab; links within the site (contact, home) do not. */
const NEW_TAB = ' target="_blank" rel="noopener"';

/** A JSON-LD data block. `<` is written as an escape so the data can never close the block. */
const jsonLdBlock = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

function page({ site, title, canonical, index = false, body, scripts = '' }) {
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(site.description)}">`,
    index ? '' : '<meta name="robots" content="noindex">',
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : '',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(site.description)}">`,
    `<meta property="og:site_name" content="${escapeHtml(site.title)}">`,
    '<meta property="og:type" content="website">',
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : '',
    '<meta name="twitter:card" content="summary">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="stylesheet" href="/style.css">',
    index && site.jsonLd ? jsonLdBlock(site.jsonLd) : '',
  ].filter(Boolean);
  return `<!doctype html>\n<html lang="en">\n<head>\n${head.join('\n')}\n</head>\n<body>\n${body}\n${scripts}</body>\n</html>\n`;
}

/** Links to every other site, e.g. `<a href="https://byjoba.com/">byjoba.com</a>`. */
function otherSites(content, domain) {
  return Object.keys(content.sites)
    .filter((other) => other !== domain)
    .map((other) => `<a href="https://${escapeHtml(other)}/"${NEW_TAB}>${escapeHtml(other)}</a>`);
}

const count = (n, word) => (n ? `${n} ${word}${n === 1 ? '' : 's'}` : '');

/** What media an entry holds, e.g. "2 videos · 1 track"; empty when it has none. */
function mediaHint(entry) {
  const kinds = (entry.media ?? []).map((item) => mediaEmbed(item.url).kind);
  return [count(kinds.filter((kind) => kind === 'video').length, 'video'), count(kinds.filter((kind) => kind === 'track').length, 'track')]
    .filter(Boolean)
    .join(' · ');
}

/** Role and years, shown under the summary. */
function meta(entry) {
  const parts = [entry.role, entry.years].filter(Boolean);
  return parts.length ? `<span class="meta">${escapeHtml(parts.join(' · '))}</span>` : '';
}

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
  return `<div class="media">${figures.join('')}</div>`;
}

/** The entry's status as a badge after its name. The label is the status with its hyphen read as a space, except one-off. */
const STATUS_LABELS = { 'in-development': 'in development', active: 'active', ended: 'ended', 'one-off': 'one-off' };
const badge = (entry) => ` <span class="badge">${escapeHtml(STATUS_LABELS[entry.status])}</span>`;

/**
 * One entry as a card: name and status on the first row, then the summary, then
 * role and years. The name is the entry's first link when it has one.
 *
 * A card with an about, further links or media opens. Only those carry the
 * "more" marker, which names the media inside when there is any.
 */
function renderEntry(entry) {
  const [first, ...rest] = entry.links ?? [];
  const name = first
    ? `<a class="name" href="${escapeHtml(first.url)}"${NEW_TAB}>${escapeHtml(entry.name)}</a>`
    : `<span class="name">${escapeHtml(entry.name)}</span>`;
  const face = `<span class="head">${name}${badge(entry)}</span><span class="summary">${escapeHtml(entry.summary)}</span>${meta(entry)}`;
  const id = escapeHtml(entry.id);
  const media = mediaBlock(entry);
  if (!entry.about && rest.length === 0 && !media) return `<li id="${id}">${face}</li>`;
  const about = entry.about ? `<p>${escapeHtml(entry.about)}</p>` : '';
  const links = rest.length
    ? `<p class="links">${rest.map((link) => `<a href="${escapeHtml(link.url)}"${NEW_TAB}>${escapeHtml(link.label)}</a>`).join(' · ')}</p>`
    : '';
  const more = `<span class="more">${escapeHtml(mediaHint(entry) || 'More')}</span>`;
  return `<li id="${id}"><details><summary>${face}${more}</summary>${about}${links}${media}</details></li>`;
}

function renderSection(content, domain, section) {
  const items = content.projects.filter((entry) => entry.site === domain && entry.category === section.category).map(renderEntry);
  if (items.length === 0) return '';
  return `<section>\n<h2>${escapeHtml(section.title)}</h2>\n<ul>\n${items.join('\n')}\n</ul>\n</section>`;
}

export function renderIndex(content, domain) {
  const site = content.sites[domain];
  const others = otherSites(content, domain).join(' · ');
  const sections = site.sections.map((section) => renderSection(content, domain, section)).filter(Boolean);
  const body = [
    `<header>\n<h1>${escapeHtml(site.title)}</h1>\n<p>${escapeHtml(site.intro)}</p>\n</header>`,
    `<main>\n${sections.join('\n')}\n</main>`,
    `<footer>\n<p>${others} · <a href="/contact.html">contact</a></p>\n<p><img src="/counter.svg" alt="visitor counter" width="88" height="20"></p>\n</footer>`,
  ].join('\n');
  return page({ site, title: site.pageTitle, canonical: `https://${domain}/`, index: true, body });
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

/** Only the list page is worth indexing; the contact and not-found pages are marked noindex. */
export function renderSitemap(domain) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `<url><loc>https://${escapeHtml(domain)}/</loc></url>`,
    '</urlset>',
    '',
  ].join('\n');
}

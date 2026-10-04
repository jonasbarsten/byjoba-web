const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

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
    .map((other) => `<a href="https://${escapeHtml(other)}/">${escapeHtml(other)}</a>`);
}

/** Role, years and status, shown after the summary on the entry's own site. */
function meta(entry) {
  const parts = [entry.role, entry.years, entry.status === 'wip' ? 'in progress' : ''].filter(Boolean);
  return parts.length ? ` <span class="meta">${escapeHtml(parts.join(' · '))}</span>` : '';
}

/** An entry on its own site: a plain line, or a disclosure when it has an about or links. */
function fullEntry(entry) {
  const head = `<span class="name">${escapeHtml(entry.name)}</span> — ${escapeHtml(entry.summary)}${meta(entry)}`;
  const id = escapeHtml(entry.id);
  if (!entry.about && !entry.links?.length) return `<li id="${id}">${head}</li>`;
  const about = entry.about ? `<p>${escapeHtml(entry.about)}</p>` : '';
  const links = entry.links?.length
    ? `<p class="links">${entry.links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join(' · ')}</p>`
    : '';
  return `<li id="${id}"><details><summary>${head}</summary>${about}${links}</details></li>`;
}

/** An entry shown on the other site: name and summary only, the name linking to its home. */
function linkedEntry(entry) {
  const id = escapeHtml(entry.id);
  const name = `<a href="https://${escapeHtml(entry.site)}/#${id}">${escapeHtml(entry.name)}</a>`;
  return `<li id="${id}">${name} — ${escapeHtml(entry.summary)}</li>`;
}

function renderSection(content, domain, section) {
  const items = section.from
    ? content.projects.filter((entry) => entry.site === section.from).map(linkedEntry)
    : content.projects.filter((entry) => entry.site === domain && entry.category === section.category).map(fullEntry);
  if (items.length === 0) return '';
  return `<section>\n<h2>${escapeHtml(section.title)}</h2>\n<ul>\n${items.join('\n')}\n</ul>\n</section>`;
}

export function renderIndex(content, domain) {
  const site = content.sites[domain];
  const others = otherSites(content, domain).join(' · ');
  const sections = site.sections.map((section) => renderSection(content, domain, section)).filter(Boolean);
  const body = [
    `<header>\n<h1>${escapeHtml(site.title)}</h1>\n<p>${escapeHtml(site.intro)}</p>\n<p>${others}</p>\n</header>`,
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

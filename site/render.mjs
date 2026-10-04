const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

function page({ title, description, canonical, body, scripts = '' }) {
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : '',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    '<meta property="og:type" content="website">',
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : '',
    '<link rel="stylesheet" href="/style.css">',
  ].filter(Boolean);
  return `<!doctype html>\n<html lang="en">\n<head>\n${head.join('\n')}\n</head>\n<body>\n${body}\n${scripts}</body>\n</html>\n`;
}

/** Links to every other site, e.g. `<a href="https://byjoba.com/">byjoba.com</a>`. */
function otherSites(content, domain) {
  return Object.keys(content.sites)
    .filter((other) => other !== domain)
    .map((other) => `<a href="https://${escapeHtml(other)}/">${escapeHtml(other)}</a>`);
}

function line(entry, nameHtml) {
  const meta = [entry.role, entry.years, entry.status === 'wip' ? 'in progress' : ''].filter(Boolean);
  const metaHtml = meta.length ? ` <span class="meta">${escapeHtml(meta.join(' · '))}</span>` : '';
  return `${nameHtml} — ${escapeHtml(entry.summary)}${metaHtml}`;
}

/** An entry on its own site: a plain line, or a disclosure when it has an about or links. */
function fullEntry(entry) {
  const head = line(entry, `<span class="name">${escapeHtml(entry.name)}</span>`);
  const id = escapeHtml(entry.id);
  if (!entry.about && !entry.links?.length) return `<li id="${id}">${head}</li>`;
  const about = entry.about ? `<p>${escapeHtml(entry.about)}</p>` : '';
  const links = entry.links?.length
    ? `<p class="links">${entry.links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join(' · ')}</p>`
    : '';
  return `<li id="${id}"><details><summary>${head}</summary>${about}${links}</details></li>`;
}

/** An entry shown on the other site: one line whose name links to its home. */
function linkedEntry(entry) {
  const id = escapeHtml(entry.id);
  const name = `<a href="https://${escapeHtml(entry.site)}/#${id}">${escapeHtml(entry.name)}</a>`;
  return `<li id="${id}">${line(entry, name)}</li>`;
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
    `<footer>\n<p>${others} · <a href="/contact.html">contact</a></p>\n<p><img src="/counter.svg" alt="visitor counter" height="20"></p>\n</footer>`,
  ].join('\n');
  return page({ title: site.title, description: site.intro, canonical: `https://${domain}/`, body });
}

export function renderContact(content, domain) {
  const site = content.sites[domain];
  const body = [
    `<header>\n<h1>Contact</h1>\n<p><a href="/">${escapeHtml(site.title)}</a></p>\n</header>`,
    `<main>\n<div id="turnstile" data-sitekey="${escapeHtml(site.turnstileSiteKey)}"></div>\n<p id="contact-result" hidden></p>\n<noscript><p>Showing the address needs JavaScript.</p></noscript>\n</main>`,
  ].join('\n');
  const scripts = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>\n<script src="/contact.js" defer></script>\n';
  return page({ title: `Contact — ${site.title}`, description: site.intro, canonical: `https://${domain}/contact.html`, body, scripts });
}

export function renderNotFound(content, domain) {
  const site = content.sites[domain];
  const body = `<main>\n<h1>Not found</h1>\n<p><a href="/">${escapeHtml(site.title)}</a></p>\n</main>`;
  return page({ title: `Not found — ${site.title}`, description: site.intro, body });
}

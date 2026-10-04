const ENTRY_FIELDS = ['id', 'name', 'site', 'category', 'summary', 'about', 'years', 'status', 'role', 'links'];
const REQUIRED = ['id', 'name', 'site', 'category', 'summary'];
const OPTIONAL_TEXT = ['about', 'years', 'role'];
export const STATUSES = ['in-development', 'active', 'ended', 'one-off'];
const SITE_TEXT = ['title', 'pageTitle', 'description', 'intro', 'turnstileSiteKey'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HOSTNAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
/** An external https link, or a root-relative path to a file under `static/<site>/`. */
const isLinkUrl = (url) => typeof url === 'string' && (url.startsWith('https://') || (url.startsWith('/') && !url.startsWith('//')));

/** Returns every problem in the content as a readable line; an empty list means it is valid. */
export function validate(content) {
  if (!isObject(content) || !isObject(content.sites) || !Array.isArray(content.projects)) {
    return ['content must have a "sites" object and a "projects" array'];
  }
  const domains = Object.keys(content.sites);
  const errors = domains.flatMap((domain) => siteErrors(domain, content.sites[domain]));
  const seen = new Set();
  content.projects.forEach((entry, index) => errors.push(...entryErrors(entry, index, content.sites, seen)));
  return errors;
}

function siteErrors(domain, site) {
  if (!HOSTNAME.test(domain)) return [`sites: "${domain}" is not a hostname`];
  if (!isObject(site)) return [`${domain}: must be an object`];
  const errors = SITE_TEXT.filter((field) => !isText(site[field])).map((field) => `${domain}: "${field}" is required`);
  if ('jsonLd' in site && !isObject(site.jsonLd)) errors.push(`${domain}: "jsonLd" must be an object`);
  if (!Array.isArray(site.sections) || site.sections.length === 0) {
    return [...errors, `${domain}: sections must be a non-empty list`];
  }
  // An entry renders once per section holding its category, so a repeat would repeat its id.
  const used = new Set();
  site.sections.forEach((section, index) => {
    const where = `${domain} section ${index}`;
    if (!isObject(section)) return errors.push(`${where}: must be an object`);
    if (!isText(section.title)) errors.push(`${where}: needs a title`);
    if (!isText(section.category)) {
      errors.push(`${where}: needs a category`);
    } else {
      if (used.has(section.category)) errors.push(`${where}: category "${section.category}" is already used`);
      used.add(section.category);
    }
  });
  return errors;
}

/** The categories an entry on this site may use. */
function categoriesOf(site) {
  if (!isObject(site) || !Array.isArray(site.sections)) return [];
  return site.sections.filter((section) => isObject(section) && isText(section.category)).map((section) => section.category);
}

function entryErrors(entry, index, sites, seen) {
  if (!isObject(entry)) return [`projects[${index}]: must be an object`];
  const where = isText(entry.id) ? `entry "${entry.id}"` : `projects[${index}]`;
  const errors = [];
  for (const field of Object.keys(entry)) {
    if (!ENTRY_FIELDS.includes(field)) errors.push(`${where}: unknown field "${field}"`);
  }
  for (const field of REQUIRED) {
    if (!isText(entry[field])) errors.push(`${where}: "${field}" is required`);
  }
  if (isText(entry.id)) {
    if (!SLUG.test(entry.id)) errors.push(`${where}: id must be a lowercase slug`);
    if (seen.has(entry.id)) errors.push(`${where}: duplicate id`);
    seen.add(entry.id);
  }
  if (isText(entry.site)) {
    if (!Object.hasOwn(sites, entry.site)) {
      errors.push(`${where}: unknown site "${entry.site}"`);
    } else if (isText(entry.category) && !categoriesOf(sites[entry.site]).includes(entry.category)) {
      errors.push(`${where}: category "${entry.category}" is not a section of ${entry.site}`);
    }
  }
  if (!STATUSES.includes(entry.status)) errors.push(`${where}: status must be one of ${STATUSES.join(', ')}`);
  for (const field of OPTIONAL_TEXT) {
    if (field in entry && !isText(entry[field])) errors.push(`${where}: "${field}" must be non-empty text`);
  }
  if ('links' in entry) {
    if (!Array.isArray(entry.links)) {
      errors.push(`${where}: links must be a list`);
    } else {
      for (const link of entry.links) {
        if (!isObject(link) || !isText(link.label)) errors.push(`${where}: link needs a label`);
        else if (!isLinkUrl(link.url)) errors.push(`${where}: link url must start with https:// or /`);
      }
    }
  }
  return errors;
}

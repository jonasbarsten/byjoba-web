import { mediaEmbed } from './media.mjs';

const ENTRY_FIELDS = ['id', 'name', 'site', 'category', 'summary', 'about', 'years', 'status', 'role', 'badges', 'url', 'links', 'media', 'releases', 'shows'];
const REQUIRED = ['id', 'name', 'site', 'category', 'summary'];
const OPTIONAL_TEXT = ['about', 'years', 'role'];
export const STATUSES = ['in-development', 'active', 'ended', 'one-off'];
const SITE_TEXT = ['title', 'pageTitle', 'description', 'intro', 'turnstileSiteKey'];
const SHOW_FIELDS = ['date', 'venue', 'place', 'note'];
/** A day, a month or a year: as exact as the source allows. */
const SHOW_DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
const SLUG =/^[a-z0-9]+(-[a-z0-9]+)*$/;
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
    if ('note' in section && !isText(section.note)) errors.push(`${where}: note must be non-empty text`);
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
  if ('badges' in entry) {
    const badges = entry.badges;
    const ok = Array.isArray(badges) && badges.length > 0 && badges.every(isText) && new Set(badges).size === badges.length;
    if (!ok) errors.push(`${where}: badges must be a list of texts, each at most once`);
  }
  if ('url' in entry && !isLinkUrl(entry.url)) errors.push(`${where}: url must start with https:// or /`);
  if ('media' in entry) {
    if (!Array.isArray(entry.media)) {
      errors.push(`${where}: media must be a list`);
    } else {
      for (const item of entry.media) {
        if (!isObject(item) || !isText(item.label)) errors.push(`${where}: media item needs a label`);
        else if (!mediaEmbed(item.url)) errors.push(`${where}: media url must be a YouTube video, an NRK TV programme or a Spotify track`);
      }
    }
  }
  if ('shows' in entry) {
    if (!Array.isArray(entry.shows) || entry.shows.length === 0) {
      errors.push(`${where}: shows must be a non-empty list`);
    } else {
      for (const show of entry.shows) {
        if (!isObject(show) || typeof show.date !== 'string' || !SHOW_DATE.test(show.date)) {
          errors.push(`${where}: show needs a date like 2019-08-07, 2019-08 or 2019`);
          continue;
        }
        for (const field of Object.keys(show)) {
          if (field === 'review') continue;
          if (!SHOW_FIELDS.includes(field)) errors.push(`${where}: show ${show.date}: unknown field "${field}"`);
          else if (!isText(show[field])) errors.push(`${where}: show ${show.date}: "${field}" must be non-empty text`);
        }
        if ('review' in show) {
          const { review } = show;
          const ok = isObject(review) && isText(review.label) && typeof review.url === 'string' && review.url.startsWith('https://');
          if (!ok) errors.push(`${where}: show ${show.date}: review needs a label and an https url`);
        }
      }
    }
  }
  if ('releases' in entry) {
    if (!Array.isArray(entry.releases)) {
      errors.push(`${where}: releases must be a list`);
    } else {
      for (const release of entry.releases) {
        if (!isObject(release) || !isText(release.title)) {
          errors.push(`${where}: release needs a title`);
          continue;
        }
        if (!isText(release.year)) errors.push(`${where}: release "${release.title}" needs a year`);
        if ('url' in release && !isLinkUrl(release.url)) errors.push(`${where}: release "${release.title}" url must start with https:// or /`);
        // Covers are files of our own under static/<site>/, never images loaded from elsewhere.
        if ('cover' in release && !(typeof release.cover === 'string' && /^\/[^/]/.test(release.cover))) {
          errors.push(`${where}: release "${release.title}" cover must be a path starting with /`);
        }
      }
    }
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

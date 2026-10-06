import { mediaEmbed } from './media.mjs';

const ENTRY_FIELDS = ['id', 'name', 'site', 'category', 'summary', 'about', 'years', 'status', 'role', 'badges', 'url', 'links', 'media', 'releases', 'shows'];
const REQUIRED = ['id', 'name', 'site', 'category', 'summary'];
const OPTIONAL_TEXT = ['about', 'years', 'role'];
export const STATUSES = ['in-development', 'active', 'ended', 'one-off'];
const SITE_TEXT = ['title', 'pageTitle', 'description', 'intro', 'turnstileSiteKey'];
const SHOW_FIELDS = ['date', 'act', 'event', 'venue', 'place', 'country', 'note'];
const COUNTRY_CODE = /^[A-Z]{2}$/;
/** A day, a month or a year: as exact as the source allows. */
const SHOW_DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
const SLUG =/^[a-z0-9]+(-[a-z0-9]+)*$/;
const HOSTNAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
/** A media poster: an NRK or Spotify image, the hosts the pages' CSP allows (byjoba-iac, lib/web-stack.ts). */
const POSTER = /^https:\/\/(gfx\.nrk\.no|i\.scdn\.co)\/[\w/-]+$/;

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
  if (!isObject(content.places)) return [...errors, 'content must have a "places" object'];
  errors.push(...placesErrors(content.places));
  const places = knownPlaces(content.places);
  const seen = new Set();
  content.projects.forEach((entry, index) => errors.push(...entryErrors(entry, index, content.sites, seen, places)));
  return errors;
}

/** A venue is told apart by its name and its city: two towns can each have a Kulturhuset. */
const venueKey = (name, city) => `${name}\n${city ?? ''}`;

/** The places tables as lookups, with an empty one for a table that is malformed. */
function knownPlaces({ countries, cities, events, venues }) {
  return {
    countries: isObject(countries) ? countries : {},
    cities: isObject(cities) ? cities : {},
    events: new Set(Array.isArray(events) ? events : []),
    venues: new Set((Array.isArray(venues) ? venues : []).filter(isObject).map((venue) => venueKey(venue.name, venue.city))),
  };
}

/**
 * The tables shows refer to: countries (ISO 3166 two-letter code to English
 * name), cities (name to country code), events (festivals, showcases and
 * programmes, by name) and venues (a name and the city it is in).
 */
function placesErrors({ countries, cities, events, venues }) {
  const errors = [];
  if (!isObject(countries)) return ['places: countries must be an object of codes and names'];
  for (const [code, name] of Object.entries(countries)) {
    if (!COUNTRY_CODE.test(code) || !isText(name)) errors.push(`places: country "${code}" must be two capital letters with a name`);
  }
  if (!isObject(cities)) return [...errors, 'places: cities must be an object of names and country codes'];
  for (const [city, code] of Object.entries(cities)) {
    if (!Object.hasOwn(countries, code)) errors.push(`places: city "${city}" needs a country code from countries`);
  }
  if (!Array.isArray(events) || !events.every(isText) || new Set(events).size !== events.length) {
    errors.push('places: events must be a list of names, each at most once');
  }
  if (!Array.isArray(venues)) return [...errors, 'places: venues must be a list'];
  const seen = new Set();
  for (const venue of venues) {
    if (!isObject(venue) || !isText(venue.name)) {
      errors.push('places: every venue needs a name');
      continue;
    }
    const where = 'city' in venue ? ` in "${venue.city}"` : '';
    if ('city' in venue && !Object.hasOwn(cities, venue.city)) errors.push(`places: venue "${venue.name}" is${where}, which is not in cities`);
    const key = venueKey(venue.name, venue.city);
    if (seen.has(key)) errors.push(`places: venue "${venue.name}"${where} is listed twice`);
    seen.add(key);
  }
  return errors;
}

function siteErrors(domain, site) {
  if (!HOSTNAME.test(domain)) return [`sites: "${domain}" is not a hostname`];
  if (!isObject(site)) return [`${domain}: must be an object`];
  const errors = SITE_TEXT.filter((field) => !isText(site[field])).map((field) => `${domain}: "${field}" is required`);
  if ('jsonLd' in site && !isObject(site.jsonLd)) errors.push(`${domain}: "jsonLd" must be an object`);
  if ('related' in site && !(Array.isArray(site.related) && site.related.every((other) => isText(other) && HOSTNAME.test(other)))) {
    errors.push(`${domain}: "related" must be a list of hostnames`);
  }
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

/** Where a show was: every name must be one the places tables know. */
function showPlaceErrors(show, places) {
  const errors = [];
  const { event, venue, place, country } = show;
  if (isText(event) && !places.events.has(event)) errors.push(`event "${event}" is not in events`);
  if (isText(place) && !Object.hasOwn(places.cities, place)) errors.push(`place "${place}" is not in cities`);
  if (isText(venue) && !places.venues.has(venueKey(venue, place))) {
    errors.push(`venue "${venue}" ${isText(place) ? `in "${place}"` : 'without a place'} is not in venues`);
  }
  if (isText(country)) {
    if (isText(place)) errors.push(`leave out the country; it comes from the place "${place}"`);
    else if (!Object.hasOwn(places.countries, country)) errors.push(`country "${country}" is not in countries`);
  }
  return errors;
}

function entryErrors(entry, index, sites, seen, places) {
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
        else if ('poster' in item && !POSTER.test(item.poster)) errors.push(`${where}: media poster must be an https image on gfx.nrk.no or i.scdn.co`);
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
        errors.push(...showPlaceErrors(show, places).map((problem) => `${where}: show ${show.date}: ${problem}`));
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

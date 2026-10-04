import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../validate.mjs';
import { fixture } from './fixture.mjs';

const errorsFor = (change) => {
  const content = fixture();
  change(content);
  return validate(content);
};
const assertError = (errors, pattern) => assert.ok(errors.some((e) => pattern.test(e)), `no error matches ${pattern}:\n${errors.join('\n')}`);

test('the fixture is valid', () => {
  assert.deepEqual(validate(fixture()), []);
});

test('content without sites or projects is refused', () => {
  assert.deepEqual(validate(null), ['content must have a "sites" object and a "projects" array']);
  assert.deepEqual(validate({ sites: {} }), ['content must have a "sites" object and a "projects" array']);
});

test('a duplicate id is an error', () => {
  const errors = errorsFor((c) => c.projects.push({ ...c.projects[0] }));
  assertError(errors, /entry "kiwi": duplicate id/);
});

test('an id must be a lowercase slug', () => {
  assertError(errorsFor((c) => { c.projects[0].id = 'Kiwi One'; }), /id must be a lowercase slug/);
});

for (const field of ['id', 'name', 'site', 'category', 'summary']) {
  test(`a missing or empty "${field}" is an error`, () => {
    assertError(errorsFor((c) => { delete c.projects[1][field]; }), new RegExp(`"${field}" is required`));
    assertError(errorsFor((c) => { c.projects[1][field] = '  '; }), new RegExp(`"${field}" is required`));
  });
}

test('an unknown site is an error', () => {
  assertError(errorsFor((c) => { c.projects[0].site = 'example.com'; }), /entry "kiwi": unknown site "example.com"/);
});

test('a category must be a section of the entry\'s own site', () => {
  assertError(errorsFor((c) => { c.projects[0].category = 'music'; }), /entry "kiwi": category "music" is not a section of byjoba.com/);
});

test('every entry needs one of the four statuses', () => {
  assertError(errorsFor((c) => { c.projects[0].status = 'done'; }), /entry "kiwi": status must be one of in-development, active, ended, one-off/);
  assertError(errorsFor((c) => { delete c.projects[0].status; }), /entry "kiwi": status must be one of in-development, active, ended, one-off/);
  for (const status of ['in-development', 'active', 'ended', 'one-off']) {
    assert.deepEqual(errorsFor((c) => { c.projects[0].status = status; }), []);
  }
});

test('an unknown field is an error', () => {
  assertError(errorsFor((c) => { c.projects[0].phone = '123'; }), /entry "kiwi": unknown field "phone"/);
});

test('optional text fields must be non-empty text', () => {
  assertError(errorsFor((c) => { c.projects[1].years = 2016; }), /entry "atlanter": "years" must be non-empty text/);
  assertError(errorsFor((c) => { c.projects[0].about = ''; }), /entry "kiwi": "about" must be non-empty text/);
});

test('links must be a list of labelled https urls', () => {
  assertError(errorsFor((c) => { c.projects[0].links = 'x'; }), /entry "kiwi": links must be a list/);
  assertError(errorsFor((c) => { c.projects[0].links = [{ url: 'https://a.b' }]; }), /entry "kiwi": link needs a label/);
  assertError(errorsFor((c) => { c.projects[0].links = [{ label: 'site', url: 'http://a.b' }]; }), /entry "kiwi": link url must start with https:\/\//);
  assertError(errorsFor((c) => { c.projects[0].links = [null]; }), /entry "kiwi": link needs a label/);
});

test('media must be a list of labelled videos or tracks from a host the pages can embed', () => {
  const ok = [
    { label: 'A video', url: 'https://www.youtube.com/watch?v=mIxlvVlOIS0' },
    { label: 'A track', url: 'https://open.spotify.com/track/5owc6LBkOZp05yh0T0B88Q' },
    { label: 'An NRK programme', url: 'https://tv.nrk.no/serie/festivalsommer/sesong/2021/episode/MKMU81000521' },
  ];
  assert.deepEqual(errorsFor((c) => { c.projects[1].media = ok; }), []);
  assertError(errorsFor((c) => { c.projects[1].media = 'x'; }), /entry "atlanter": media must be a list/);
  assertError(errorsFor((c) => { c.projects[1].media = [{ url: ok[0].url }]; }), /entry "atlanter": media item needs a label/);
  assertError(errorsFor((c) => { c.projects[1].media = [null]; }), /entry "atlanter": media item needs a label/);
  for (const url of ['https://vimeo.com/66229328', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/watch?v=mIxlvVlOIS0&t=10s', 'https://open.spotify.com/album/abc', 7]) {
    assertError(errorsFor((c) => { c.projects[1].media = [{ label: 'x', url }]; }), /entry "atlanter": media url must be a YouTube video, an NRK TV programme or a Spotify track/);
  }
});

test('an entry that is not an object is an error, not a crash', () => {
  assertError(errorsFor((c) => { c.projects.push(null); }), /projects\[3\]: must be an object/);
});

test('a site key must be a plain hostname', () => {
  const errors = errorsFor((c) => { c.sites['../x'] = c.sites['byjoba.com']; });
  assertError(errors, /sites: "\.\.\/x" is not a hostname/);
});

test('a site\'s structured data must be an object', () => {
  assertError(errorsFor((c) => { c.sites['jonasbarsten.com'].jsonLd = 'Person'; }), /jonasbarsten.com: "jsonLd" must be an object/);
  assert.deepEqual(errorsFor((c) => { delete c.sites['jonasbarsten.com'].jsonLd; }), []);
});

test('a site needs title, page title, description, intro, site key and sections', () => {
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].title; }), /byjoba.com: "title" is required/);
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].pageTitle; }), /byjoba.com: "pageTitle" is required/);
  assertError(errorsFor((c) => { c.sites['byjoba.com'].description = ' '; }), /byjoba.com: "description" is required/);
  assertError(errorsFor((c) => { c.sites['byjoba.com'].intro = ''; }), /byjoba.com: "intro" is required/);
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].turnstileSiteKey; }), /byjoba.com: "turnstileSiteKey" is required/);
  assertError(errorsFor((c) => { c.sites['byjoba.com'].sections = []; }), /byjoba.com: sections must be a non-empty list/);
});

test('a section needs a title and a category', () => {
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].sections[1].title; }), /byjoba.com section 1: needs a title/);
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].sections[1].category; }), /byjoba.com section 1: needs a category/);
  assertError(errorsFor((c) => { c.sites['byjoba.com'].sections[1].category = 7; }), /byjoba.com section 1: needs a category/);
});

test('a url must be https or a root-relative path', () => {
  assert.deepEqual(errorsFor((c) => { c.projects[1].url = 'https://example.com/'; }), []);
  assert.deepEqual(errorsFor((c) => { c.projects[1].url = '/files/a.pdf'; }), []);
  for (const url of ['http://example.com', 'example.com', '//example.com', '', 7]) {
    assertError(errorsFor((c) => { c.projects[1].url = url; }), /entry "atlanter": url must start with https:\/\/ or \//);
  }
});

test('shows are a list of dated items with an optional venue, place and note', () => {
  assert.deepEqual(errorsFor((c) => { c.projects[1].shows = [{ date: '2013-08-07', venue: 'Øyafestivalen', place: 'Oslo' }, { date: '2014-11', note: 'stand-in' }, { date: '2016' }]; }), []);
  assertError(errorsFor((c) => { c.projects[1].shows = 'Øya'; }), /entry "atlanter": shows must be a non-empty list/);
  assertError(errorsFor((c) => { c.projects[1].shows = []; }), /entry "atlanter": shows must be a non-empty list/);
  assertError(errorsFor((c) => { c.projects[1].shows = [{ venue: 'Blå' }]; }), /entry "atlanter": show needs a date like 2019-08-07, 2019-08 or 2019/);
  assertError(errorsFor((c) => { c.projects[1].shows = [{ date: '7 Aug 2013' }]; }), /entry "atlanter": show needs a date like 2019-08-07, 2019-08 or 2019/);
  assertError(errorsFor((c) => { c.projects[1].shows = [{ date: '2013-08-07', venue: '' }]; }), /entry "atlanter": show 2013-08-07: "venue" must be non-empty text/);
  assertError(errorsFor((c) => { c.projects[1].shows = [{ date: '2013-08-07', city: 'Oslo' }]; }), /entry "atlanter": show 2013-08-07: unknown field "city"/);
});

test('a show may name its country by a code from the countries table', () => {
  const countries = { NO: 'Norway', GB: 'United Kingdom' };
  assert.deepEqual(errorsFor((c) => { c.countries = countries; c.projects[1].shows = [{ date: '2013-08-07', place: 'Oslo', country: 'NO' }]; }), []);
  assertError(errorsFor((c) => { c.countries = countries; c.projects[1].shows = [{ date: '2013-08-07', country: 'SE' }]; }), /entry "atlanter": show 2013-08-07: country "SE" is not in countries/);
  assertError(errorsFor((c) => { c.projects[1].shows = [{ date: '2013-08-07', country: 'NO' }]; }), /entry "atlanter": show 2013-08-07: country "NO" is not in countries/);
  assertError(errorsFor((c) => { c.countries = ['NO']; }), /countries must be an object of codes and names/);
  assertError(errorsFor((c) => { c.countries = { no: 'Norway' }; }), /countries: "no" must be two capital letters with a name/);
  assertError(errorsFor((c) => { c.countries = { NO: '' }; }), /countries: "NO" must be two capital letters with a name/);
});

test('a show may carry a review: a label and an https url', () => {
  assert.deepEqual(errorsFor((c) => { c.projects[1].shows = [{ date: '2013-08-07', review: { label: 'Gaffa', url: 'https://gaffa.no/x' } }]; }), []);
  assertError(errorsFor((c) => { c.projects[1].shows = [{ date: '2013-08-07', review: 'https://gaffa.no/x' }]; }), /entry "atlanter": show 2013-08-07: review needs a label and an https url/);
  assertError(errorsFor((c) => { c.projects[1].shows = [{ date: '2013-08-07', review: { label: 'Gaffa', url: '/x' } }]; }), /entry "atlanter": show 2013-08-07: review needs a label and an https url/);
  assertError(errorsFor((c) => { c.projects[1].shows = [{ date: '2013-08-07', review: { url: 'https://gaffa.no/x' } }]; }), /entry "atlanter": show 2013-08-07: review needs a label and an https url/);
});

test('releases must be a list with a title and a year, and an optional url', () => {
  assert.deepEqual(errorsFor((c) => { c.projects[1].releases = [{ title: 'Vidde', year: '2013' }, { title: 'Aye', year: '2013', url: 'https://www.discogs.com/master/566572' }]; }), []);
  assertError(errorsFor((c) => { c.projects[1].releases = 'Vidde'; }), /entry "atlanter": releases must be a list/);
  assertError(errorsFor((c) => { c.projects[1].releases = [{ year: '2013' }]; }), /entry "atlanter": release needs a title/);
  assertError(errorsFor((c) => { c.projects[1].releases = [null]; }), /entry "atlanter": release needs a title/);
  assertError(errorsFor((c) => { c.projects[1].releases = [{ title: 'Vidde', year: 2013 }]; }), /entry "atlanter": release "Vidde" needs a year/);
  assertError(errorsFor((c) => { c.projects[1].releases = [{ title: 'Vidde', year: '2013', url: 'discogs.com' }]; }), /entry "atlanter": release "Vidde" url must start with https:\/\/ or \//);
  assert.deepEqual(errorsFor((c) => { c.projects[1].releases = [{ title: 'Vidde', year: '2013', cover: '/covers/vidde.jpg' }]; }), []);
  for (const cover of ['https://i.discogs.com/x.jpg', 'covers/vidde.jpg', '//x/y.jpg', 7]) {
    assertError(errorsFor((c) => { c.projects[1].releases = [{ title: 'Vidde', year: '2013', cover }]; }), /entry "atlanter": release "Vidde" cover must be a path starting with \//);
  }
});

test('badges are a list of short texts, each at most once', () => {
  for (const badges of [['live'], ['live', 'studio'], ['open source']]) {
    assert.deepEqual(errorsFor((c) => { c.projects[1].badges = badges; }), []);
  }
  for (const badges of ['live', ['live', 'live'], [], [7], ['']]) {
    assertError(errorsFor((c) => { c.projects[1].badges = badges; }), /entry "atlanter": badges must be a list of texts, each at most once/);
  }
});

test('a section may carry a note, which must be text', () => {
  assert.deepEqual(errorsFor((c) => { c.sites['jonasbarsten.com'].sections[0].note = 'With my part in each.'; }), []);
  assertError(errorsFor((c) => { c.sites['jonasbarsten.com'].sections[0].note = ''; }), /jonasbarsten.com section 0: note must be non-empty text/);
  assertError(errorsFor((c) => { c.sites['jonasbarsten.com'].sections[0].note = 7; }), /jonasbarsten.com section 0: note must be non-empty text/);
});

test('a category may appear in only one section of a site', () => {
  const errors = errorsFor((c) => { c.sites['byjoba.com'].sections.push({ title: 'Again', category: 'hardware' }); });
  assertError(errors, /byjoba.com section 2: category "hardware" is already used/);
});

test('a link may be a root-relative path but not a bare or protocol-relative one', () => {
  assert.deepEqual(errorsFor((c) => { c.projects[0].links = [{ label: 'pdf', url: '/files/a.pdf' }]; }), []);
  assertError(errorsFor((c) => { c.projects[0].links = [{ label: 'pdf', url: 'files/a.pdf' }]; }), /entry "kiwi": link url must start with https:\/\/ or \//);
  assertError(errorsFor((c) => { c.projects[0].links = [{ label: 'pdf', url: '//example.com/a.pdf' }]; }), /entry "kiwi": link url must start with https:\/\/ or \//);
});


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

test('a status other than wip is an error', () => {
  assertError(errorsFor((c) => { c.projects[0].status = 'done'; }), /entry "kiwi": status must be "wip"/);
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

test('an entry that is not an object is an error, not a crash', () => {
  assertError(errorsFor((c) => { c.projects.push(null); }), /projects\[3\]: must be an object/);
});

test('a site key must be a plain hostname', () => {
  const errors = errorsFor((c) => { c.sites['../x'] = c.sites['byjoba.com']; });
  assertError(errors, /sites: "\.\.\/x" is not a hostname/);
});

test('a site needs title, intro, site key and sections', () => {
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].title; }), /byjoba.com: "title" is required/);
  assertError(errorsFor((c) => { c.sites['byjoba.com'].intro = ''; }), /byjoba.com: "intro" is required/);
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].turnstileSiteKey; }), /byjoba.com: "turnstileSiteKey" is required/);
  assertError(errorsFor((c) => { c.sites['byjoba.com'].sections = []; }), /byjoba.com: sections must be a non-empty list/);
});

test('a section needs a title and exactly one of category and from', () => {
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].sections[1].title; }), /byjoba.com section 1: needs a title/);
  assertError(errorsFor((c) => { delete c.sites['byjoba.com'].sections[1].category; }), /byjoba.com section 1: needs exactly one of "category" and "from"/);
  assertError(errorsFor((c) => { c.sites['jonasbarsten.com'].sections[1].category = 'x'; }), /jonasbarsten.com section 1: needs exactly one of "category" and "from"/);
});

test('"from" must name another site', () => {
  assertError(errorsFor((c) => { c.sites['jonasbarsten.com'].sections[1].from = 'jonasbarsten.com'; }), /jonasbarsten.com section 1: "from" must name another site/);
  assertError(errorsFor((c) => { c.sites['jonasbarsten.com'].sections[1].from = 'nope.com'; }), /jonasbarsten.com section 1: "from" must name another site/);
});

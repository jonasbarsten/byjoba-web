import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { validate } from '../validate.mjs';
import { renderContact, renderIndex } from '../render.mjs';

const content = JSON.parse(await readFile(new URL('../../content/projects.json', import.meta.url), 'utf8'));
const domains = Object.keys(content.sites);

test('the real content is valid', () => {
  assert.deepEqual(validate(content), []);
});

test('the sites are byjoba.com and jonasbarsten.com', () => {
  assert.deepEqual(domains, ['byjoba.com', 'jonasbarsten.com']);
});

test('no page holds an email address', () => {
  // Structured data has keys such as "@type", so look for an address, not for any "@".
  const address = /[\w.+-]+@[\w-]+\.[a-z]{2,}|mailto:/i;
  for (const domain of domains) {
    assert.doesNotMatch(renderIndex(content, domain), address, domain);
    assert.doesNotMatch(renderContact(content, domain), address, domain);
  }
});

test('jonasbarsten.com points to byjoba.com once and repeats none of its entries', () => {
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.equal(html.match(/<a class="name" href="https:\/\/byjoba\.com\/"/g)?.length, 1);
  for (const entry of content.projects.filter((e) => e.site === 'byjoba.com')) {
    assert.ok(!html.includes(`id="${entry.id}"`), entry.id);
  }
});

test('every section of every site has at least one entry', () => {
  for (const domain of domains) {
    const html = renderIndex(content, domain);
    for (const section of content.sites[domain].sections) {
      assert.ok(html.includes(`<h2>${section.title}</h2>`), `${domain}: ${section.title}`);
    }
  }
});

test('every root-relative url or link points at a file in static', () => {
  for (const entry of content.projects) {
    const urls = [entry.url, ...(entry.links ?? []).map((link) => link.url)].filter(Boolean);
    for (const url of urls) {
      if (!url.startsWith('/')) continue;
      assert.ok(existsSync(new URL(`../../static/${entry.site}${url}`, import.meta.url)), `${entry.id}: ${url}`);
    }
  }
});

test('nothing in the Music section has a name that links away', () => {
  for (const entry of content.projects.filter((e) => e.category === 'music')) {
    assert.equal(entry.url, undefined, entry.id);
  }
});

test('the copy avoids praise and scale words', () => {
  const text = JSON.stringify(content.projects).toLowerCase();
  // "award-winning" is praise; an event's name, such as "KKBOX Music Awards", is not.
  for (const word of ['famous', 'biggest', 'leading', 'popular', 'global', 'world-class', 'award-winning']) {
    assert.ok(!text.includes(word), word);
  }
});

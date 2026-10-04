import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  for (const domain of domains) {
    assert.doesNotMatch(renderIndex(content, domain), /@|mailto:/, domain);
    assert.doesNotMatch(renderContact(content, domain), /@|mailto:/, domain);
  }
});

test('every byjoba entry is also listed on jonasbarsten.com', () => {
  const html = renderIndex(content, 'jonasbarsten.com');
  for (const entry of content.projects.filter((e) => e.site === 'byjoba.com')) {
    assert.ok(html.includes(`href="https://byjoba.com/#${entry.id}"`), entry.id);
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

test('the copy avoids praise and scale words', () => {
  const text = JSON.stringify(content.projects).toLowerCase();
  for (const word of ['famous', 'biggest', 'leading', 'popular', 'global', 'world-class', 'award']) {
    assert.ok(!text.includes(word), word);
  }
});

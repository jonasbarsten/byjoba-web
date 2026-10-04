import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, renderIndex, renderContact, renderNotFound, renderRobots, renderSitemap } from '../render.mjs';
import { fixture } from './fixture.mjs';

test('escapeHtml escapes the five special characters', () => {
  assert.equal(escapeHtml(`a & b < c > d " e ' f`), 'a &amp; b &lt; c &gt; d &quot; e &#39; f');
});

test('the head carries page title, description, canonical, social tags and icon', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<title>Jonas Barsten — a list<\/title>/);
  assert.match(html, /<meta name="description" content="A longer description\.">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jonasbarsten\.com\/">/);
  assert.match(html, /<meta property="og:title" content="Jonas Barsten — a list">/);
  assert.match(html, /<meta property="og:description" content="A longer description\.">/);
  assert.match(html, /<meta property="og:site_name" content="Jonas Barsten">/);
  assert.match(html, /<meta name="twitter:card" content="summary">/);
  assert.match(html, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(html, /<link rel="stylesheet" href="\/style\.css">/);
});

test('the page shows the short title and the intro', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<h1>Jonas Barsten<\/h1>\n<p>A list\.<\/p>/);
});

test('the list page is indexable; the contact and not-found pages are not', () => {
  const noindex = /<meta name="robots" content="noindex">/;
  assert.doesNotMatch(renderIndex(fixture(), 'jonasbarsten.com'), noindex);
  assert.match(renderContact(fixture(), 'jonasbarsten.com'), noindex);
  assert.match(renderNotFound(fixture(), 'jonasbarsten.com'), noindex);
});

test('structured data is embedded as a JSON-LD block when the site has it', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"Person","name":"Jonas Barsten"\}<\/script>/);
  assert.doesNotMatch(renderIndex(fixture(), 'byjoba.com'), /ld\+json/);
});

test('structured data cannot close its own block', () => {
  const content = fixture();
  content.sites['jonasbarsten.com'].jsonLd.name = '</script><script>alert(1)</script>';
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /\\u003c\/script>\\u003cscript>alert\(1\)\\u003c\/script>/);
});

test('robots.txt allows everything and names the sitemap', () => {
  assert.equal(renderRobots('byjoba.com'), 'User-agent: *\nAllow: /\n\nSitemap: https://byjoba.com/sitemap.xml\n');
});

test('the sitemap lists the list page only', () => {
  const xml = renderSitemap('byjoba.com');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual(xml.match(/<loc>[^<]*<\/loc>/g), ['<loc>https://byjoba.com/</loc>']);
});

test('the counter image declares its size so the page does not shift', () => {
  assert.match(renderIndex(fixture(), 'byjoba.com'), /<img src="\/counter\.svg" alt="visitor counter" width="88" height="20">/);
});

test('the header links to the other site', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<header>[\s\S]*<a href="https:\/\/byjoba\.com\/">byjoba\.com<\/a>[\s\S]*<\/header>/);
});

test('an entry renders in full on its own site', () => {
  const html = renderIndex(fixture(), 'byjoba.com');
  assert.match(html, /<li id="kiwi"><details><summary><span class="name">Kiwi<\/span> — An instrument\. <span class="meta">in progress<\/span><\/summary>/);
  assert.match(html, /<p>Runs on a Raspberry Pi\.<\/p>/);
  assert.match(html, /<p class="links"><a href="https:\/\/example\.com\/kiwi">source<\/a><\/p>/);
});

test('an entry without about or links is a plain line with role and years', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><span class="name">Atlanter<\/span> — Composer and drummer\. <span class="meta">2013–<\/span><\/li>/);
  assert.match(html, /<li id="vierlive"><span class="name">VIER\.LIVE<\/span> — Streaming platform\. <span class="meta">co-founder · 2020–2021<\/span><\/li>/);
});

test('a "from" section lists the other site\'s entries as one-liners that link over', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<h2>Software and hardware<\/h2>/);
  assert.match(html, /<li id="kiwi"><a href="https:\/\/byjoba\.com\/#kiwi">Kiwi<\/a> — An instrument\.<\/li>/);
  assert.doesNotMatch(html, /Runs on a Raspberry Pi/);
});

test('entries do not leak onto the other site', () => {
  assert.doesNotMatch(renderIndex(fixture(), 'byjoba.com'), /Atlanter/);
});

test('an empty section is not rendered', () => {
  assert.doesNotMatch(renderIndex(fixture(), 'byjoba.com'), /<h2>Apps<\/h2>/);
  assert.doesNotMatch(renderIndex(fixture(), 'jonasbarsten.com'), /<h2>Advocacy<\/h2>/);
});

test('sections keep the order of the site and entries the order of the file', () => {
  const content = fixture();
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.ok(html.indexOf('<h2>Music</h2>') < html.indexOf('<h2>Software and hardware</h2>'));
  assert.ok(html.indexOf('id="atlanter"') < html.indexOf('id="vierlive"'));
});

test('the footer has the other site, the contact link and the counter', () => {
  const html = renderIndex(fixture(), 'byjoba.com');
  assert.match(html, /<footer>[\s\S]*<a href="https:\/\/jonasbarsten\.com\/">jonasbarsten\.com<\/a>[\s\S]*<a href="\/contact\.html">contact<\/a>[\s\S]*<img src="\/counter\.svg" alt="visitor counter"[\s\S]*<\/footer>/);
});

test('the list page has no executable script and no email address', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /@|mailto:/);
});

test('content is escaped in text and in attributes', () => {
  const content = fixture();
  content.sites['byjoba.com'].pageTitle = 'by<joba> & "co"';
  content.projects[0].name = '<b>Kiwi</b>';
  content.projects[0].summary = `Tom's "A & B"`;
  content.projects[0].links = [{ label: '<site>', url: 'https://example.com/?a=1&b="2"' }];
  const html = renderIndex(content, 'byjoba.com');
  assert.match(html, /<title>by&lt;joba&gt; &amp; &quot;co&quot;<\/title>/);
  assert.match(html, /<span class="name">&lt;b&gt;Kiwi&lt;\/b&gt;<\/span> — Tom&#39;s &quot;A &amp; B&quot;/);
  assert.match(html, /<a href="https:\/\/example\.com\/\?a=1&amp;b=&quot;2&quot;">&lt;site&gt;<\/a>/);
  assert.doesNotMatch(html, /<b>Kiwi/);
});

test('the contact page carries the site key and both scripts', () => {
  const html = renderContact(fixture(), 'byjoba.com');
  assert.match(html, /<div id="turnstile" data-sitekey="KEY-B"><\/div>/);
  assert.match(html, /<script src="https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit" defer><\/script>/);
  assert.match(html, /<script src="\/contact\.js" defer><\/script>/);
  assert.match(html, /<noscript><p>Showing the address needs JavaScript\.<\/p><\/noscript>/);
  assert.match(html, /<a href="\/">byjoba<\/a>/);
  assert.doesNotMatch(html, /@|mailto:/);
});

test('the not-found page links home and has no script', () => {
  const html = renderNotFound(fixture(), 'jonasbarsten.com');
  assert.match(html, /<title>Not found — Jonas Barsten<\/title>/);
  assert.match(html, /<a href="\/">Jonas Barsten<\/a>/);
  assert.doesNotMatch(html, /<script/);
});

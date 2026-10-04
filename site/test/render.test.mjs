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

test('the header holds the title and the intro and nothing else', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<header>\n<h1>Jonas Barsten<\/h1>\n<p>A list\.<\/p>\n<\/header>/);
});

test('an entry with an about expands, and its name is its first link', () => {
  const html = renderIndex(fixture(), 'byjoba.com');
  assert.match(html, /<li id="kiwi"><details><summary><a class="name" href="https:\/\/example\.com\/kiwi" target="_blank" rel="noopener">Kiwi<\/a><span class="summary"> — An instrument\.<\/span> <span class="meta">in progress<\/span><\/summary><p>Runs on a Raspberry Pi\.<\/p><\/details><\/li>/);
  assert.doesNotMatch(html, /class="links"/);
});

test('an entry without about or links is a plain line with role and years', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><span class="name">Atlanter<\/span><span class="summary"> — Composer and drummer\.<\/span> <span class="meta">2013–<\/span><\/li>/);
  assert.match(html, /<li id="vierlive"><span class="name">VIER\.LIVE<\/span><span class="summary"> — Streaming platform\.<\/span> <span class="meta">co-founder · 2020–2021<\/span><\/li>/);
});

test('an entry with one link and no about is a plain line whose name is the link', () => {
  const content = fixture();
  content.projects[1].links = [{ label: 'site', url: 'https://example.com/atlanter' }];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><a class="name" href="https:\/\/example\.com\/atlanter" target="_blank" rel="noopener">Atlanter<\/a><span class="summary"> — Composer and drummer\.<\/span> <span class="meta">2013–<\/span><\/li>/);
});

test('further links are listed by label when the entry is expanded', () => {
  const content = fixture();
  content.projects[1].links = [
    { label: 'site', url: 'https://example.com/atlanter' },
    { label: 'source', url: 'https://example.com/source' },
    { label: 'article', url: 'https://example.com/article' },
  ];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><details><summary><a class="name" href="https:\/\/example\.com\/atlanter" target="_blank" rel="noopener">Atlanter<\/a>.*<\/summary><p class="links"><a href="https:\/\/example\.com\/source" target="_blank" rel="noopener">source<\/a> · <a href="https:\/\/example\.com\/article" target="_blank" rel="noopener">article<\/a><\/p><\/details><\/li>/);
});

test('a site lists its own entries only', () => {
  assert.doesNotMatch(renderIndex(fixture(), 'byjoba.com'), /Atlanter/);
  assert.doesNotMatch(renderIndex(fixture(), 'jonasbarsten.com'), /Kiwi/);
});

test('an empty section is not rendered', () => {
  assert.doesNotMatch(renderIndex(fixture(), 'byjoba.com'), /<h2>Apps<\/h2>/);
});

test('sections keep the order of the site and entries the order of the file', () => {
  const content = fixture();
  content.projects.push({ id: 'second', name: 'Second', site: 'jonasbarsten.com', category: 'music', summary: 'Later in the file.' });
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.ok(html.indexOf('<h2>Music</h2>') < html.indexOf('<h2>Advocacy</h2>'));
  assert.ok(html.indexOf('id="atlanter"') < html.indexOf('id="second"'));
  assert.ok(html.indexOf('id="second"') < html.indexOf('id="vierlive"'));
});

test('the footer has the other site, the contact link and the counter', () => {
  const html = renderIndex(fixture(), 'byjoba.com');
  assert.match(html, /<footer>[\s\S]*<a href="https:\/\/jonasbarsten\.com\/" target="_blank" rel="noopener">jonasbarsten\.com<\/a>[\s\S]*<a href="\/contact\.html">contact<\/a>[\s\S]*<img src="\/counter\.svg" alt="visitor counter"[\s\S]*<\/footer>/);
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
  assert.match(html, /<a class="name" href="https:\/\/example\.com\/\?a=1&amp;b=&quot;2&quot;" target="_blank" rel="noopener">&lt;b&gt;Kiwi&lt;\/b&gt;<\/a><span class="summary"> — Tom&#39;s &quot;A &amp; B&quot;<\/span>/);
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, renderIndex, renderContact, renderNotFound, renderRobots, renderShows, renderSitemap } from '../render.mjs';
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

test('the sitemap lists the list page, and the shows page when the site has shows', () => {
  const xml = renderSitemap(fixture(), 'byjoba.com');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual(xml.match(/<loc>[^<]*<\/loc>/g), ['<loc>https://byjoba.com/</loc>']);
  assert.deepEqual(renderSitemap(withShows(), 'jonasbarsten.com').match(/<loc>[^<]*<\/loc>/g), ['<loc>https://jonasbarsten.com/</loc>', '<loc>https://jonasbarsten.com/shows.html</loc>']);
  assert.deepEqual(renderSitemap(withShows(), 'byjoba.com').match(/<loc>[^<]*<\/loc>/g), ['<loc>https://byjoba.com/</loc>']);
});

/** The page with the count buttons reduced to their text, to read the line they sit in. */
const withoutButtons = (html) => html.replace(/<button[^>]*>|<\/button>/g, '');

/** The fixture with shows on its one music entry. */
function withShows() {
  const content = fixture();
  content.projects[1].shows = [
    { date: '2013-08-08', event: 'Øyafestivalen', venue: 'Øyafestivalen', place: 'Oslo' },
    { date: '2014-02-13', event: 'Ja Ja Ja', venue: 'The Lexington', place: 'London', note: 'showcase', review: { label: 'The Line of Best Fit', url: 'https://example.com/review?a=1&b=2' } },
    { date: '2014-10' },
  ];
  return content;
}

test('a show\'s country shows as its code, with the name as the code\'s expansion', () => {
  const card = renderIndex(withShows(), 'jonasbarsten.com');
  assert.match(card, /<td>Øyafestivalen<\/td><td>Oslo<\/td><td><abbr title="Norway">NO<\/abbr><\/td><td><\/td><\/tr>/);
  const content = withShows();
  content.projects[1].shows.push({ date: '2012', country: 'GB' });
  const page = renderShows(content, 'jonasbarsten.com');
  assert.match(page, /<td>Ja Ja Ja · The Lexington<\/td><td>London<\/td><td><abbr title="United Kingdom">GB<\/abbr><\/td>/);
  assert.match(page, /<time datetime="2012">––\.––\.12<\/time><\/td><td><a href="\/#atlanter">Atlanter<\/a><\/td><td><\/td><td><\/td><td><abbr title="United Kingdom">GB<\/abbr><\/td>/);
  assert.match(page, /<tr><td><time datetime="2014-10">––\.10\.14<\/time><\/td><td><a href="\/#atlanter">Atlanter<\/a><\/td><td><\/td><td><\/td><td><\/td><td><\/td><\/tr>/);
});

test('the shows page counts each venue, city and country once, and leaves out what it has none of', () => {
  const content = withShows();
  content.projects[1].shows.push(
    { date: '2015-08-08', venue: 'Øyafestivalen', place: 'Oslo' },
    { date: '2015-09-01', venue: 'Blå', place: 'Oslo' },
    { date: '2015-10-01', venue: 'Kulturhuset', place: 'Bjugn' },
    { date: '2015-10-02', venue: 'Kulturhuset', place: 'Oslo' },
  );
  const page = renderShows(content, 'jonasbarsten.com');
  assert.match(withoutButtons(page), / · 1 artist, 7 shows, 5 venues, 2 events, 3 cities and 2 countries\./);
  content.projects[1].shows = [{ date: '2016' }, { date: '2017', place: 'Oslo' }];
  assert.match(withoutButtons(renderShows(content, 'jonasbarsten.com')), / · 1 artist, 2 shows, 1 city and 1 country\./);
});

test('each count but the shows opens a list of what it counts, most shows first, without script', () => {
  const content = withShows();
  content.projects[1].shows.push(
    { date: '2015-08-08', venue: 'Øyafestivalen', place: 'Oslo' },
    { date: '2015-09-01', venue: 'Blå', place: 'Oslo' },
    { date: '2015-10-01', venue: 'Kulturhuset', place: 'Bjugn' },
    { date: '2015-10-02', venue: 'Kulturhuset', place: 'Oslo' },
    { date: '2016-01-02', act: 'No. 4 <live>', country: 'GB' },
  );
  const page = renderShows(content, 'jonasbarsten.com');
  const list = (id, heading, items) => `<div id="tally-${id}" class="shows" popover><h3>${heading}</h3><ol class="tally">\n${items.map((item) => `<li>${item}</li>`).join('\n')}\n</ol></div>`;
  assert.ok(page.includes('<button type="button" class="count" popovertarget="tally-countries">2 countries</button>'));
  assert.ok(page.includes(' · <button type="button" class="count" popovertarget="tally-artists">2 artists</button>, 8 shows, <button'));
  assert.ok(page.includes(list('countries', '2 countries', ['Norway (5)', 'United Kingdom (2)'])));
  assert.ok(page.includes(list('cities', '3 cities', ['Oslo (4)', 'Bjugn (1)', 'London (1)'])));
  assert.ok(page.includes(list('venues', '5 venues', ['Øyafestivalen, Oslo (2)', 'Blå, Oslo (1)', 'Kulturhuset, Bjugn (1)', 'Kulturhuset, Oslo (1)', 'The Lexington, London (1)'])));
  assert.ok(page.includes(list('events', '2 events', ['Ja Ja Ja (1)', 'Øyafestivalen (1)'])));
  assert.ok(page.includes(list('artists', '2 artists', ['Atlanter (7)', 'No. 4 &lt;live&gt; (1)'])));
  assert.doesNotMatch(page, /<script/);
});

test('a show played with another act than its card names that act: as plain text marked stand-in / one-off on the shows page, in the card\'s note, and in the count', () => {
  const content = withShows();
  content.projects[1].shows.push({ date: '2016-01-02', act: 'No. 4', place: 'Oslo', note: 'on keyboards' }, { date: '2016-01-03', act: 'No. 4' });
  const page = renderShows(content, 'jonasbarsten.com');
  assert.match(withoutButtons(page), / · 2 artists, 5 shows, /);
  assert.match(page, /<time datetime="2016-01-02">02\.01\.16<\/time><\/td><td>No\. 4<\/td><td><\/td><td>Oslo<\/td><td><abbr title="Norway">NO<\/abbr><\/td><td>stand-in \/ one-off · on keyboards<\/td><\/tr>/);
  assert.match(page, /<time datetime="2016-01-03">03\.01\.16<\/time><\/td><td>No\. 4<\/td><td><\/td><td><\/td><td><\/td><td>stand-in \/ one-off<\/td><\/tr>/);
  assert.match(renderIndex(content, 'jonasbarsten.com'), /<td>Oslo<\/td><td><abbr title="Norway">NO<\/abbr><\/td><td>No\. 4 · on keyboards<\/td><\/tr>/);
});

test('the show tables name their columns, and the shows page has its own description', () => {
  const head = (columns) => `<table>\n<thead><tr>${columns.map((column) => `<th scope="col">${column}</th>`).join('')}</tr></thead>\n<tbody>\n<tr>`;
  assert.ok(renderIndex(withShows(), 'jonasbarsten.com').includes(head(['Date', 'Event, venue', 'Place', 'Country', 'Note'])));
  const page = renderShows(withShows(), 'jonasbarsten.com');
  assert.ok(page.includes(head(['Date', 'Act', 'Event, venue', 'Place', 'Country', 'Note'])));
  assert.match(page, /<\/tr>\n<\/tbody>\n<\/table>/);
  const description = 'The 3 shows Jonas Barsten has played: date, act, event, venue, place and country.';
  assert.ok(page.includes(`<meta name="description" content="${description}">`));
  assert.ok(page.includes(`<meta property="og:description" content="${description}">`));
});

// The owner took the reviews off the pages on 2026-10-06, for now; the content keeps them.
test('a show\'s review is not shown, on the card or on the shows page', () => {
  for (const html of [renderIndex(withShows(), 'jonasbarsten.com'), renderShows(withShows(), 'jonasbarsten.com')]) {
    assert.match(html, /<td>London<\/td><td><abbr title="United Kingdom">GB<\/abbr><\/td><td>showcase<\/td><\/tr>/);
    assert.doesNotMatch(html, /The Line of Best Fit|example\.com\/review/);
  }
});

test('the shows page lists every show of the site in one table, newest first, with the act linking to its card', () => {
  const html = renderShows(withShows(), 'jonasbarsten.com');
  assert.match(html, /<title>Shows — Jonas Barsten<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jonasbarsten\.com\/shows\.html">/);
  assert.doesNotMatch(html, /noindex/);
  assert.match(withoutButtons(html), /<h1>Shows<\/h1>\n<p><a href="\/">Jonas Barsten<\/a> · 1 artist, 3 shows, 2 venues, 2 events, 2 cities and 2 countries\.<\/p>/);
  assert.equal(html.match(/<table>/g).length, 1);
  assert.doesNotMatch(html, /<h2>/);
  assert.deepEqual([...html.matchAll(/<time datetime="([^"]+)">/g)].map((match) => match[1]), ['2014-10', '2014-02-13', '2013-08-08']);
  assert.match(html, /<tr><td><time datetime="2013-08-08">08\.08\.13<\/time><\/td><td><a href="\/#atlanter">Atlanter<\/a><\/td><td>Øyafestivalen<\/td><td>Oslo<\/td><td><abbr title="Norway">NO<\/abbr><\/td><td><\/td><\/tr>/);
  assert.doesNotMatch(html, /<script/);
});

test('the list page links to the shows page only when the site has shows', () => {
  assert.match(renderIndex(withShows(), 'jonasbarsten.com'), /<footer>\n<p><a href="\/shows\.html">shows<\/a> · /);
  assert.doesNotMatch(renderIndex(fixture(), 'jonasbarsten.com'), /shows\.html/);
  assert.doesNotMatch(renderIndex(withShows(), 'byjoba.com'), /shows\.html/);
});

test('the counter image declares its size so the page does not shift', () => {
  assert.match(renderIndex(fixture(), 'byjoba.com'), /<img src="\/counter\.svg" alt="visitor counter" width="88" height="20">/);
});

test('the header holds the title and the intro and nothing else', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<header>\n<h1>Jonas Barsten<\/h1>\n<p>A list\.<\/p>\n<\/header>/);
});

test('an entry with an about expands, and its name links to its url', () => {
  const html = renderIndex(fixture(), 'byjoba.com');
  assert.match(html, /<li id="kiwi"><details><summary><span class="head"><a class="name" href="https:\/\/example\.com\/kiwi" target="_blank" rel="noopener">Kiwi<\/a><\/span><span class="summary">An instrument\.<\/span><span class="more">More<\/span><\/summary><p class="status"><span class="badge">in development<\/span><\/p><p>Runs on a Raspberry Pi\.<\/p><\/details><\/li>/);
  assert.doesNotMatch(html, /class="links"/);
});

test('every card opens, and the first line inside is the status badge and the years', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><details><summary><span class="head"><span class="name">Atlanter<\/span><\/span><span class="summary">Composer and drummer\.<\/span><span class="more">More<\/span><\/summary><p class="status"><span class="badge">active<\/span> 2013–<\/p><\/details><\/li>/);
});

test('the role stays on the face of the card', () => {
  const html = renderIndex(fixture(), 'jonasbarsten.com');
  assert.match(html, /<li id="vierlive"><details><summary><span class="head"><span class="name">VIER\.LIVE<\/span><\/span><span class="summary">Streaming platform\.<\/span><span class="meta">co-founder<\/span><span class="more">More<\/span><\/summary><p class="status"><span class="badge">ended<\/span> 2020–2021<\/p><\/details><\/li>/);
});

test('an entry\'s badges show in the header of the card, after the name', () => {
  const content = fixture();
  content.projects[1].badges = ['live', 'A & B'];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><details><summary><span class="head"><span class="name">Atlanter<\/span><span class="badges"><span class="badge">live<\/span><span class="badge">A &amp; B<\/span><\/span><\/span><span class="summary">/);
  assert.doesNotMatch(html.match(/<li id="vierlive">.*?<\/summary>/)[0], /class="badges"/);
});

test('the face of a card carries neither the status badge nor the years', () => {
  const faces = renderIndex(fixture(), 'jonasbarsten.com').match(/<summary>.*?<\/summary>/g);
  assert.equal(faces.length, 2);
  for (const face of faces) assert.doesNotMatch(face, /badge|2013|2020/);
});

test('media shows inside the expanded entry, and the name stays plain', () => {
  const content = fixture();
  content.projects[1].media = [
    { label: 'Pike', url: 'https://www.youtube.com/watch?v=vGqLUF1fwrQ' },
    { label: 'Aye', url: 'https://open.spotify.com/track/5owc6LBkOZp05yh0T0B88Q' },
  ];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><details><summary><span class="head"><span class="name">Atlanter<\/span>/);
  assert.match(
    html,
    /<div class="media"><figure class="video"><a class="poster" href="https:\/\/www\.youtube\.com\/watch\?v=vGqLUF1fwrQ" target="_blank" rel="noopener" aria-label="Pike, on YouTube"><img src="https:\/\/i\.ytimg\.com\/vi\/vGqLUF1fwrQ\/hqdefault\.jpg" alt="" loading="lazy"><\/a><figcaption>Pike<\/figcaption><\/figure><figure class="track"><a class="poster" href="https:\/\/open\.spotify\.com\/track\/5owc6LBkOZp05yh0T0B88Q" target="_blank" rel="noopener" aria-label="Aye, on Spotify"><span class="service">Spotify<\/span><\/a><figcaption>Aye<\/figcaption><\/figure><\/div><\/details><\/li>/,
  );
});

// The embedded players did not react to clicks on the live pages, so every
// video and track is a link to it on its own service, opening in a new tab.
// YouTube's thumbnail is the poster; NRK and Spotify show their name.
test('media are links to the video or track on its service, with no embedded player', () => {
  const content = fixture();
  content.projects[1].media = [
    { label: 'Pike', url: 'https://www.youtube.com/watch?v=vGqLUF1fwrQ' },
    { label: 'Aye', url: 'https://open.spotify.com/track/5owc6LBkOZp05yh0T0B88Q' },
    { label: 'Festivalsommer', url: 'https://tv.nrk.no/serie/festivalsommer/sesong/2021/episode/MKMU81000521' },
  ];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.doesNotMatch(html, /<iframe|youtube-nocookie|static\.nrk\.no|open\.spotify\.com\/embed/);
  assert.match(html, /<span class="more">2 videos · 1 track<\/span>/);
});

test('the "more" marker says what media an entry holds', () => {
  const video = (n) => ({ label: `v${n}`, url: 'https://www.youtube.com/watch?v=vGqLUF1fwrQ' });
  const track = { label: 't', url: 'https://open.spotify.com/track/5owc6LBkOZp05yh0T0B88Q' };
  const markerFor = (media) => {
    const content = fixture();
    content.projects[1].media = media;
    return renderIndex(content, 'jonasbarsten.com').match(/<li id="atlanter">.*?<span class="more">([^<]*)<\/span>/)[1];
  };
  assert.equal(markerFor([video(1)]), '1 video');
  assert.equal(markerFor([video(1), video(2)]), '2 videos');
  assert.equal(markerFor([track]), '1 track');
  assert.equal(markerFor([video(1), video(2), track, track]), '2 videos · 2 tracks');
});

test('a media item with a poster shows that image instead of the service name', () => {
  const content = fixture();
  content.projects[1].media = [{ label: 'Aye', url: 'https://open.spotify.com/track/5owc6LBkOZp05yh0T0B88Q', poster: 'https://i.scdn.co/image/abc' }];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /aria-label="Aye, on Spotify"><img src="https:\/\/i\.scdn\.co\/image\/abc" alt="" loading="lazy"><\/a>/);
  assert.doesNotMatch(html, /<span class="service">/);
});

test('an NRK programme links to its NRK TV page and counts as a video', () => {
  const content = fixture();
  content.projects[1].media = [{ label: 'Festivalsommer', url: 'https://tv.nrk.no/serie/festivalsommer/sesong/2021/episode/MKMU81000521' }];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(
    html,
    /<figure class="video"><a class="poster" href="https:\/\/tv\.nrk\.no\/serie\/festivalsommer\/sesong\/2021\/episode\/MKMU81000521" target="_blank" rel="noopener" aria-label="Festivalsommer, on NRK TV"><span class="service">NRK TV<\/span><\/a><figcaption>Festivalsommer<\/figcaption><\/figure>/,
  );
  assert.match(html, /<span class="more">1 video<\/span>/);
});

test('media labels are escaped', () => {
  const content = fixture();
  content.projects[1].media = [{ label: 'A "live" <take>', url: 'https://www.youtube.com/watch?v=vGqLUF1fwrQ' }];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /aria-label="A &quot;live&quot; &lt;take&gt;, on YouTube"/);
  assert.match(html, /<figcaption>A &quot;live&quot; &lt;take&gt;<\/figcaption>/);
});

test('each status shows as its own badge', () => {
  const labels = { 'in-development': 'in development', active: 'active', ended: 'ended', 'one-off': 'one-off' };
  for (const [status, label] of Object.entries(labels)) {
    const content = fixture();
    content.projects[1].status = status;
    assert.match(renderIndex(content, 'jonasbarsten.com'), new RegExp(`<li id="atlanter">.*?<p class="status"><span class="badge">${label}</span> 2013–</p>`));
  }
});

test('an entry with a url has its name as the link', () => {
  const content = fixture();
  content.projects[1].url = 'https://example.com/atlanter';
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><details><summary><span class="head"><a class="name" href="https:\/\/example\.com\/atlanter" target="_blank" rel="noopener">Atlanter<\/a><\/span><span class="summary">Composer and drummer\.<\/span>/);
});

test('links are listed by label inside the opened card and never make the name a link', () => {
  const content = fixture();
  content.projects[1].links = [
    { label: 'source', url: 'https://example.com/source' },
    { label: 'article', url: 'https://example.com/article' },
  ];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /<li id="atlanter"><details><summary><span class="head"><span class="name">Atlanter<\/span>.*<span class="more">2 links<\/span><\/summary><p class="status">.*?<\/p><h3>Links<\/h3><p class="links"><a href="https:\/\/example\.com\/source" target="_blank" rel="noopener">source<\/a> · <a href="https:\/\/example\.com\/article" target="_blank" rel="noopener">article<\/a><\/p><\/details><\/li>/);
});

test('releases show inside the opened card with cover, title and year; the title links when there is a url', () => {
  const content = fixture();
  content.projects[1].releases = [
    { title: 'Vidde', year: '2013', url: 'https://www.discogs.com/master/566572', cover: '/covers/vidde.jpg' },
    { title: 'A & B', year: '2014' },
  ];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(
    html,
    /<span class="more">2 releases<\/span><\/summary><p class="status">.*?<\/p><h3>Releases<\/h3><div class="releases"><figure><img src="\/covers\/vidde\.jpg" alt="" width="96" height="96" loading="lazy"><figcaption><a href="https:\/\/www\.discogs\.com\/master\/566572" target="_blank" rel="noopener">Vidde<\/a> <span class="year">2013<\/span><\/figcaption><\/figure><figure><span class="nocover"><\/span><figcaption>A &amp; B <span class="year">2014<\/span><\/figcaption><\/figure><\/div><\/details>/,
  );
});

test('shows open as a list in a popover, from a button inside the opened card, without script', () => {
  const content = fixture();
  content.projects[1].shows = [
    { date: '2014-03-01', venue: 'by:Larm', place: 'Oslo' },
    { date: '2013-08-07', venue: 'Øyafestivalen <main stage>', place: 'Oslo', note: 'stand-in' },
    { date: '2013-06', place: 'Kristiansand' },
    { date: '2012' },
  ];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /<h3>Shows<\/h3><p><button type="button" class="open-shows" popovertarget="shows-atlanter">List of 4 shows<\/button><\/p>/);
  assert.match(html, /<div id="shows-atlanter" class="shows" popover><div class="popover-head"><h3>Atlanter: 4 shows<\/h3><a href="\/shows\.html">All shows<\/a><\/div><table>/);
  assert.match(html, /<tr><td><time datetime="2014-03-01">01\.03\.14<\/time><\/td><td>by:Larm<\/td><td>Oslo<\/td><td><abbr title="Norway">NO<\/abbr><\/td><td><\/td><\/tr>/);
  assert.match(html, /<tr><td><time datetime="2013-08-07">07\.08\.13<\/time><\/td><td>Øyafestivalen &lt;main stage&gt;<\/td><td>Oslo<\/td><td><abbr title="Norway">NO<\/abbr><\/td><td>stand-in<\/td><\/tr>/);
  assert.match(html, /<tr><td><time datetime="2013-06">––\.06\.13<\/time><\/td><td><\/td><td>Kristiansand<\/td><td><abbr title="Norway">NO<\/abbr><\/td><td><\/td><\/tr>/);
  assert.match(html, /<tr><td><time datetime="2012">––\.––\.12<\/time><\/td><td><\/td><td><\/td><td><\/td><td><\/td><\/tr>/);
  assert.doesNotMatch(html, /<script(?! type="application\/ld\+json")/);
});

test('shows are listed newest first, whatever their order in the file', () => {
  const content = fixture();
  content.projects[1].shows = [{ date: '2013-08-07' }, { date: '2016' }, { date: '2014-03' }];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.deepEqual([...html.matchAll(/<time datetime="([^"]+)">/g)].map((match) => match[1]), ['2016', '2014-03', '2013-08-07']);
});

test('a single show is counted in the singular, and the marker counts shows first', () => {
  const content = fixture();
  content.projects[1].shows = [{ date: '2014-03-01', venue: 'by:Larm' }];
  content.projects[1].links = [{ label: 'site', url: 'https://example.com/' }];
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, />List of 1 show<\/button>/);
  assert.match(html, /<span class="more">1 show · 1 link<\/span>/);
});

test('each group inside an opened card has a heading naming what it holds', () => {
  const video = { label: 'v', url: 'https://www.youtube.com/watch?v=vGqLUF1fwrQ' };
  const track = { label: 't', url: 'https://open.spotify.com/track/5owc6LBkOZp05yh0T0B88Q' };
  const headingFor = (media) => {
    const content = fixture();
    content.projects[1].media = media;
    return renderIndex(content, 'jonasbarsten.com').match(/<h3>([^<]*)<\/h3><div class="media">/)[1];
  };
  assert.equal(headingFor([video]), 'Videos');
  assert.equal(headingFor([track]), 'Tracks');
  assert.equal(headingFor([video, track]), 'Videos and tracks');
  assert.doesNotMatch(renderIndex(fixture(), 'jonasbarsten.com'), /<h3>/);
});

test('the "more" marker lists videos, tracks, releases and links in that order', () => {
  const content = fixture();
  content.projects[1].media = [{ label: 'v', url: 'https://www.youtube.com/watch?v=vGqLUF1fwrQ' }];
  content.projects[1].releases = [{ title: 'Vidde', year: '2013' }];
  content.projects[1].links = [{ label: 'site', url: 'https://example.com/site' }];
  assert.match(renderIndex(content, 'jonasbarsten.com'), /<span class="more">1 video · 1 release · 1 link<\/span>/);
});

test('the "more" marker counts links after videos and tracks', () => {
  const content = fixture();
  content.projects[1].media = [{ label: 'v', url: 'https://www.youtube.com/watch?v=vGqLUF1fwrQ' }];
  content.projects[1].links = [{ label: 'site', url: 'https://example.com/site' }];
  assert.match(renderIndex(content, 'jonasbarsten.com'), /<li id="atlanter">.*?<span class="more">1 video · 1 link<\/span>/);
});

test('a site lists its own entries only', () => {
  assert.doesNotMatch(renderIndex(fixture(), 'byjoba.com'), /Atlanter/);
  assert.doesNotMatch(renderIndex(fixture(), 'jonasbarsten.com'), /Kiwi/);
});

test('a section\'s note shows under its heading', () => {
  const content = fixture();
  content.sites['jonasbarsten.com'].sections[0].note = 'Artists & bands, with my part in each.';
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.match(html, /<h2>Music<\/h2>\n<p class="note">Artists &amp; bands, with my part in each\.<\/p>\n<ul>/);
  assert.match(html, /<h2>Advocacy<\/h2>\n<ul>/);
});

test('an empty section is not rendered', () => {
  assert.doesNotMatch(renderIndex(fixture(), 'byjoba.com'), /<h2>Apps<\/h2>/);
});

test('sections keep the order of the site and entries the order of the file', () => {
  const content = fixture();
  content.projects.push({ id: 'second', name: 'Second', site: 'jonasbarsten.com', category: 'music', summary: 'Later in the file.', status: 'active' });
  const html = renderIndex(content, 'jonasbarsten.com');
  assert.ok(html.indexOf('<h2>Music</h2>') < html.indexOf('<h2>Advocacy</h2>'));
  assert.ok(html.indexOf('id="atlanter"') < html.indexOf('id="second"'));
  assert.ok(html.indexOf('id="second"') < html.indexOf('id="vierlive"'));
});

test('the footer has the other site, the contact link and the counter', () => {
  const html = renderIndex(fixture(), 'byjoba.com');
  assert.match(html, /<footer>[\s\S]*<a href="https:\/\/jonasbarsten\.com\/" target="_blank" rel="noopener">jonasbarsten\.com<\/a>[\s\S]*<a href="\/contact\.html">contact<\/a>[\s\S]*<img src="\/counter\.svg" alt="visitor counter"[\s\S]*<\/footer>/);
});

// Each site's content lives in its own repo, so the footer cannot find the other site in this content.
test('the footer links to the site\'s related domains, even when they are not in this content', () => {
  const content = fixture();
  delete content.sites['jonasbarsten.com'];
  content.projects = content.projects.filter((entry) => entry.site === 'byjoba.com');
  assert.match(renderIndex(content, 'byjoba.com'), /<footer>\n<p><a href="https:\/\/jonasbarsten\.com\/" target="_blank" rel="noopener">jonasbarsten\.com<\/a> · <a href="\/contact\.html">contact<\/a>/);
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
  content.projects[0].url = 'https://example.com/?a=1&b="2"';
  content.projects[0].links = [{ label: '<site>', url: 'https://example.com/x' }];
  const html = renderIndex(content, 'byjoba.com');
  assert.match(html, /<title>by&lt;joba&gt; &amp; &quot;co&quot;<\/title>/);
  assert.match(html, /<a class="name" href="https:\/\/example\.com\/\?a=1&amp;b=&quot;2&quot;" target="_blank" rel="noopener">&lt;b&gt;Kiwi&lt;\/b&gt;<\/a><\/span><span class="summary">Tom&#39;s &quot;A &amp; B&quot;<\/span>/);
  assert.match(html, /<a href="https:\/\/example\.com\/x" target="_blank" rel="noopener">&lt;site&gt;<\/a>/);
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';
import { fixture } from './fixture.mjs';

const siteDir = fileURLToPath(new URL('..', import.meta.url));

/**
 * A temp workspace laid out as the command line reads it: `content/` holding
 * projects.json, shows.json and places.json, with `static/` beside it.
 * Returns the paths `build` takes.
 */
async function workspace(contentText, showsText = '{}', placesText = JSON.stringify(fixture().places)) {
  const root = await mkdtemp(join(tmpdir(), 'byjoba-web-'));
  await mkdir(join(root, 'content'));
  const contentPath = join(root, 'content', 'projects.json');
  const showsPath = join(root, 'content', 'shows.json');
  const placesPath = join(root, 'content', 'places.json');
  await writeFile(contentPath, contentText);
  await writeFile(showsPath, showsText);
  await writeFile(placesPath, placesText);
  return { contentPath, showsPath, placesPath, siteDir, staticDir: join(root, 'static'), outDir: join(root, 'dist') };
}

/** The fixture as `projects.json` holds it: without the places, which have their own file. */
const projectsText = () => JSON.stringify({ ...fixture(), places: undefined });

test('shows and places come from their own files', async () => {
  const paths = await workspace(projectsText(), JSON.stringify({ atlanter: [{ date: '2014-03-01', event: 'by:Larm', venue: 'Blå', place: 'Oslo' }] }));
  await build(paths);
  const index = await readFile(join(paths.outDir, 'jonasbarsten.com', 'index.html'), 'utf8');
  assert.match(index, /Atlanter: 1 show<\/h3>/);
  assert.match(index, /<td>by:Larm · Blå<\/td><td>Oslo<\/td><td><abbr title="Norway">NO<\/abbr><\/td>/);
  assert.match(await readFile(join(paths.outDir, 'jonasbarsten.com', 'shows.html'), 'utf8'), /<h1>Shows<\/h1>/);
  assert.equal(existsSync(join(paths.outDir, 'byjoba.com', 'shows.html')), false);
});

test('shows for an id that is no entry, and invalid shows, fail the build', async () => {
  const paths = await workspace(JSON.stringify(fixture()), JSON.stringify({ atlantis: [{ date: '2014-03-01' }], atlanter: [{ date: 'March' }] }));
  await assert.rejects(build(paths), (error) => error.message.includes(`${paths.showsPath}: "atlantis" is not the id of an entry`) && error.message.includes('entry "atlanter": show needs a date'));
  assert.equal(existsSync(paths.outDir), false);
});

test('the build writes every file for every site', async () => {
  const paths = await workspace(JSON.stringify(fixture()));
  await build(paths);
  for (const domain of ['byjoba.com', 'jonasbarsten.com']) {
    assert.deepEqual((await readdir(join(paths.outDir, domain))).sort(), ['404.html', 'contact.html', 'contact.js', 'favicon.svg', 'index.html', 'robots.txt', 'sitemap.xml', 'style.css']);
  }
  assert.match(await readFile(join(paths.outDir, 'jonasbarsten.com', 'robots.txt'), 'utf8'), /Sitemap: https:\/\/jonasbarsten\.com\/sitemap\.xml/);
  assert.match(await readFile(join(paths.outDir, 'jonasbarsten.com', 'sitemap.xml'), 'utf8'), /<loc>https:\/\/jonasbarsten\.com\/<\/loc>/);
  assert.match(await readFile(join(paths.outDir, 'byjoba.com', 'index.html'), 'utf8'), /<h1>byjoba<\/h1>/);
});

test('the sitemap carries the date the content last changed', async () => {
  const paths = await workspace(JSON.stringify(fixture()));
  await build({ ...paths, lastModified: '2026-10-06' });
  assert.match(await readFile(join(paths.outDir, 'byjoba.com', 'sitemap.xml'), 'utf8'), /<url><loc>https:\/\/byjoba\.com\/<\/loc><lastmod>2026-10-06<\/lastmod><\/url>/);
});

test('a site with an IndexNow key serves it at /<key>.txt', async () => {
  const content = fixture();
  content.sites['byjoba.com'].indexNowKey = 'a1b2c3d4e5f6';
  const paths = await workspace(JSON.stringify(content));
  await build(paths);
  assert.equal(await readFile(join(paths.outDir, 'byjoba.com', 'a1b2c3d4e5f6.txt'), 'utf8'), 'a1b2c3d4e5f6');
  assert.equal(existsSync(join(paths.outDir, 'jonasbarsten.com', 'a1b2c3d4e5f6.txt')), false);
});

test('a share image the site does not serve fails the build', async () => {
  const content = fixture();
  content.sites['jonasbarsten.com'].shareImage = { path: '/share.png', width: 1200, height: 630, alt: 'Jonas Barsten' };
  const paths = await workspace(JSON.stringify(content));
  await assert.rejects(build(paths), /jonasbarsten\.com: the share image \/share\.png is not in static\/jonasbarsten\.com/);
  await mkdir(join(paths.staticDir, 'jonasbarsten.com'), { recursive: true });
  await writeFile(join(paths.staticDir, 'jonasbarsten.com', 'share.png'), 'png');
  await build(paths);
});

test('static files for a site are copied into that site only', async () => {
  const paths = await workspace(JSON.stringify(fixture()));
  await mkdir(join(paths.staticDir, 'jonasbarsten.com', 'files'), { recursive: true });
  await writeFile(join(paths.staticDir, 'jonasbarsten.com', 'files', 'a.pdf'), 'pdf');
  await build(paths);
  assert.equal(await readFile(join(paths.outDir, 'jonasbarsten.com', 'files', 'a.pdf'), 'utf8'), 'pdf');
  assert.equal(existsSync(join(paths.outDir, 'byjoba.com', 'files')), false);
});

test('files from an earlier build are removed', async () => {
  const paths = await workspace(JSON.stringify(fixture()));
  await mkdir(join(paths.outDir, 'byjoba.com'), { recursive: true });
  await writeFile(join(paths.outDir, 'byjoba.com', 'old.html'), 'old');
  await build(paths);
  assert.equal(existsSync(join(paths.outDir, 'byjoba.com', 'old.html')), false);
});

test('malformed JSON fails with a message naming the file', async () => {
  const paths = await workspace('{ "sites": {}, }');
  await assert.rejects(build(paths), (error) => error.message.includes(paths.contentPath) && error.message.includes('not valid JSON'));
});

test('invalid content fails with every error and writes nothing', async () => {
  const content = fixture();
  content.projects[0].status = 'done';
  delete content.projects[1].summary;
  const paths = await workspace(JSON.stringify(content));
  await assert.rejects(build(paths), (error) => error.message.includes('entry "kiwi": status must be one of in-development, active, ended, one-off') && error.message.includes('entry "atlanter": "summary" is required'));
  assert.equal(existsSync(paths.outDir), false);
});

// Another repo's content builds with this engine: the jonasbarsten.com repo
// runs `node <byjoba-web>/site/build.mjs --content content --out dist`.
// The content lives in a git repo; its last commit dates the sitemap.
test('the command line builds a content directory given with --content into --out', async () => {
  const paths = await workspace(projectsText());
  await mkdir(join(paths.staticDir, 'jonasbarsten.com'), { recursive: true });
  await writeFile(join(paths.staticDir, 'jonasbarsten.com', 'extra.txt'), 'from static');
  const root = join(dirname(paths.contentPath), '..');
  const git = (...args) => promisify(execFile)('git', ['-C', root, '-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args]);
  await git('init', '-q');
  await git('add', '.');
  await git('commit', '-q', '-m', 'content');
  const out = join(root, 'elsewhere');
  await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../build.mjs', import.meta.url)), '--content', dirname(paths.contentPath), '--out', out]);
  assert.ok(existsSync(join(out, 'byjoba.com', 'index.html')));
  assert.ok(existsSync(join(out, 'jonasbarsten.com', 'index.html')));
  assert.equal(await readFile(join(out, 'jonasbarsten.com', 'extra.txt'), 'utf8'), 'from static');
  const { stdout: day } = await git('log', '-1', '--format=%cs');
  assert.match(await readFile(join(out, 'byjoba.com', 'sitemap.xml'), 'utf8'), new RegExp(`<lastmod>${day.trim()}</lastmod>`));
});

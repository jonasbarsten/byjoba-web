import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';
import { fixture } from './fixture.mjs';

const siteDir = fileURLToPath(new URL('..', import.meta.url));

/** A temp workspace holding a content file; returns the paths `build` takes. */
async function workspace(contentText, showsText = '{}') {
  const root = await mkdtemp(join(tmpdir(), 'byjoba-web-'));
  const contentPath = join(root, 'projects.json');
  const showsPath = join(root, 'shows.json');
  await writeFile(contentPath, contentText);
  await writeFile(showsPath, showsText);
  return { contentPath, showsPath, siteDir, staticDir: join(root, 'static'), outDir: join(root, 'dist') };
}

test('shows come from their own file, keyed by entry id', async () => {
  const paths = await workspace(JSON.stringify(fixture()), JSON.stringify({ atlanter: [{ date: '2014-03-01', venue: 'by:Larm' }] }));
  await build(paths);
  assert.match(await readFile(join(paths.outDir, 'jonasbarsten.com', 'index.html'), 'utf8'), /Atlanter: 1 show<\/h3>/);
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

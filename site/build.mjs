import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.mjs';
import { hasShows, renderContact, renderIndex, renderNotFound, renderRobots, renderShows, renderSitemap } from './render.mjs';

const ASSETS = ['style.css', 'contact.js', 'favicon.svg'];

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${path} is not valid JSON: ${error.message}`);
    throw error;
  }
}

/**
 * Reads the content and the shows. The shows live in their own file, keyed by
 * entry id, because they are many; each list is put on its entry as `shows`.
 * Throws with every problem found.
 */
export async function loadContent({ contentPath, showsPath }) {
  const content = await readJson(contentPath);
  const shows = await readJson(showsPath);
  const errors = [];
  if (Array.isArray(content?.projects)) {
    for (const [id, list] of Object.entries(shows)) {
      const entry = content.projects.find((candidate) => candidate?.id === id);
      if (entry) entry.shows = list;
      else errors.push(`${showsPath}: "${id}" is not the id of an entry`);
    }
  }
  errors.push(...validate(content));
  if (errors.length > 0) throw new Error(`${contentPath} is invalid:\n${errors.join('\n')}`);
  return content;
}

/** Reads and validates the content, then writes `outDir/<domain>/` for every site. */
export async function build({ contentPath, showsPath, siteDir, staticDir, outDir }) {
  const content = await loadContent({ contentPath, showsPath });

  await rm(outDir, { recursive: true, force: true });
  for (const domain of Object.keys(content.sites)) {
    const dir = join(outDir, domain);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), renderIndex(content, domain));
    await writeFile(join(dir, 'contact.html'), renderContact(content, domain));
    await writeFile(join(dir, '404.html'), renderNotFound(content, domain));
    await writeFile(join(dir, 'robots.txt'), renderRobots(domain));
    await writeFile(join(dir, 'sitemap.xml'), renderSitemap(content, domain));
    if (hasShows(content, domain)) await writeFile(join(dir, 'shows.html'), renderShows(content, domain));
    for (const asset of ASSETS) await copyFile(join(siteDir, asset), join(dir, asset));
    const extras = join(staticDir, domain);
    if (existsSync(extras)) await cp(extras, dir, { recursive: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  try {
    await build({
      contentPath: join(root, 'content', 'projects.json'),
      showsPath: join(root, 'content', 'shows.json'),
      siteDir: join(root, 'site'),
      staticDir: join(root, 'static'),
      outDir: join(root, 'dist'),
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

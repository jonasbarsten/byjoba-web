import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.mjs';
import { renderContact, renderIndex, renderNotFound, renderRobots, renderSitemap } from './render.mjs';

const ASSETS = ['style.css', 'contact.js', 'favicon.svg'];

/** Reads and validates the content, then writes `outDir/<domain>/` for every site. */
export async function build({ contentPath, siteDir, staticDir, outDir }) {
  const text = await readFile(contentPath, 'utf8');
  let content;
  try {
    content = JSON.parse(text);
  } catch (error) {
    throw new Error(`${contentPath} is not valid JSON: ${error.message}`);
  }
  const errors = validate(content);
  if (errors.length > 0) throw new Error(`${contentPath} is invalid:\n${errors.join('\n')}`);

  await rm(outDir, { recursive: true, force: true });
  for (const domain of Object.keys(content.sites)) {
    const dir = join(outDir, domain);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), renderIndex(content, domain));
    await writeFile(join(dir, 'contact.html'), renderContact(content, domain));
    await writeFile(join(dir, '404.html'), renderNotFound(content, domain));
    await writeFile(join(dir, 'robots.txt'), renderRobots(domain));
    await writeFile(join(dir, 'sitemap.xml'), renderSitemap(domain));
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
      siteDir: join(root, 'site'),
      staticDir: join(root, 'static'),
      outDir: join(root, 'dist'),
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

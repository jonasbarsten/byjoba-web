import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadContent } from './build.mjs';
import { indexedUrls } from './render.mjs';

/**
 * What IndexNow is told after a deploy: the site's indexed pages, and where its
 * key is served, so the search engines can check the submission is the owner's.
 */
export function indexNowSubmission(content, domain) {
  const key = content.sites[domain].indexNowKey;
  if (!key) throw new Error(`${domain} has no "indexNowKey"`);
  return { host: domain, key, keyLocation: `https://${domain}/${key}.txt`, urlList: indexedUrls(content, domain) };
}

// Run by a site's deploy workflow once its pages are live:
// `node site/indexnow.mjs --content <content dir> --site <domain>`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { content: { type: 'string' }, site: { type: 'string' } } });
  const contentDir = resolve(values.content);
  const content = await loadContent({
    contentPath: join(contentDir, 'projects.json'),
    showsPath: join(contentDir, 'shows.json'),
    placesPath: join(contentDir, 'places.json'),
  });
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowSubmission(content, values.site)),
  });
  console.log(`IndexNow: ${response.status} ${response.statusText}`);
  if (!response.ok) process.exit(1);
}

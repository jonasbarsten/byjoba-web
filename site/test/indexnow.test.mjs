import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexNowSubmission } from '../indexnow.mjs';
import { fixture } from './fixture.mjs';

test('the submission names the site, its key file and the pages the sitemap lists', () => {
  const content = fixture();
  content.sites['jonasbarsten.com'].indexNowKey = 'a1b2c3d4e5f6';
  content.projects[1].shows = [{ date: '2014-03-01' }];
  assert.deepEqual(indexNowSubmission(content, 'jonasbarsten.com'), {
    host: 'jonasbarsten.com',
    key: 'a1b2c3d4e5f6',
    keyLocation: 'https://jonasbarsten.com/a1b2c3d4e5f6.txt',
    urlList: ['https://jonasbarsten.com/', 'https://jonasbarsten.com/shows.html'],
  });
});

test('a site without a key has nothing to submit', () => {
  assert.throws(() => indexNowSubmission(fixture(), 'byjoba.com'), /byjoba\.com has no "indexNowKey"/);
});

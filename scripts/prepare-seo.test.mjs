import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { prepareSeoOutput } from './prepare-seo.mjs';

test('sitemap includes indexable canonical pages and fallback removes home indexing data', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sureplace-seo-'));
  const page = (url, robots = 'index, follow') =>
    `<meta name="robots" content="${robots}"><link rel="canonical" href="${url}"><script type="application/ld+json">{"name":"Home"}</script>`;
  try {
    await writeFile(path.join(dir, 'index.html'), page('https://example.com/'));
    for (const [name, url, robots] of [
      ['help', 'https://example.com/help', 'index, follow'],
      ['login', 'https://example.com/login', 'noindex, nofollow'],
      ['other', 'https://other.example.com/', 'index, follow'],
    ]) {
      await mkdir(path.join(dir, name));
      await writeFile(path.join(dir, name, 'index.html'), page(url, robots));
    }
    await prepareSeoOutput(dir, 'https://example.com');
    const sitemap = await readFile(path.join(dir, 'sitemap.xml'), 'utf8');
    assert.match(sitemap, /https:\/\/example.com\/help/);
    assert.doesNotMatch(sitemap, /login|other.example/);
    const fallback = await readFile(path.join(dir, '404.html'), 'utf8');
    assert.match(fallback, /noindex, follow/);
    assert.doesNotMatch(fallback, /canonical|application\/ld\+json/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function prepareSeoOutput(outputDir, origin) {
  const home = await readFile(path.join(outputDir, 'index.html'), 'utf8');
  const fallback = home
    .replace(/<meta\b[^>]*name="robots"[^>]*>/gi, '<meta name="robots" content="noindex, follow">')
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, '')
    .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');
  await writeFile(path.join(outputDir, '404.html'), fallback, 'utf8');
  const urls = new Set();
  for (const file of await htmlFiles(outputDir)) {
    const html = await readFile(file, 'utf8');
    if (/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html)) continue;
    const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
    if (canonical && new URL(canonical).origin === origin) urls.add(canonical);
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...urls]
      .sort()
      .map(
        (url) => `  <url><loc>${url.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</loc></url>`,
      )
      .join('\n') +
    '\n</urlset>\n';
  await writeFile(path.join(outputDir, 'sitemap.xml'), xml, 'utf8');
  console.log(
    `Prepared ${urls.size} indexable URLs in the frontend sitemap and a noindex fallback.`,
  );
}

async function htmlFiles(dir) {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...(await htmlFiles(file)));
    else if (item.name === 'index.html') files.push(file);
  }
  return files;
}

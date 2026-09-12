import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const mode = valueAfter('--mode') ?? 'custom';
const printOutput = args.has('--print-output');
const repoName = sanitizeRepoName(process.env.GH_PAGES_REPO_NAME ?? 'sureplace');
const customDomain = process.env.GH_PAGES_CUSTOM_DOMAIN?.trim() || 'sureplace.twinpeaksinvestment.com';

const root = process.cwd();
const angularJsonPath = path.join(root, 'angular.json');
const angularConfig = JSON.parse(await readFile(angularJsonPath, 'utf8'));
const projectName = angularConfig.defaultProject ?? Object.keys(angularConfig.projects ?? {})[0];
const project = angularConfig.projects?.[projectName];

if (!project) {
  fail(`Could not find an Angular project in ${angularJsonPath}.`);
}

const buildOptions = project.architect?.build?.options ?? project.targets?.build?.options ?? {};
const configuredOutput = normalizeOutputPath(buildOptions.outputPath, projectName);
const outputDir = await findBrowserOutputDir(configuredOutput, projectName);

if (printOutput) {
  process.stdout.write(path.relative(root, outputDir).replaceAll(path.sep, '/'));
  process.exit(0);
}

const indexPath = path.join(outputDir, 'index.html');
const notFoundPath = path.join(outputDir, '404.html');

await copyFile(indexPath, notFoundPath);

if (mode === 'custom' && customDomain) {
  const domain = normalizeDomain(customDomain);
  await writeFile(path.join(outputDir, 'CNAME'), `${domain}\n`, 'utf8');
} else if (mode !== 'custom' && mode !== 'repo') {
  fail(`Unknown mode "${mode}". Use "custom" or "repo".`);
}

if (process.env.GITHUB_OUTPUT) {
  await mkdir(path.dirname(process.env.GITHUB_OUTPUT), { recursive: true });
  await writeFile(
    process.env.GITHUB_OUTPUT,
    `pages-path=${path.relative(root, outputDir).replaceAll(path.sep, '/')}\n`,
    {
      flag: 'a',
    },
  );
}

console.log(`Prepared GitHub Pages SPA fallback in ${path.relative(root, outputDir)}.`);
if (mode === 'custom' && customDomain) {
  console.log(`Wrote CNAME for ${normalizeDomain(customDomain)}.`);
}
if (mode === 'repo') {
  console.log(`Repository Pages mode expects base href /${repoName}/.`);
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function normalizeOutputPath(outputPath, fallbackProjectName) {
  if (typeof outputPath === 'string' && outputPath.trim()) {
    return path.resolve(root, outputPath);
  }

  if (outputPath && typeof outputPath === 'object') {
    const base = outputPath.base ?? `dist/${fallbackProjectName}`;
    const browser = outputPath.browser ?? 'browser';
    return path.resolve(root, base, browser);
  }

  return path.resolve(root, 'dist', fallbackProjectName);
}

async function findBrowserOutputDir(configuredOutput, fallbackProjectName) {
  const candidates = [
    configuredOutput,
    path.join(configuredOutput, 'browser'),
    path.resolve(root, 'dist', fallbackProjectName),
    path.resolve(root, 'dist', fallbackProjectName, 'browser'),
  ];

  const uniqueCandidates = [...new Set(candidates.map((candidate) => path.normalize(candidate)))];

  for (const candidate of uniqueCandidates) {
    try {
      await readFile(path.join(candidate, 'index.html'), 'utf8');
      return candidate;
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  fail(
    `Could not find index.html. Checked: ${uniqueCandidates.map((candidate) => path.relative(root, candidate)).join(', ')}`,
  );
}

function normalizeDomain(value) {
  const domain = value.trim().replace(/\.$/, '');

  if (!domain || domain.includes('://') || domain.includes('/') || domain.includes('\\')) {
    fail(
      'GH_PAGES_CUSTOM_DOMAIN must be a domain only, without protocol, path, or trailing slash.',
    );
  }

  return domain;
}

function sanitizeRepoName(value) {
  return value.trim().replace(/^\/+|\/+$/g, '') || 'sureplace';
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

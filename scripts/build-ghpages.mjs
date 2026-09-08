import { spawn } from 'node:child_process';
import path from 'node:path';

const mode = valueAfter('--mode') ?? 'custom';
const repoName = sanitizeRepoName(process.env.GH_PAGES_REPO_NAME ?? 'sureplace');
const baseHref = mode === 'repo' ? `/${repoName}/` : '/';
const root = process.cwd();

if (mode !== 'custom' && mode !== 'repo') {
  fail(`Unknown mode "${mode}". Use "custom" or "repo".`);
}

await runLocalBin('ng', ['build', '--configuration', 'production', '--base-href', baseHref]);
await run('node', ['scripts/prepare-ghpages.mjs', '--mode', mode]);

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function sanitizeRepoName(value) {
  const repoNameValue = value.trim().replace(/^\/+|\/+$/g, '') || 'sureplace';

  if (!/^[A-Za-z0-9._-]+$/.test(repoNameValue)) {
    fail('GH_PAGES_REPO_NAME may contain only letters, numbers, dots, underscores, and hyphens.');
  }

  return repoNameValue;
}

function runLocalBin(command, args) {
  const extension = process.platform === 'win32' ? '.cmd' : '';
  return run(path.join(root, 'node_modules', '.bin', `${command}${extension}`), args);
}

function run(command, args) {
  if (process.platform === 'win32') {
    return runWindowsCommand(command, args);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}.`));
      }
    });
  });
}

function runWindowsCommand(command, args) {
  const commandLine = [command, ...args].map(quoteWindowsArg).join(' ');

  return new Promise((resolve, reject) => {
    const child = spawn(commandLine, { shell: true, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${commandLine} exited with code ${code}.`));
      }
    });
  });
}

function quoteWindowsArg(value) {
  const stringValue = String(value);
  if (/^[A-Za-z0-9._/:\\-]+$/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replaceAll('"', '\\"')}"`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

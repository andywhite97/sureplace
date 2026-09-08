import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();

await runNpm(['run', 'build:ghpages']);

const { stdout } = await execFileAsync(process.platform === 'win32' ? 'node.exe' : 'node', [
  'scripts/prepare-ghpages.mjs',
  '--print-output',
]);
const outputDir = stdout.trim();

if (!outputDir) {
  console.error('Could not determine the GitHub Pages output directory.');
  process.exit(1);
}

await runLocalBin('angular-cli-ghpages', ['--dir', outputDir]);

function runLocalBin(command, args) {
  const extension = process.platform === 'win32' ? '.cmd' : '';
  return run(path.join(root, 'node_modules', '.bin', `${command}${extension}`), args);
}

function runNpm(args) {
  return run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args);
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

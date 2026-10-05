import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(root, 'android');
const env = { ...process.env };
if (process.platform === 'win32') {
  const jdks = join(env.USERPROFILE || '', '.jdks');
  const java21 = existsSync(jdks) ? readdirSync(jdks).map((name) => join(jdks, name)).find((path) =>
    existsSync(join(path, 'release')) && /JAVA_VERSION="21\./.test(readFileSync(join(path, 'release'), 'utf8')),
  ) : undefined;
  env.JAVA_HOME ||= java21 || join(env.ProgramFiles || 'C:/Program Files', 'Android', 'Android Studio', 'jbr');
  env.ANDROID_HOME ||= join(env.LOCALAPPDATA || '', 'Android', 'Sdk');
}
const java = env.JAVA_HOME
  ? join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : 'java';
if (env.JAVA_HOME && !/JAVA_VERSION="21\./.test(readFileSync(join(env.JAVA_HOME, 'release'), 'utf8'))) {
  throw new Error('Set JAVA_HOME to a JDK 21 installation for this Capacitor/Gradle build.');
}
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'run', 'SurePlace:build-mobile']);
if (!existsSync(android)) run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'add', 'android']);
run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android']);
if (!existsSync(join(android, 'local.properties')) && env.ANDROID_HOME) {
  writeFileSync(join(android, 'local.properties'), `sdk.dir=${env.ANDROID_HOME.replaceAll('\\', '/')}`);
}
run(java, ['-classpath', 'gradle/wrapper/gradle-wrapper.jar', 'org.gradle.wrapper.GradleWrapperMain', 'assembleDebug', '--console=plain'], android);
const destination = join(root, 'dist', 'android', 'SurePlace-prototype-debug.apk');
mkdirSync(dirname(destination), { recursive: true });
copyFileSync(join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), destination);
console.log(`Android prototype: ${destination}`);

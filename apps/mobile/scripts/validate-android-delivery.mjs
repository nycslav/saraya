import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (name) => JSON.parse(readFileSync(join(projectRoot, name), 'utf8'));
const app = readJson('app.json').expo;
const eas = readJson('eas.json');
const errors = [];

const requireValue = (condition, message) => {
  if (!condition) errors.push(message);
};

requireValue(app.android?.package === 'com.teamsaraya.saraya', 'Android package name is not stable.');
requireValue(Boolean(app.extra?.eas?.projectId), 'The Expo EAS project ID is missing.');
requireValue(eas.cli?.appVersionSource === 'remote', 'Android version codes must be managed remotely.');
requireValue(Boolean(app.icon) && existsSync(join(projectRoot, app.icon)), 'The application icon is missing.');
requireValue(
  Boolean(app.android?.adaptiveIcon?.foregroundImage) &&
    existsSync(join(projectRoot, app.android.adaptiveIcon.foregroundImage)),
  'The Android adaptive icon foreground is missing.',
);

for (const profile of ['development', 'preview', 'production']) {
  requireValue(eas.build?.[profile]?.environment === profile, `${profile} does not use its matching EAS environment.`);
}

requireValue(eas.build?.development?.android?.buildType === 'apk', 'Development must produce an APK.');
requireValue(eas.build?.preview?.android?.buildType === 'apk', 'Preview must produce an APK.');
requireValue(eas.build?.production?.android?.buildType === 'app-bundle', 'Production must produce an AAB.');
requireValue(eas.build?.production?.autoIncrement === true, 'Production version codes must auto-increment.');
requireValue(eas.submit?.production?.android?.track === 'internal', 'Production submission must target internal testing.');
requireValue(eas.submit?.production?.android?.releaseStatus === 'draft', 'Production submission must remain a draft.');

if (errors.length > 0) {
  console.error(`Android delivery configuration failed:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Android delivery configuration is valid.');
}

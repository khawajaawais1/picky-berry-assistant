const { existsSync } = require('node:fs');

/**
 * The app's dynamic config: `app.json` as written, plus the one value that cannot live there.
 *
 * Android push (FCM) needs the Firebase project's `google-services.json` at build time. It is kept
 * out of git (`.gitignore`): EAS hands it to the build as the file variable `GOOGLE_SERVICES_JSON`,
 * and a build on this machine reads `./google-services.json` when it is there. Without either, the
 * key is left out and the build has no FCM: the app then says this phone cannot be registered
 * (ADR-067).
 */
module.exports = ({ config }) => {
  // Expo and EAS resolve the config from the app's own folder.
  const local = './google-services.json';
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ?? (existsSync(local) ? local : undefined);

  return googleServicesFile === undefined
    ? config
    : { ...config, android: { ...config.android, googleServicesFile } };
};

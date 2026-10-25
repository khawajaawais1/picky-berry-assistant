import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { themes } from '@/constants/theme';

/**
 * The installer and the launch screen are the first thing anyone sees, and they are configured in
 * `app.json` rather than drawn from the theme. They were still the Expo template's colours — a
 * bright blue splash and a pale-blue adaptive-icon background (frontend review, 2026-10-25).
 */
const ROOT = join(__dirname, '..', '..', '..');
const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as {
  expo: {
    android: { adaptiveIcon: { backgroundColor: string } };
    plugins: [string | [string, Record<string, unknown>]][];
  };
};

const splash = app.expo.plugins.find(
  (plugin): plugin is [string, { backgroundColor: string }] =>
    Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
);

describe('the launch assets', () => {
  it('paints the splash in the brand accent, with the mark on top', () => {
    expect(splash?.[1].backgroundColor).toBe(themes.light.colors.accent);
  });

  it('paints the Android adaptive icon on the app background', () => {
    expect(app.expo.android.adaptiveIcon.backgroundColor).toBe(themes.light.colors.background);
  });
});

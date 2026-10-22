import { Share } from 'react-native';

/**
 * Handing a copy to the device's own share sheet.
 *
 * The app's position is that it sends nothing anywhere (SECURITY.md §17) and holds no transport
 * (ADR-005), and an export does not change that: this opens the platform's own sheet and returns
 * what the platform answered. **Where the copy goes is the user's choice in that sheet**, made
 * outside the app — the app neither picks a destination, nor uploads anything, nor learns where a
 * copy ended up. That is why the export screen's own copy names the share sheet rather than a
 * destination, and why this module has no list of apps, no address and no server.
 *
 * The platform's answer is **typed**, because a screen has to be able to say the true thing:
 *
 * - `shared` — the platform handed the copy to its sheet. Note what this does *not* claim: on iOS
 *   the platform reports this action even when the user backs out of the sheet without picking
 *   anything, so a screen may say the copy was handed over and must not say it arrived anywhere.
 * - `dismissed` — the user closed the sheet without choosing.
 *
 * A platform that would not open a sheet at all **rejects**, and the rejection is deliberately not
 * swallowed (AGENTS.md §2.3): a screen that claimed a copy had been shared while the platform
 * refused it would be lying about the user's own data.
 *
 * Already in Expo: `Share` is React Native's own API, so this adds no dependency and no native
 * module — and, on the web target the layout harness measures, the same API exists but rejects
 * when the browser has no share sheet, which is a state the screen states rather than hides.
 */
export type ShareOutcome = 'shared' | 'dismissed';

/** Opens the platform's share sheet with `text`, and answers what the platform did with it. */
export async function shareText(text: string, title: string): Promise<ShareOutcome> {
  const result = await Share.share({ message: text, title });

  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}

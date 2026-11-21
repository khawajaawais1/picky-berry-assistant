import { useEffect } from 'react';

import { useSession } from '@/hooks/use-session';
import { setAppLocale } from '@/services/i18n';

import { useAccountProfile, type ProfileApi } from '../hooks/use-account-profile';

export type AccountLanguageProps = {
  /** The account service. Without it the app follows the device, as it did before ADR-067. */
  accountApi?: ProfileApi;
};

/**
 * Makes the app speak the signed-in account's language (`lang` on `GET /me`, ADR-067). Mounted
 * once in the app shell; it draws nothing. Sign-out puts the device's language back
 * (`src/services/sign-out.ts`), and until the profile has been read the device's is the one used.
 */
export function AccountLanguage({ accountApi }: AccountLanguageProps) {
  const { session } = useSession();
  const { profile } = useAccountProfile(accountApi, session?.accountId ?? null);
  const lang = profile?.lang ?? null;

  useEffect(() => {
    if (lang !== null) setAppLocale(lang);
  }, [lang]);

  return null;
}

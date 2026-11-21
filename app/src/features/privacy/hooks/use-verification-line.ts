import { useEffect, useState } from 'react';

import { useTranslation } from '@/services/i18n';
import type { Session } from '@/services/session';
import { identifierKind } from '@/utils/identifier';

import type { AccountApi } from '../services/account-api';

/**
 * The account row's verification line (ADR-065, the plan's phase 5).
 *
 * With the account service, `GET /me` decides it: “Email verified” or “Email not verified yet”,
 * and nothing at all until the service has answered or when it could not. The row never claims
 * a verification it has not been told about. Without the service the line is the one the
 * screens always drew from the identifier's kind.
 */
export function useVerificationLine(
  session: Session | null,
  accountApi: Pick<AccountApi, 'profile'> | undefined,
): string {
  const { t } = useTranslation();
  const [verified, setVerified] = useState<boolean | null>(null);
  const accountId = session?.accountId ?? null;

  useEffect(() => {
    if (!accountApi || accountId === null) return;

    let active = true;
    accountApi.profile().then(
      (profile) => {
        if (active) setVerified(profile.emailVerified);
      },
      () => {
        // An account service that could not answer is not a verification: the line stays empty
        // rather than guessing in either direction.
        if (active) setVerified(null);
      },
    );

    return () => {
      active = false;
    };
  }, [accountApi, accountId]);

  if (session === null) return '';

  if (accountApi) {
    if (verified === null) return '';
    return t(verified ? 'privacy.account.verifiedEmail' : 'privacy.account.unverifiedEmail');
  }

  return t(
    identifierKind(session.accountId) === 'email'
      ? 'privacy.account.verifiedEmail'
      : 'privacy.account.verifiedPhone',
  );
}

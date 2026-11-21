/**
 * Deleting the account (ADR-065, the API integration plan's phase 5): first at the account
 * service, then on this device, in that order.
 *
 * The device keeps its records until the service has deleted the account, so a refused or
 * unreachable deletion leaves everything as it was and the user can try again. Once the service
 * has deleted it, a device that could not be cleared is its own outcome, so the screen never says
 * "nothing was deleted" about an account that is gone.
 *
 * The two steps are injected: the route passes the account API's `deleteAccount` and the
 * device clean-up sign-out already does (`services/sign-out.ts`).
 */
export type DeleteAccountOutcome =
  { ok: true } | { ok: false; reason: 'refused' | 'unavailable' | 'device-not-cleared' };

export type DeleteAccountSteps = {
  deleteAtService: (
    password: string,
  ) => Promise<{ ok: true } | { ok: false; reason: 'refused' | 'unavailable' }>;
  clearDevice: () => Promise<void>;
};

export async function deleteAccountEverywhere(
  password: string,
  { clearDevice, deleteAtService }: DeleteAccountSteps,
): Promise<DeleteAccountOutcome> {
  const deleted = await deleteAtService(password);
  if (!deleted.ok) return deleted;

  try {
    await clearDevice();
  } catch {
    return { ok: false, reason: 'device-not-cleared' };
  }

  return { ok: true };
}

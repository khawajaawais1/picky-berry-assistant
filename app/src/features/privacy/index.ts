/**
 * Public API of the `privacy` feature.
 *
 * The account-and-offline surface of the design (frame 14): the privacy settings screen that
 * keeps screen 05's promise (by switching visit tracking off again, and by saying
 * whose settings these are — ADR-029), the list behind the frame's “Saved spots” row, which is
 * the screen the design never drew (ADR-030), and the two screens behind the frame's remaining
 * app-drawn rows — “Account & security” and “Terms & privacy” (ADR-039) — and the surface the
 * copy of those records is taken on, “Your data” (ADR-040), which the notice leads to. They read
 * records that live in `src/services/` (the consent, the plan, the session) through the shared
 * hooks, which are shared rather than owned here.
 */
export {
  AccountSecurityScreen,
  type AccountSecurityScreenProps,
} from './components/account-security-screen';

export {
  PrivacySettingsScreen,
  type PrivacySettingsScreenProps,
} from './components/privacy-settings-screen';

export {
  TermsPrivacyScreen,
  type TermsPrivacyScreenProps,
} from './components/terms-privacy-screen';

export { YourDataScreen, type YourDataScreenProps } from './components/your-data-screen';

// The account's own profile, read once and shared by every screen that shows a part of it, the
// Language screen, and the shell's language follower (ADR-067).
export { AccountLanguage, type AccountLanguageProps } from './components/account-language';
export { LanguageScreen, type LanguageScreenProps } from './components/language-screen';
export { PushRegistration, type PushRegistrationProps } from './components/push-registration';
export {
  useAccountProfile,
  type AccountProfileState,
  type ProfileApi,
  type ProfileSave,
} from './hooks/use-account-profile';

// The team API's account endpoints (ADR-065, the API integration plan's phase 5).
export {
  AccountReadError,
  createAccountApi,
  parseProfile,
  type AccountApi,
  ALERT_RADIUS_KM,
  type AccountProfile,
  type DeleteAccountResult,
  type DeviceRegistration,
  type PrivacyLevel,
  type ProfilePatch,
  type RegisterDeviceResult,
} from './services/account-api';
export { appAccountApi, appProfileApi } from './services/app-account-api';

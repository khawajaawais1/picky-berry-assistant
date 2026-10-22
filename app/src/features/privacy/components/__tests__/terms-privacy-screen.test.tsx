import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { recordPrivacyConsent } from '@/services/privacy-consent';
import { enqueueReport } from '@/services/report-queue';
import { saveZone } from '@/services/saved-zones';
import { sessionPort } from '@/services/session';

import { TermsPrivacyScreen } from '../terms-privacy-screen';

/**
 * The screen frame 14's “Terms & privacy” row opens (node 5:23688). **The design never drew it**
 * (ADR-039), so its copy is this repository's — written in the app's voice, in both shipped
 * languages, and asserted here literally so a silent change fails.
 *
 * What this screen has to get right is that it is a *claim about the phone*: it names the records
 * the device is holding and how each one goes away, and it says nothing about a record that is not
 * there. The list itself is `heldRecords` (its own test holds the rule); this file holds what the
 * screen does with it.
 */
const READ_FAILED =
  'Some of what this phone holds could not be read, so the list below is incomplete.';
const SIGN_OUT = 'Sign out';

beforeEach(async () => {
  await AsyncStorage.clear();
  // The session lives in the process rather than in the storage the tests clear (ADR-028), so every
  // test starts by leaving go of whatever the last one was holding.
  await sessionPort.signOut();
});

describe('TermsPrivacyScreen', () => {
  it('renders the frame’s row in its own words', async () => {
    await render(<TermsPrivacyScreen />);

    expect(screen.getByText('ACCOUNT / OFFLINE · TERMS & PRIVACY')).toBeOnTheScreen();
    expect(screen.getByText('Terms & privacy')).toBeOnTheScreen();
    expect(
      screen.getByText('What this phone holds, why each record exists, and how it goes away.'),
    ).toBeOnTheScreen();
  });

  it('names every record the phone is holding, and how each one goes away', async () => {
    await recordPrivacyConsent(true);
    await saveZone('Z14');
    await enqueueReport({
      amountText: '1.3 kg',
      minutes: 52,
      recordedAt: '2026-08-28T10:55:00.000Z',
      speciesId: 'lingonberry',
      yieldRating: 4,
      zoneId: 'Z14',
    });
    await sessionPort.signIn({
      code: '000000',
      displayName: 'Aino Korhonen',
      identifier: 'aino@example.fi',
    });

    await render(<TermsPrivacyScreen />);

    expect(await screen.findByText('Your account')).toBeOnTheScreen();
    expect(screen.getByText('Visit tracking consent')).toBeOnTheScreen();
    expect(screen.getByText('Saved spots')).toBeOnTheScreen();
    expect(screen.getByText('Visits waiting to sync')).toBeOnTheScreen();

    // Each record carries what it is and how it goes: the four questions AGENTS.md §11 asks of a
    // stored field are answered on the screen that names it (who may read it, how it is corrected,
    // how a copy is had, how it is deleted — the last three below and in the rights card).
    expect(
      screen.getByText('The name you signed up with, and the address or number you entered.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Held in the app’s memory only: closing the app loses it, and signing out drops it too.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Removed with the bookmark on a zone’s own screen; signing out deletes the whole list.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Listed in the sync centre; signing out deletes them.'),
    ).toBeOnTheScreen();
  });

  it('says the phone holds nothing rather than drawing an empty list', async () => {
    await render(<TermsPrivacyScreen />);

    expect(await screen.findByText('Nothing of yours is on this phone yet.')).toBeOnTheScreen();
    expect(screen.queryByText('Your account')).not.toBeOnTheScreen();
    expect(screen.queryByText('Saved spots')).not.toBeOnTheScreen();
  });

  it('answers the four questions a stored field owes, on the screen that names the field', async () => {
    await recordPrivacyConsent(true);

    await render(<TermsPrivacyScreen />);
    await screen.findByText('Visit tracking consent');

    // Why it exists and how it is corrected: the consent's own screen, in the record's own words.
    expect(
      screen.getByText(
        'Changed on Privacy settings; switching it off writes the refusal in place of the consent.',
      ),
    ).toBeOnTheScreen();
    expect(await screen.findByText('Your rights, and where they are')).toBeOnTheScreen();
    expect(screen.getByText('See it')).toBeOnTheScreen();
    expect(screen.getByText('Take a copy')).toBeOnTheScreen();
    // The row names where the copy is taken and where it goes; the screen behind it is ADR-040's.
    expect(
      screen.getByText(
        'Taken on Your data: one file holding the records above, handed to this device’s own share sheet.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Correct it')).toBeOnTheScreen();
    expect(screen.getByText('Delete it')).toBeOnTheScreen();
    expect(
      screen.getByText('Signing out deletes every record above from this phone.'),
    ).toBeOnTheScreen();
  });

  it('states what the app sends, and what it is still owed', async () => {
    await render(<TermsPrivacyScreen />);

    expect(screen.getByText('Nothing leaves this phone')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'No account service, zone service or weather source is connected, so the app sends nothing anywhere. The reports it holds have never been uploaded.',
      ),
    ).toBeOnTheScreen();
    // The notice and the terms are the owner's to write; the screen says so rather than inventing
    // legal text (PROJECT.md open questions 15–16).
    expect(screen.getByText('The written notice')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'The privacy notice and the terms are still being written, and this screen is where they will stand. What the app can state today is above: the records it holds, why each exists, and how to remove it.',
      ),
    ).toBeOnTheScreen();
  });

  it('is a reading: nothing here can change a record', async () => {
    await render(<TermsPrivacyScreen onOpenYourData={jest.fn()} />);

    // No control can change a record from here: each one is changed where it lives (the settings
    // screen, a zone's bookmark, sign out), so such an action here would claim a role it does not
    // have (AGENTS.md §11.2). The one control the screen does carry is the way to the copy, which
    // changes nothing — it hands a copy over.
    expect(screen.getByRole('button', { name: 'Your data' })).toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText(SIGN_OUT)).not.toBeOnTheScreen();
  });

  it('offers the way to the copy only when there is a destination for it', async () => {
    const onOpenYourData = jest.fn();
    const { rerender } = await render(<TermsPrivacyScreen onOpenYourData={onOpenYourData} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Your data' }));
    expect(onOpenYourData).toHaveBeenCalledTimes(1);

    // Without a destination the row stays the reading it was: a link that cannot open anything
    // claims no role.
    await rerender(<TermsPrivacyScreen />);
    await waitFor(() => expect(screen.queryAllByRole('button')).toHaveLength(0));
    expect(screen.getByText('Take a copy')).toBeOnTheScreen();
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<TermsPrivacyScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<TermsPrivacyScreen />);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen(),
    );
  });

  it('does not leave a record out silently, and never claims the phone is empty, when a read fails', async () => {
    // A store that will not answer is not an empty phone: the screen says what happened and claims
    // no records, rather than listing a subset as if it were the whole of what is held.
    //
    // This is the file's last test, and the refusal is a blanket one, for the reason the settings
    // screen's file records: a spy over this shared mock is deliberately not restored (restoring it
    // resets the mock's own implementation), so a file that mocks the store leaves the mock behind
    // for whatever runs next.
    await saveZone('Z14');
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('the store refused'));

    await render(<TermsPrivacyScreen />);

    expect(await screen.findByText(READ_FAILED)).toBeOnTheScreen();
    expect(screen.queryByText('Saved spots')).not.toBeOnTheScreen();
    expect(screen.queryByText('Nothing of yours is on this phone yet.')).not.toBeOnTheScreen();
  });

  it('claims nothing about the phone while a read is still in flight', async () => {
    // “Nothing of yours is on this phone yet.” is a claim about a device, and the list below it is a
    // claim about records. Drawn over a store that has not answered, the screen would be claiming
    // both without having read either.
    //
    // The store is left holding a promise that never settles, which is why this is the file's last
    // test: every test above it reads the same shared mock, and one that never answers would hang
    // them (the comment on the test above records the same rule from the other side).
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValue(new Promise(() => {}));

    await render(<TermsPrivacyScreen />);
    await waitFor(() => expect(screen.getByText('What this phone holds')).toBeOnTheScreen());

    expect(screen.queryByText('Nothing of yours is on this phone yet.')).not.toBeOnTheScreen();
    expect(screen.queryByText('Saved spots')).not.toBeOnTheScreen();
  });
});

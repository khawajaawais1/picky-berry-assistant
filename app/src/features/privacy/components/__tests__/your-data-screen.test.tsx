import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { recordPrivacyConsent } from '@/services/privacy-consent';
import { enqueueReport } from '@/services/report-queue';
import { saveZone } from '@/services/saved-zones';
import { addToVisitOutbox } from '@/services/visit-outbox';
import { sessionPort } from '@/services/session';

import { EXPORT_FORMAT } from '../../domain/export-document';
import { YourDataScreen } from '../your-data-screen';
import { installFakeAuthServer } from '@/services/session/testing';

/**
 * The screen the export path is used from — the copy PROJECT.md's open question 23 names as owed,
 * drawn from the app's own vocabulary because the design never drew it.
 *
 * What this file holds is the screen's side of the promise:
 *
 * - it says **what the copy contains**, record by record, before anything is handed over;
 * - it hands over the document the app builds, unmodified (the document's own shape is
 *   `export-document.test.ts`'s business);
 * - it says which of the three things the platform did — and a platform that refused does not read
 *   as a copy that went somewhere;
 * - and it claims no action when there is nothing to hand the copy to.
 */
const READ_FAILED =
  'Some of what this phone holds could not be read, so the list below is incomplete.';
const SHARE = 'Share a copy';

beforeEach(async () => {
  installFakeAuthServer();
  await AsyncStorage.clear();
  // The session lives in the process rather than in the storage the tests clear (ADR-028), so every
  // test starts by letting go of whatever the last one was holding.
  await sessionPort.signOut();
});

async function seedEveryRecord() {
  await recordPrivacyConsent(false);
  await saveZone('Z14', 'bilberry');
  await saveZone('Z09', 'bilberry');
  await enqueueReport({
    amountText: '1.3 kg',
    minutes: 52,
    recordedAt: '2026-08-28T10:55:00.000Z',
    speciesId: 'lingonberry',
    yieldRating: 4,
    zoneId: 'Z14',
  });
  await sessionPort.register({
    displayName: 'Aino Korhonen',
    email: 'aino@example.fi',
    password: 'berries1234',
    lang: 'en',
    consents: {},
  });
}

// Before the main block: its last test leaves the shared store hanging on purpose.
describe('YourDataScreen, with finished visits waiting to send (ADR-066)', () => {
  const WAITING = {
    clientId: '4cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d',
    zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    startedAt: '2026-08-03T09:00:00.000Z',
    endedAt: '2026-08-03T09:45:00.000Z',
  };

  it('lists the record and carries each entry in the copy', async () => {
    await addToVisitOutbox(WAITING);
    const onShare = jest.fn(async () => 'shared' as const);

    await render(<YourDataScreen onShare={onShare} />);
    expect(await screen.findByText('Finished visits waiting to send')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('your-data-share'));

    await waitFor(() => expect(onShare).toHaveBeenCalled());
    const [document] = onShare.mock.calls[0] as unknown as [string];
    expect(JSON.parse(document).waitingVisits).toEqual([WAITING]);
  });
});

describe('YourDataScreen', () => {
  it('renders its own words', async () => {
    await render(<YourDataScreen />);

    expect(screen.getByText('ACCOUNT / OFFLINE · YOUR DATA')).toBeOnTheScreen();
    expect(screen.getByText('Your data')).toBeOnTheScreen();
    expect(
      screen.getByText('A copy of what this phone holds, in a form another tool can read.'),
    ).toBeOnTheScreen();
  });

  it('names what the copy would carry, record by record, with each record’s own value', async () => {
    await seedEveryRecord();

    await render(<YourDataScreen onShare={jest.fn()} />);

    expect(await screen.findByText('What the copy contains')).toBeOnTheScreen();
    // The records' own names are the notice's, because they are the same records: one vocabulary,
    // not a second one invented for this screen.
    expect(screen.getByText('Your account')).toBeOnTheScreen();
    expect(screen.getByText('aino@example.fi')).toBeOnTheScreen();
    expect(screen.getByText('Visit tracking consent')).toBeOnTheScreen();
    // The decision the copy carries names the purpose the app serves, not the frames' heavier
    // promise (ADR-047; found by the claims guard).
    expect(screen.getByText('Visit tracking off')).toBeOnTheScreen();
    expect(screen.getByText('Saved spots')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByText('Visits waiting to sync')).toBeOnTheScreen();
    expect(screen.getByText('1')).toBeOnTheScreen();
  });

  it('says the phone holds nothing rather than drawing an empty list', async () => {
    await render(<YourDataScreen onShare={jest.fn()} />);

    expect(
      await screen.findByText('This phone holds nothing of yours yet, so the copy would be empty.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Your account')).not.toBeOnTheScreen();
    expect(screen.queryByText('Saved spots')).not.toBeOnTheScreen();
  });

  it('states what the file is, and what it deliberately does not hold', async () => {
    await render(<YourDataScreen onShare={jest.fn()} />);

    expect(await screen.findByText('The file')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'One JSON document: a format name, the moment the copy was made, and the records below in full. It holds nothing the app does not have — no password and no key, because the app has neither.',
      ),
    ).toBeOnTheScreen();
  });

  it('hands over the copy the app is holding when the action is used', async () => {
    await seedEveryRecord();
    const onShare = jest.fn().mockResolvedValue('shared');

    await render(<YourDataScreen onShare={onShare} />);
    await fireEvent.press(await screen.findByRole('button', { name: SHARE }));

    await waitFor(() => expect(onShare).toHaveBeenCalledTimes(1));

    // The screen hands over the document itself, and the document carries the phone's own values:
    // this is the assertion that what the user was shown above is what leaves.
    const copy = JSON.parse(onShare.mock.calls[0][0] as string) as Record<string, unknown>;

    expect(copy.format).toBe(EXPORT_FORMAT);
    expect(typeof copy.generatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(String(copy.generatedAt)))).toBe(false);
    expect(copy.incomplete).toBe(false);
    expect(copy.consent).toEqual({ visitTracking: false, decidedAt: expect.any(String) });
    expect(copy.savedZones).toEqual([
      { savedAt: expect.any(String), speciesId: 'bilberry', zoneId: 'Z14' },
      { savedAt: expect.any(String), speciesId: 'bilberry', zoneId: 'Z09' },
    ]);
    expect(copy.queuedReports).toEqual([
      expect.objectContaining({ minutes: 52, yieldRating: 4, zoneId: 'Z14' }),
    ]);
    expect(copy.account).toEqual(expect.objectContaining({ accountId: 'aino@example.fi' }));
    // Where the copy goes is the user's choice in the sheet, and the screen says exactly that.
    expect(
      screen.getByText(
        'The device’s own share sheet opens and you choose where the copy goes. The app sends nothing itself.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('The copy was handed to the share sheet.')).toBeOnTheScreen();
  });

  it('says the sheet was closed without choosing when the user backs out', async () => {
    const onShare = jest.fn().mockResolvedValue('dismissed');

    await render(<YourDataScreen onShare={onShare} />);
    await fireEvent.press(await screen.findByRole('button', { name: SHARE }));

    expect(
      await screen.findByText('The share sheet was closed without choosing.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('The copy was handed to the share sheet.')).not.toBeOnTheScreen();
  });

  it('does not claim the copy went anywhere when the platform refused it', async () => {
    const onShare = jest
      .fn()
      .mockRejectedValue(new Error('Share is not supported in this browser'));

    await render(<YourDataScreen onShare={onShare} />);
    await fireEvent.press(await screen.findByRole('button', { name: SHARE }));

    expect(await screen.findByText('The copy could not be handed over.')).toBeOnTheScreen();
    expect(screen.queryByText('The copy was handed to the share sheet.')).not.toBeOnTheScreen();
  });

  it('offers no action, and describes no sheet, when there is nothing to hand the copy to', async () => {
    // A screen with no way to share draws no control (AGENTS.md §11.2) and no sentence about a
    // sheet that would not open: the same rule that keeps a label from promising a destination.
    await render(<YourDataScreen />);

    expect(await screen.findByText('What the copy contains')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: SHARE })).not.toBeOnTheScreen();
    expect(screen.queryByText(/share sheet/)).not.toBeOnTheScreen();
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<YourDataScreen onBack={onBack} onShare={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<YourDataScreen onShare={jest.fn()} />);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen(),
    );
  });

  it('says the copy may be missing something when a read failed, rather than presenting a short list as the whole', async () => {
    // A store that will not answer is not an empty phone. This is the file's last test, and the
    // refusal is a blanket one, for the reason the other screens' files record: a spy over this
    // shared mock is deliberately not restored (restoring it resets the mock's own implementation),
    // so a file that mocks the store leaves the mock behind for whatever runs next.
    await saveZone('Z14', 'bilberry');
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('the store refused'));

    await render(<YourDataScreen onShare={jest.fn()} />);

    expect(await screen.findByText(READ_FAILED)).toBeOnTheScreen();
    expect(screen.queryByText('Saved spots')).not.toBeOnTheScreen();
    expect(
      screen.queryByText('This phone holds nothing of yours yet, so the copy would be empty.'),
    ).not.toBeOnTheScreen();
  });
});

/**
 * The account service's own copy (ADR-065, the plan's phase 5): `POST /me/export` holds what the
 * service keeps about the account, which is more than this phone holds. The screen hands it to
 * the same share sheet as the device's copy.
 */
describe('YourDataScreen, with the account service', () => {
  const EXPORT = '{\n  "profile": {}\n}';

  it('hands the service’s copy to the share sheet under its own title', async () => {
    const onShare = jest.fn(async () => 'shared' as const);
    const exportData = jest.fn(async () => EXPORT);

    await render(<YourDataScreen accountApi={{ exportData }} onShare={onShare} />);
    expect(await screen.findByText('The account service’s copy')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('your-data-service-share'));

    await waitFor(() => expect(onShare).toHaveBeenCalledWith(EXPORT, 'Picky account service data'));
    expect(await screen.findByTestId('your-data-service-outcome')).toHaveTextContent(
      'The copy was handed to the share sheet.',
    );
  });

  it('says so when the service could not hand its copy over, and opens no sheet', async () => {
    const onShare = jest.fn(async () => 'shared' as const);

    await render(
      <YourDataScreen
        accountApi={{ exportData: async () => Promise.reject(new Error('offline')) }}
        onShare={onShare}
      />,
    );
    await fireEvent.press(await screen.findByTestId('your-data-service-share'));

    expect(
      await screen.findByText('The account service could not hand over its copy. Try again.'),
    ).toBeOnTheScreen();
    expect(onShare).not.toHaveBeenCalled();
  });

  it('draws no service copy without the account service', async () => {
    await render(<YourDataScreen onShare={async () => 'shared'} />);

    expect(screen.queryByTestId('your-data-service-share')).not.toBeOnTheScreen();
  });
});

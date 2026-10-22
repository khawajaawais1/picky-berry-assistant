import { Share } from 'react-native';

import { shareText } from '../share-text';

/**
 * Handing a copy to the device's own share sheet — the second half of the export path
 * (`features/privacy/domain/export-document.ts` builds the copy; this hands it over).
 *
 * What these tests hold is the boundary the app promises about: the app hands the copy to the
 * platform and **does not decide where it goes** — the user picks the destination in the sheet —
 * and the platform's own answer (shared, dismissed, or a refusal) reaches the caller instead of
 * being swallowed into a claim that something was sent.
 */
describe('shareText', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hands the copy over exactly as it was built', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    const copy = '{"format":"picky.personal-data.v1"}';

    await shareText(copy, 'Your data');

    // Unmodified and as a message: the document is the user's record, not the app's summary of it.
    expect(share).toHaveBeenCalledWith({ message: copy, title: 'Your data' });
  });

  it('reports that the platform shared it', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });

    await expect(shareText('{}', 'Your data')).resolves.toBe('shared');
  });

  it('reports that the user closed the sheet without choosing', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });

    await expect(shareText('{}', 'Your data')).resolves.toBe('dismissed');
  });

  it('lets the platform’s refusal reach the caller', async () => {
    // A platform with no share sheet to open (a browser without `navigator.share`, which is what
    // the layout harness runs on) rejects. Folding that into “shared” — or into “dismissed” — would
    // let a screen tell the user their copy went somewhere, which is the one thing it must not say.
    jest
      .spyOn(Share, 'share')
      .mockRejectedValue(new Error('Share is not supported in this browser'));

    await expect(shareText('{}', 'Your data')).rejects.toThrow('Share is not supported');
  });
});

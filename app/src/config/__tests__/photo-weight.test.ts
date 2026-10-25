import { statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The app ships five photographs. They were full PNG exports — 2.5 MB between them — for boxes no
 * wider than 342 pt, which is a real download and memory cost on a phone in a forest (frontend
 * review, 2026-10-25). JPEG at quality 80 is the right format for a photograph and these are the
 * files the screens import.
 */
const IMAGES = join(__dirname, '..', '..', '..', 'assets', 'images');
const BUDGET_BYTES = 180 * 1024;

const PHOTOS = [
  'welcome-berries.jpg',
  'zone-season.jpg',
  'market-blueberries-card.jpg',
  'market-blueberries-detail.jpg',
  'market-lingonberries-card.jpg',
] as const;

describe('the bundled photographs', () => {
  it.each(PHOTOS)('%s is a JPEG within the photo budget', (name) => {
    const photo = statSync(join(IMAGES, name));

    expect(photo.size).toBeLessThan(BUDGET_BYTES);
  });
});

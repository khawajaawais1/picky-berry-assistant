import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The marketplace screens are outside the `(app)` shell, where the core navigation owns the bottom
 * safe-area edge. They kept handing that edge away too, so their last content could sit under the
 * home indicator (frontend review, 2026-10-25).
 */
const SCREENS = [
  'src/features/marketplace/components/market-browse-screen.tsx',
  'src/features/marketplace/components/market-chat-screen.tsx',
  'src/features/marketplace/components/market-listing-screen.tsx',
  'src/features/marketplace/components/market-order-screen.tsx',
];

const ROOT = join(__dirname, '..', '..', '..');

describe('the marketplace safe-area edges', () => {
  it.each(SCREENS)('%s owns the bottom edge, because no shell bar does', (file) => {
    const source = readFileSync(join(ROOT, file), 'utf8');

    expect(source).not.toContain("edges={['top']}");
  });
});

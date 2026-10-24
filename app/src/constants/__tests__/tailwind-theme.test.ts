import { layout, radii, spacing, themes, typography } from '../theme';

/**
 * `theme.ts` stays the single source of truth for design values; the Tailwind theme
 * only mirrors it so that utilities work in `className`. These tests are the reason
 * the mirror cannot rot: they fail for an added token, a changed value, or a stray
 * value that has no token behind it.
 *
 * The Tailwind theme is plain CommonJS, which is why it is required rather than
 * imported — TypeScript does not typecheck it.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the Tailwind config is CommonJS and intentionally outside the typechecked source tree.
const tailwind = require('../../../tailwind.config.js') as {
  theme: {
    colors: Record<string, string>;
    spacing: Record<string, string>;
    borderRadius: Record<string, string>;
    fontSize: Record<string, [string, { lineHeight: string; fontWeight: string }]>;
    extend: { height: Record<string, string>; minHeight: Record<string, string> };
  };
};

/**
 * Two token slots read badly as utilities (`text-text`, `text-textMuted`), so the
 * Tailwind theme names them after the design's own word for that colour. Anything
 * else must use the token name unchanged.
 */
const COLOR_ALIASES: Record<string, keyof typeof themes.light.colors> = {
  ink: 'text',
  inkMuted: 'textMuted',
};

describe('the Tailwind theme mirrors the design tokens', () => {
  it('exposes every colour slot at the token value', () => {
    const aliases = new Map(Object.entries(COLOR_ALIASES).map(([key, slot]) => [slot, key]));

    for (const [slot, value] of Object.entries(themes.light.colors)) {
      expect(
        tailwind.theme.colors[aliases.get(slot as keyof typeof themes.light.colors) ?? slot],
      ).toBe(value);
    }
  });

  it('defines no colour that theme.ts does not', () => {
    const known = new Set([...Object.keys(themes.light.colors), ...Object.keys(COLOR_ALIASES)]);

    expect(Object.keys(tailwind.theme.colors).filter((key) => !known.has(key))).toEqual([]);
  });

  it('exposes the spacing scale in pixels', () => {
    for (const [name, value] of Object.entries(spacing)) {
      expect(tailwind.theme.spacing[name]).toBe(`${value}px`);
    }
    expect(Object.keys(tailwind.theme.spacing).sort()).toEqual(Object.keys(spacing).sort());
  });

  it('exposes the radii in pixels', () => {
    for (const [name, value] of Object.entries(radii)) {
      expect(tailwind.theme.borderRadius[name]).toBe(`${value}px`);
    }
    expect(Object.keys(tailwind.theme.borderRadius).sort()).toEqual(Object.keys(radii).sort());
  });

  it('exposes every typography variant with its measured metrics', () => {
    for (const [variant, metrics] of Object.entries(typography)) {
      if (variant === 'code') {
        // `code` carries a platform font family and is not a Tailwind size.
        continue;
      }

      expect(tailwind.theme.fontSize[variant]).toEqual([
        `${metrics.fontSize}px`,
        { lineHeight: `${metrics.lineHeight}px`, fontWeight: metrics.fontWeight },
      ]);
    }
  });

  it('exposes every control height from the design, as a height and as a minimum', () => {
    // Both scales: a control the design sizes exactly (`h-*`) and one whose content must be
    // able to grow past it (`min-h-*`, which a large system text size needs).
    const heights = {
      action: layout.actionHeight,
      header: layout.headerHeight,
      chip: layout.chipHeight,
      touch: layout.minTouchTarget,
    };

    for (const [name, value] of Object.entries(heights)) {
      expect(tailwind.theme.extend.height[name]).toBe(`${value}px`);
      expect(tailwind.theme.extend.minHeight[name]).toBe(`${value}px`);
    }
  });
});

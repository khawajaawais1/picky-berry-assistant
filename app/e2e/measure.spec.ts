import { expect, test } from '@playwright/test';

import { LARGEST_FONT_SCALE, applyFontScale, findPageOverflow, measureCopy } from './measure';

/**
 * The probes are the instrument, so they are tested like one. A measurement that can
 * only ever report “fine” would be worse than no measurement: it would move the defect
 * into CI's blind spot with a green tick on top. Every case below is the smallest page
 * that must be reported, and the clean page that must not be.
 *
 * These pages are synthetic on purpose — they are what a break looks like in the DOM,
 * independent of any screen the app happens to ship today.
 */
test.describe('the measurement probes', () => {
  test('counts copy that wraps as more than one line', async ({ page }) => {
    await page.setContent('<div style="font: 16px/20px sans-serif; width: 24px">aaa bbb ccc</div>');

    const measurements = await measureCopy(page, 'aaa bbb ccc');

    expect(measurements).toHaveLength(1);
    expect(measurements[0]?.lines).toBeGreaterThan(1);
  });

  test('counts copy on a single line as one line', async ({ page }) => {
    await page.setContent('<div style="font: 16px/20px sans-serif">one short line</div>');

    const measurements = await measureCopy(page, 'one short line');

    expect(measurements).toHaveLength(1);
    expect(measurements[0]?.lines).toBe(1);
  });

  test('counts lines, not fragments, when a break keeps its trailing space', async ({ page }) => {
    // The shape that fooled the first version of this probe: RN-web renders text with
    // `white-space: pre-wrap`, and the space a line breaks at becomes a rectangle of its
    // own. Counting rectangles made screen 01's two-line supporting line read as three.
    await page.setContent(
      '<div id="copy" style="font:16px/20px sans-serif;white-space:pre-wrap;width:80px">alpha beta gamma delta</div>',
    );

    const observed = await page.evaluate(() => {
      const element = document.getElementById('copy')!;
      const range = document.createRange();
      range.selectNodeContents(element);

      return {
        fragments: Array.from(range.getClientRects()).filter((rect) => rect.width >= 1).length,
        boxLines: Math.round(element.getBoundingClientRect().height / 20),
      };
    });
    const measurements = await measureCopy(page, 'alpha beta gamma delta');

    // The fixture has to reproduce the shape, or it guards nothing: more rectangles than
    // lines, and a probe that reports the box's line count anyway.
    expect(observed.fragments).toBeGreaterThan(observed.boxLines);
    expect(measurements[0]?.lines).toBe(observed.boxLines);
  });

  test('measures the element that renders the copy, not the container around it', async ({
    page,
  }) => {
    // The shape every button has: a glyph and a label side by side. The container holds
    // both, so counting its rectangles would report two lines for a one-line label.
    await page.setContent(
      '<div><span style="display:inline-block;height:16px;width:16px"></span>' +
        '<span style="font:16px/20px sans-serif">Get started</span></div>',
    );

    const measurements = await measureCopy(page, 'Get started');

    expect(measurements).toHaveLength(1);
    expect(measurements[0]?.lines).toBe(1);
  });

  test('reports copy cut off by its box', async ({ page }) => {
    await page.setContent(
      '<div style="font:16px/20px sans-serif;overflow:hidden;white-space:nowrap;width:40px">cut off copy</div>',
    );

    const overflow = await findPageOverflow(page);

    expect(overflow.clipped).toHaveLength(1);
    expect(overflow.clipped[0]).toContain('cut off copy');
  });

  test('reports a page wider than the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent('<div style="width:900px;height:10px"></div>');

    const overflow = await findPageOverflow(page);

    expect(overflow.scrollsHorizontally).toBe(true);
  });

  test('reports a clean page as clean', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(
      '<div style="font:16px/20px sans-serif;width:320px">fits comfortably</div>',
    );

    const overflow = await findPageOverflow(page);
    const measurements = await measureCopy(page, 'fits comfortably');

    expect(overflow.clipped).toEqual([]);
    expect(overflow.scrollsHorizontally).toBe(false);
    expect(measurements[0]?.lines).toBe(1);
  });

  test('scales type by the platform factor, once', async ({ page }) => {
    // A field draws its value from a property rather than a text node, so it is the case
    // that a naive walk over text nodes would leave behind at the design's size.
    await page.setContent(
      '<div style="font:16px/20px sans-serif">scaled copy</div>' +
        '<input style="font:16px/20px sans-serif" value="typed copy">',
    );

    const first = await applyFontScale(page, LARGEST_FONT_SCALE);
    // The harness applies the scale again before its last check, to repair an element a
    // re-render reset — that second pass must not compound the size.
    const second = await applyFontScale(page, LARGEST_FONT_SCALE);

    const scaled = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('div')!);
      const field = getComputedStyle(document.querySelector('input')!);
      return {
        copy: { fontSize: style.fontSize, lineHeight: style.lineHeight },
        field: { fontSize: field.fontSize, lineHeight: field.lineHeight },
      };
    });

    expect(first).toBe(2);
    expect(second).toBe(2);
    expect(scaled).toEqual({
      copy: { fontSize: '32px', lineHeight: '40px' },
      field: { fontSize: '32px', lineHeight: '40px' },
    });
  });

  test('leaves icon glyphs alone', async ({ page }) => {
    // Icon fonts render one Private Use Area glyph, and `react-native-web` ignores the props
    // that would cap a glyph's growth — so what an icon does at 200 % is a device question,
    // not something this harness may demand a fix for. Both glyph planes are covered:
    // Feather's is in the BMP, Material Community's is above it.
    await page.setContent(
      '<div id="root" style="height:10px">' +
        '<span id="bmp" style="font:22px/22px sans-serif">&#xF0C8;</span>' +
        '<span id="astral" style="font:22px/22px sans-serif">&#xF032A;</span>' +
        '</div>',
    );

    const scaled = await applyFontScale(page, LARGEST_FONT_SCALE);
    const sizes = await page.evaluate(() =>
      ['bmp', 'astral'].map((id) => getComputedStyle(document.getElementById(id)!).fontSize),
    );
    const overflow = await findPageOverflow(page);

    expect(scaled).toBe(0);
    expect(sizes).toEqual(['22px', '22px']);
    expect(overflow.clipped).toEqual([]);
  });

  test('reports text that spills out of a box sized for the unscaled type', async ({ page }) => {
    // The shape of a fixed-height control under a large text size: the label sits in a box
    // of its own that fits it, and the box the design sizes does not. `overflow` is
    // visible, so nothing is hidden — the copy is painted over whatever follows it.
    await page.setContent(
      '<div style="height:20px"><span style="font:16px/20px sans-serif">spilling copy</span></div>',
    );

    await applyFontScale(page, LARGEST_FONT_SCALE);

    const overflow = await findPageOverflow(page);

    expect(overflow.clipped).toEqual(['div “spilling copy” is cut off vertically']);
  });

  test('reports the box that overflows, not every ancestor around it', async ({ page }) => {
    // A box that overflows also enlarges the scrollable area of each ancestor: the report
    // has to name the clip, or one defect reads as five.
    await page.setContent(
      '<div style="height:10px"><div style="height:20px;overflow:hidden;white-space:nowrap;width:40px">cut off copy</div></div>',
    );

    const overflow = await findPageOverflow(page);

    expect(overflow.clipped).toEqual(['div “cut off copy” is cut off horizontally']);
  });
});

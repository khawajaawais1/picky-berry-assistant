import type { Page } from '@playwright/test';

/**
 * The probes the layout harness measures with.
 *
 * They live apart from the manifest of screens (layout.spec.ts) so they can be tested
 * on their own (measure.spec.ts). All of them run inside the page, because the numbers
 * only exist in a browser — React Native Testing Library has no layout engine, which is
 * why the language measurement cannot be a Jest test (TESTING.md).
 */

/** The frames are authored at 390 px (docs/design-source.md). */
export const FRAME_VIEWPORT = { width: 390, height: 844 } as const;

/**
 * The largest text size a platform setting can ask for, as a multiple of the design's
 * metrics.
 *
 * Android's accessibility font-size setting tops out at 200 %, and 200 % is what
 * WCAG 1.4.4 (Resize text) requires, so that is the bar this project holds itself to
 * (AGENTS.md §11.2). iOS's accessibility sizes go beyond it; surviving 2.0 is the
 * requirement, not proof at the extreme (ADR-019).
 */
export const LARGEST_FONT_SCALE = 2;

/**
 * Attributes the emulation writes its originals into. They are data attributes rather
 * than a module-level map on purpose: React re-renders text with its own inline size,
 * so a second pass has to know what the design's metric was to re-apply it without
 * compounding the scale.
 */
const SCALED_SIZE_ATTRIBUTE = 'data-font-scale-size';
const SCALED_LEADING_ATTRIBUTE = 'data-font-scale-leading';

/**
 * Emulates the platform's text-size setting, which a web page does not have: the
 * browser renders `react-native-web`'s px sizes literally, so nothing grows. On a
 * device the OS multiplies each text element's size — and, on Android, its line height
 * too (`toPixelFromSP` in the platform's own text props) — which is what this does, in
 * the page, before the measurement.
 *
 * Idempotent: each element's original metrics are recorded on first use, so calling it
 * again re-applies the scale to an element a re-render reset instead of doubling it.
 * Returns how many elements carry scaled type — zero would mean the page had no text
 * to scale and the measurement below it proves nothing.
 */
export async function applyFontScale(page: Page, scale: number): Promise<number> {
  return page.evaluate(
    ({ factor, sizeAttribute, leadingAttribute }) => {
      const rendersText = (element: Element) =>
        Array.from(element.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
        );
      // A form control draws its value from a property, not from a text node, so it has to
      // be named explicitly — otherwise a field would keep the design's 16 px while the copy
      // around it doubled, and the measurement would call that 200 %.
      const rendersValue = (element: Element) =>
        element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';

      // Icon fonts render one Private Use Area glyph. They are left out of the emulation —
      // and out of the overflow check below — because RN-web ignores `allowFontScaling` and
      // `maxFontSizeMultiplier`: what a glyph does at a large text size cannot be measured
      // here, and a check that cannot be verified must not demand a fix (ADR-019).
      const glyphOnly = /^\p{Co}+$/u;
      const targets = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(
        (element) =>
          (rendersText(element) || rendersValue(element)) &&
          !glyphOnly.test((element.textContent ?? '').trim()),
      );

      // Every size is read before any is written: text nested inside text inherits its
      // parent's size, so a size read after a write would already be scaled.
      const metrics = targets.map((element) => {
        const style = getComputedStyle(element);
        const size = element.getAttribute(sizeAttribute) ?? style.fontSize;
        const leading = element.getAttribute(leadingAttribute) ?? style.lineHeight;

        return {
          element,
          size: Number.parseFloat(size),
          // `line-height: normal` has no number to scale; the browser keeps deriving it
          // from the font, which is what a device does too.
          leading: Number.parseFloat(leading),
        };
      });

      for (const { element, size, leading } of metrics) {
        if (!Number.isFinite(size)) continue;

        element.setAttribute(sizeAttribute, String(size));
        element.style.fontSize = `${size * factor}px`;

        if (Number.isFinite(leading)) {
          element.setAttribute(leadingAttribute, String(leading));
          element.style.lineHeight = `${leading * factor}px`;
        }
      }

      // Force one layout so a caller measuring immediately reads the scaled geometry.
      void document.body.offsetHeight;

      return metrics.length;
    },
    {
      factor: scale,
      sizeAttribute: SCALED_SIZE_ATTRIBUTE,
      leadingAttribute: SCALED_LEADING_ATTRIBUTE,
    },
  );
}

export type CopyMeasurement = {
  /** Line boxes the copy occupies, as the browser lays it out. */
  lines: number;
  /** True when the text is wider than the box that shows it — it is being cut off. */
  clipped: boolean;
  height: number;
  width: number;
};

/**
 * Measures every element that renders `text` directly.
 *
 * “Directly” excludes a container whose text comes from a child element: the label
 * inside a button sits next to an icon, so measuring the container would count the
 * icon's rectangle as a line of its own. Each renderer is measured separately because
 * the same string can appear more than once — in Finnish a chip label and a field
 * label can share their wording, and both must stay on one line.
 */
export async function measureCopy(page: Page, text: string): Promise<CopyMeasurement[]> {
  return page.getByText(text, { exact: true }).evaluateAll((elements, needle) => {
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
    const wanted = normalize(needle);

    const renderers = elements.filter((element) =>
      Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .some((node) => normalize(node.textContent ?? '') === wanted),
    );

    return renderers.map((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      // A rect is a text *fragment*, not a line: RN-web renders with
      // `white-space: pre-wrap`, so a line that breaks at a space gets a second rect for
      // that space (measured on screen 01's supporting line — two lines, three rects).
      // Lines are therefore the distinct tops, which is what a wrap changes.
      const fragments = Array.from(range.getClientRects()).filter(
        (rect) => rect.width >= 1 && rect.height >= 1,
      );
      const box = element.getBoundingClientRect();

      return {
        lines: new Set(fragments.map((rect) => Math.round(rect.top))).size,
        clipped: element.scrollWidth > element.clientWidth + 1,
        height: Math.round(box.height),
        width: Math.round(box.width),
      };
    });
  }, text);
}

export type PageOverflow = {
  /** True when the document is wider than the viewport — the screen scrolls sideways. */
  scrollsHorizontally: boolean;
  documentWidth: number;
  viewportWidth: number;
  /** Content that does not fit the box the app gave it, described for the report. */
  clipped: string[];
};

/**
 * Two whole-page checks that do not depend on the manifest: nothing may extend past the
 * viewport horizontally, and nothing may exceed the box the app gave it — a control the
 * design sizes at 36 px cannot hold 200 % type, and `overflow: visible` only means the
 * copy paints over whatever is beneath it instead of being cut off cleanly.
 *
 * Overflow is attributed to the boxes that are actually painted outside: an in-flow child
 * that sticks out of its parent, or content an element hides in a box too small for it.
 * Two kinds of number are deliberately not treated as overflow:
 *
 * - an absolutely positioned descendant's box — RN-web stretches one to the width of its
 *   container where native sizes it to its content, and a wide empty box paints nothing;
 * - a glyph-only element — an icon font renders one Private Use Area character, and what
 *   it does at a large text size is a device question (ADR-019).
 *
 * Every element is inspected, not only the ones that render text: the box that overflows
 * is usually the control (the button, the chip, the header), while the label inside it
 * sits in a box of its own that fits. Elements that scroll on purpose (the screen's
 * ScrollView) are exempt from the axis they scroll on — their content is longer than their
 * box by design — but their descendants are still inspected.
 *
 * One defect is one report: a box that overflows also enlarges the scrollable area of
 * every ancestor, so only the innermost offending element is named.
 */
export async function findPageOverflow(page: Page): Promise<PageOverflow> {
  return page.evaluate(() => {
    const describe = (element: Element) => {
      const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `${element.tagName.toLowerCase()} “${text}”`;
    };

    // `\p{Co}` is Unicode's Private Use category, across all planes: Feather's glyphs are
    // in the Basic Multilingual Plane and Material Community's in the Supplementary Private
    // Use Area, so a range limited to the BMP would miss most of the app's icons.
    const glyphOnly = (element: Element) => /^\p{Co}+$/u.test((element.textContent ?? '').trim());

    const findOverflow = (element: Element): string | null => {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return null;
      // A purely inline element has no box of its own to exceed — RN-web renders text as
      // `display: inline`, so the line box belongs to the block around it, which is
      // measured instead. (`inline-block` and the blockified flex children still have one.)
      if (style.display === 'inline') return null;
      if (glyphOnly(element)) return null;

      const box = element.getBoundingClientRect();
      const scrollsHorizontally = style.overflowX === 'auto' || style.overflowX === 'scroll';
      const scrollsVertically = style.overflowY === 'auto' || style.overflowY === 'scroll';
      let horizontal = false;
      let vertical = false;

      for (const child of Array.from(element.children)) {
        const childStyle = getComputedStyle(child);
        if (childStyle.display === 'none' || childStyle.position === 'absolute') continue;

        const childBox = child.getBoundingClientRect();
        if (childBox.width === 0 && childBox.height === 0) continue;

        if (childBox.right > box.right + 1 || childBox.left < box.left - 1) horizontal = true;
        if (!scrollsVertically && (childBox.bottom > box.bottom + 1 || childBox.top < box.top - 1))
          vertical = true;
      }

      // Content the element hides rather than paints out: a direct text node has no box of
      // its own to point at, so the element's own scroll extent is the evidence.
      if (!scrollsHorizontally && element.scrollWidth > element.clientWidth + 1) horizontal = true;
      if (!scrollsVertically && element.scrollHeight > element.clientHeight + 1) vertical = true;

      if (!horizontal && !vertical) return null;

      return `${describe(element)} is cut off ${horizontal ? 'horizontally' : 'vertically'}`;
    };

    const offenders = Array.from(document.querySelectorAll('body *')).filter(
      (element) => findOverflow(element) !== null,
    );
    const innermost = offenders.filter(
      (element) => !offenders.some((other) => other !== element && element.contains(other)),
    );

    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = window.innerWidth;

    return {
      clipped: innermost.map((element) => findOverflow(element)!),
      documentWidth,
      viewportWidth,
      scrollsHorizontally: documentWidth > viewportWidth + 1,
    };
  });
}

/**
 * Expo's own ambient types, referenced from a **tracked** file on purpose.
 *
 * They normally arrive through `expo-env.d.ts`, which Expo generates and `.gitignore`
 * excludes, so a clean checkout (CI) has no such file and `src/app/_layout.tsx`'s side-effect
 * import of `global.css` fails with TS2882 — found by the first CI run, 2026-10-21. The
 * generated file carries exactly this reference; saying it here makes a clean checkout type
 * the same way a developer's machine does.
 */
/// <reference types="expo/types" />

/**
 * Static assets imported through the bundler resolve to an opaque handle that React
 * Native's `Image` accepts as a source. Metro resolves these imports; the modules are
 * declared here so TypeScript can typecheck the files that use them.
 *
 * Only formats the project actually ships are declared — add one when an asset of
 * that kind is added, not in advance.
 */
declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.jpg' {
  const asset: number;
  export default asset;
}

import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { themes } from '@/constants/theme';

/**
 * The web document's shell.
 *
 * SDK 58 requires a custom root HTML to render the document context it is given: `headNodes`
 * carries the generated metadata and styles, and `bodyNodes` the font resources and JavaScript
 * bundles. Omitting them produces valid-looking pages with no scripts, which do not hydrate at all
 * — measured on this file's first version (frontend review, 2026-10-25).
 *
 * The app ships English and Finnish, but a static export can only be built in one of them: the
 * source language is declared here and the mounted app updates the label to the language it ended
 * up showing (`src/hooks/use-document-language.ts`).
 *
 * `color-scheme` lets the browser paint its own surfaces — form controls, scrollbars, the canvas
 * behind the app — from the user's answer rather than from the light default. The background rule
 * does the same for the first paint, before the app's theme resolves, so a dark-mode launch does
 * not flash a white page; both colours come from the tokens, not from copies here.
 */
export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, headNodes, htmlAttributes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light dark" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: [
              `html{background-color:${themes.light.colors.background};}`,
              `@media (prefers-color-scheme: dark){html{background-color:${themes.dark.colors.background};}}`,
            ].join(''),
          }}
        />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

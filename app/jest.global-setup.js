/**
 * Compiles the Tailwind CSS once per test run.
 *
 * Tailwind's PostCSS plugin is asynchronous, which a Jest setup file cannot await,
 * so the build happens here and `jest.setup.ts` registers the output — that is what
 * makes `className` resolve in tests the way Metro makes it resolve in the app.
 *
 * The output is written as a JS module rather than a `.css` file because Jest does
 * not transform CSS, and requiring a module avoids file-system access (and Node
 * globals) in the TypeScript setup file.
 *
 * @type {import('jest').GlobalSetup}
 */
module.exports = async (globalConfig) => {
  const fs = require('node:fs');
  const path = require('node:path');
  const postcss = require('postcss');
  const tailwindcss = require('tailwindcss');

  const root = globalConfig.rootDir;
  const input = fs.readFileSync(path.join(root, 'global.css'), 'utf8');

  const { css } = await postcss([tailwindcss(path.join(root, 'tailwind.config.js'))]).process(
    input,
    {
      from: 'global.css',
    },
  );

  const outDir = path.join(root, 'node_modules', '.cache', 'picky');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'tailwind-css.js'),
    `module.exports = ${JSON.stringify(css)};\n`,
  );
};

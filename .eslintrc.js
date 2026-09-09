module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
  ],
  // frontend/dist/ is Vite's build output (minified bundles) -- not source,
  // never worth linting. operator-os/ is a second, independent product
  // vendored into this repo (see CLAUDE.md) -- its own JS (e.g.
  // demo/engine.js) wasn't written to this app's lint conventions and has
  // its own correctness gate (operator-os/tests/, notably test_parity.py,
  // which checks this exact engine byte-for-byte against the Python one).
  // Applying this app's ESLint rules to it would mean "fixing" findings by
  // editing already-tested vendored code, which risks the kind of drift
  // that test suite exists to catch -- not a fix this app should be making.
  ignorePatterns: ['frontend/dist/', 'operator-os/'],
  parserOptions: {
    ecmaVersion: 12,
    // frontend/src/**/*.jsx is an ES module app (Vite + React) — import/
    // export everywhere, plus JSX syntax.
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  // Only for react/jsx-uses-vars -- without it, core no-unused-vars can't
  // see that a component's tag name in JSX (a JSXIdentifier, not a plain
  // Identifier) counts as using the import. Not pulling in the full
  // plugin:react/recommended ruleset -- this codebase doesn't follow (or
  // need) its broader opinions like prop-types.
  plugins: ['react'],
  rules: {
    'react/jsx-uses-vars': 'error',
  },
  overrides: [
    {
      // This config file itself is Node/CommonJS (module.exports) — env.node
      // has to stay scoped here, not global, because the "node" env would
      // otherwise leak into the browser-only frontend files above.
      files: ['.eslintrc.js'],
      env: { node: true },
      parserOptions: { sourceType: 'script' },
    },
    {
      // entry-server.jsx is the one src/ file that never ships to the
      // browser -- it's compiled by `vite build --ssr` into a Node-runnable
      // bundle and executed by scripts/prerender-content.mjs at build time
      // (see its own header comment). It needs process.cwd() to find
      // src/content/entries/ on disk, so it needs the Node env too.
      files: ['frontend/src/content/entry-server.jsx'],
      env: { node: true },
    },
  ],
};

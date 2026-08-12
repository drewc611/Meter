module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
  ],
  // frontend/dist/ is Vite's build output (minified bundles) -- not source,
  // never worth linting.
  ignorePatterns: ['frontend/dist/'],
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
  ],
};

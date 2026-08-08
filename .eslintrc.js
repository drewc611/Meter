module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 12,
    // Plain <script> tags (frontend/app.js, fallback-data.js), not ES
    // modules — no import/export anywhere. "script" (not "module") is what
    // makes the /* global */ and /* exported */ directive comments those
    // files rely on actually take effect for cross-file globals.
    sourceType: 'script',
  },
  rules: {
    // Add your custom rules here
  },
  overrides: [
    {
      // This config file itself is Node/CommonJS (module.exports) — env.node
      // has to stay scoped here, not global, because the "node" env disables
      // the /* exported */ directive the frontend script files above rely on.
      files: ['.eslintrc.js'],
      env: { node: true },
    },
  ],
};

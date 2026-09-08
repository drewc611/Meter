# Operator OS desktop cockpit

A real, native desktop app (via [Tauri](https://tauri.app)) wrapping an
**existing** Operator OS business folder -- opens it, runs the same
reporting commands `./os` would, shows the output in a native window. It
does not create a business, does not bundle the tool, and does not write
to `data/` -- see the "read-only" note below for why.

```bash
npm install
npm run dev      # runs it in a window against your own machine
npm run build    # produces a real installer for the platform you're on
```

Windows/macOS installers can only be produced by `npm run build` running
**on** Windows/macOS respectively -- Tauri, like every native-toolkit
framework, doesn't cross-compile a `.dmg` or `.msi` from Linux. The
`.github/workflows/operator-os-desktop.yml` workflow builds all three from
a single tag push, using GitHub's own macOS/Windows/Linux runners -- that's
the intended path to a real multi-platform release, not building them by
hand on three different machines.

## Why read-only, in this release

The rest of Operator OS is deliberately careful about writes: every mutation
goes through the event log, `os undo` exists, adapters propose before they
apply. This app's Rust shell (`src-tauri/src/lib.rs`) only runs an explicit
allowlist of reporting commands (`brief`, `cash`, `aging`, `margin`, `books
check`, etc.) -- nothing that touches a registry. Wiring up `os set`, `os
pull --apply`, or anything else that writes needs its own confirmation/undo
UI thought through properly first, not bolted on to hit a deadline. That's
real, scoped follow-up work, not a missing feature in this one.

## What's real here, and what still needs the founder

**Built and verified this session:** compiles clean (`cargo check`), a real
dev build launches and renders correctly (screenshotted against a live
scaffolded business folder, not just "it compiled"), and `run_report`
against real Operator OS commands returns the same output the terminal
gives. Icons are a placeholder mark, not real brand design -- see the note
in `src-tauri/icons/`.

**Needs the founder before this ships anywhere:**

1. **Fill in `brand.json`'s `author` and `support_email`** -- both are still
   the literal string `REPLACE_ME`. Every app store requires a real support
   contact; this can't be invented.
2. **Real icon design.** The placeholder in `src-tauri/icons/` is a
   generated geometric mark, not considered brand work.
3. **Code signing certificates**, for the GitHub Actions workflow's
   `APPLE_CERTIFICATE`/`APPLE_TEAM_ID`/etc. and a Windows code-signing cert
   -- without these, builds still work but launch with an OS-level
   "unidentified developer" warning, which is a hard blocker for actual app
   store distribution (both Apple and Microsoft require signed binaries).
4. **The legal LICENSE review and the Apple in-app-purchase question**,
   both already flagged in `../README.md` -- this app doesn't change either
   of those, it just makes them concrete: this is the actual binary that
   would need to clear App Review.

## Mobile (iOS/Android)

Not attempted, and not recommended as this product is currently designed.
Tauri does have an experimental mobile target, but Operator OS's whole
model -- pick any folder on disk, read/write plain CSV files there, shell
out to a Python interpreter -- doesn't fit either mobile OS's sandboxing.
Fitting it would mean redesigning the storage layer around each platform's
document-provider APIs, which is a different, larger project than "package
the existing tool for one more store," not a smaller one.

# Distribution

Two genuinely different tracks live under here. Don't conflate them --
they have different scope, different risk, and different owners.

## `pip/` -- package-manager distribution (built, tested, not yet published)

A real, working PyPI package: `pip install operator-os` gives an
`operator-os` command whose only job is `operator-os new <folder>`, which
unpacks a fresh, correctly-permissioned copy of the actual tool (bundled via
`git archive`, so it can never drift from or leak beyond the tracked files
in `operator-os/`). Verified end to end in this session: built a wheel,
installed it in a clean virtualenv, scaffolded a folder, and ran `./os
doctor` / `./os use` / `./os brief` against it successfully.

Not yet published -- that needs a real PyPI account and API token, which
only the founder can create (same category of manual step as the Stripe
Payment Link). See `pip/README.md` for the publish command.

`homebrew/operator-os.rb` is a templated formula wrapping that same PyPI
package via Homebrew's standard virtualenv strategy -- it can't be finished
until the PyPI publish above happens (the formula needs a real download URL
and sha256), and then needs a tap repo to live in (or a homebrew-core
submission, which has its own acceptance bar).

winget (Windows) and Chocolatey both have a similar shape once PyPI is live
-- a manifest/nuspec pointing at the same published package -- not built yet
since there's no point templating three more files against a package that
isn't published. Same for a Debian/apt package, which additionally needs
real repository hosting infrastructure to be reachable via `apt install`,
not just a `.deb` file.

## `desktop/` -- a real native GUI app (built, tested, not yet signed or submitted)

A genuine Tauri desktop app now exists at `desktop/` -- not a mockup. It
opens an existing Operator OS business folder and runs the same read-only
reporting commands (`brief`, `cash`, `aging`, `margin`, `books check`, etc.)
in a native window, styled to match `console/`'s existing ledger design.
Verified this session, not just written: `cargo check` and `cargo clippy`
clean, a real `cargo run` launched and rendered correctly under a virtual
display (screenshotted), and a Rust test suite exercises the actual bridge
logic against a real scaffolded business folder -- including confirming
that write commands (`set`, `pull --apply`, etc.) are rejected by the
allowlist, not just assumed safe. See `desktop/README.md` for the full
picture, including exactly what it doesn't do yet (any mutation) and why.

`.github/workflows/operator-os-desktop.yml` cross-builds macOS/Windows/
Linux installers from one tag push, via GitHub's own runners -- this
sandbox can only ever produce a Linux build itself (Tauri doesn't
cross-compile a `.dmg` or `.msi` from Linux, same as no framework does).
It's on manual/tag-triggered dispatch, not every push, since a three-OS
matrix build costs real CI minutes.

**Still blocked on the founder, unavoidably:**

1. `brand.json`'s `author` and `support_email` are still the literal string
   `REPLACE_ME` -- every store requires a real support contact.
2. Real icon/brand design -- what's in `desktop/src-tauri/icons/` right now
   is a placeholder geometric mark generated this session, not considered
   identity work.
3. Code-signing certificates (Apple Developer Program + a Windows
   code-signing cert) for the GitHub Actions workflow's secrets. Without
   them the app still builds and runs, it just launches with an OS-level
   "unidentified developer" warning -- fine for testing, a hard blocker for
   real store distribution.
4. **The in-app-purchase question**, unresolved and unresolvable from here:
   the founder kept Operator OS's permanent per-business license rather
   than a subscription. Apple's App Store Review Guideline 3.1.1 generally
   requires In-App Purchase for unlocking paid functionality, with narrow
   exceptions (reader apps, certain B2B/enterprise models). Whether
   Operator OS's shape qualifies is a real legal/business-development
   question -- get an actual answer (Apple's own developer relations, or
   counsel) before submitting, since it decides whether this app can be
   sold through the store at all under the current model, independent of
   how well it's built.
5. Operator OS's own `LICENSE` file states on its first page that it's a
   draft that "has not been reviewed by a lawyer." Fine for direct sales
   off the founder's own site; not fine once real money moves through a
   formal Apple/Google/Microsoft commerce agreement under the founder's
   name. Get it reviewed before submitting anywhere, not after.
6. Actual Apple Developer Program / Google Play Console / Microsoft
   Partner Center accounts -- payment info and, for Apple, real identity/
   business verification. Nothing here can be created by an agent session.

Google Play and the Microsoft Store are the two realistic near-term
targets once 1-6 above are resolved (Android is closer to viable than iOS
in principle, though Operator OS's filesystem model still needs real
adaptation work -- see "Mobile" below; Windows via the Microsoft Store is
close to just "sign the existing build"). The Mac App Store carries the
extra sandboxing and 3.1.1 questions above on top of the same signing
requirement.

## Mobile (iOS/Android)

Not attempted for iOS, and not recommended as this product is currently
designed. Operator OS's whole model -- pick any folder on disk, read/write
plain CSV files there, shell out to a Python interpreter -- doesn't fit
iOS's sandboxing at all, and Apple prohibits bundling/invoking an
interpreter like this outright. Android is less categorically blocked
(more filesystem flexibility, no prohibition on bundling an interpreter)
but still needs real design work most CLI-to-mobile ports skip: a bundled
Python runtime (Chaquopy or similar), a real document-picker-based storage
model instead of a fixed folder path, and a touch-first redesign of a UI
built around dense report text. That's a genuinely separate project from
what shipped this session, not a smaller version of it.

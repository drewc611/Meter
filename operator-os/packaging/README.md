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

## App stores (Apple App Store / Google Play / Microsoft Store)

Not started, and deliberately not templated the way the above is -- this
isn't a packaging problem, it's a different product. Operator OS is a
terminal CLI with no GUI; none of the three stores accept that shape of
software (sandboxed filesystem, no shell execution, review requires a real
native UI). Getting Operator OS onto them for real means:

1. **Building an actual GUI.** The closest existing asset is `console/` (a
   local, no-server HTML dashboard) -- a real desktop app would likely wrap
   that plus a way to invoke the engine, e.g. via Tauri (small binary,
   Rust-based, reuses the existing HTML/JS) or Electron (heavier, more
   precedent). This is weeks of real engineering, not a config file.
2. **Developer accounts under the founder's own identity** -- Apple
   Developer Program, Google Play Console, Microsoft Partner Center. Each
   needs payment info and, in Apple's case, real identity/business
   verification. Nothing here can be created by an agent session.
3. **A real answer to the in-app-purchase question.** The founder chose to
   keep Operator OS's permanent per-business license (not a subscription),
   sold directly, not through store commerce. Apple's App Store Review
   Guideline 3.1.1 generally requires In-App Purchase for unlocking paid
   functionality, with narrow exceptions (reader apps, certain B2B/
   enterprise distribution models). Whether Operator OS's specific shape
   qualifies for an exception is a real legal/business-development question,
   not something to guess at in code -- get an actual answer (from Apple's
   own developer relations, or counsel) before investing in the GUI build,
   since it decides whether app-store distribution is even viable under the
   current licensing model.
4. Operator OS's own `LICENSE` file states on its first page that it's a
   draft that "has not been reviewed by a lawyer." That's fine for a
   file-based tool sold directly off one's own site; it stops being fine
   the moment real money moves through a formal app-store commerce
   agreement under the founder's name. Get it reviewed before this track
   goes any further, not after.

This track needs the founder's go-ahead and account setup before any
engineering starts -- see the session summary that pointed here for the
specific open questions.

# operator-os (pip package)

This is the PyPI-installable scaffolder for [Operator OS](https://usemeritai.com/operator-os) --
a file-based business operating system that runs entirely on your own machine.
It is not the product itself; it's a thin `operator-os new <folder>` command
that unpacks the real tool into a folder you choose, same as `git clone` does
today. Everything after that runs exactly as documented in the product's own
`README.md`.

```
pip install operator-os
operator-os new my-business
cd my-business
./os doctor
./os use 01-field-service
./os brief
```

## Why a scaffolder, not a library

Operator OS keeps its business data (`data/`) colocated with its own code on
purpose -- that's what makes `git log` on `data/` a real audit trail, and what
makes the whole thing copyable as one folder. A global `pip install` can't
change that without changing the product, so this package's only job is to
put a fresh, correctly-permissioned copy of that folder structure wherever you
point it, then get out of the way.

## Building a release

The bundle (`src/operator_os_installer/_bundle/`) is generated, not checked
in -- it's `git archive`'d straight from the tracked files in `operator-os/`,
so there's exactly one source of truth and no risk of a stale copy silently
drifting from the real tool, or of accidentally bundling someone's local
`data/`, `data.rebuilt/`, or other gitignored/untracked files.

```bash
./scripts/build_bundle.sh   # from this directory
python3 -m build            # needs the `build` package: pip install build
python3 -m twine upload dist/*   # needs a real PyPI account + API token
```

`build_bundle.sh` and `python -m build` are safe to run any number of times
locally. `twine upload` is the one step that actually publishes to PyPI under
whoever's account is configured -- do not run it without meaning to.

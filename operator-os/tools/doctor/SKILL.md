---
name: doctor
description: Check the machine, the install, and the data, and say exactly what is missing and the one command that fixes it. Use at first install, after any error, or when something stops working.
---

# doctor

The cohort version of this product ran a live pre flight clinic before class one.
This is that clinic, as a command, available at three in the morning.

## Run it when

First install. Any time a command errors. Any time the numbers look wrong.

## Reads

`os doctor`, `os validate`, `brand.json`, the environment.

## The run

1. Run `os doctor`. It checks python version, git, the data folder, all nine
   registries, whether the business has been named, whether the data is valid,
   and whether the repo is writable.
2. For each failure, give one command and one sentence. Never a paragraph of
   options.
   - python too old: install a current python from python.org, then reopen the
     terminal
   - git missing on a Mac: `xcode-select --install`
   - git missing on Windows: install Git for Windows, then reopen the terminal
   - data folder missing: `os init`
   - business not named: `os setup`
   - registries missing: `os init`
   - data invalid: `os validate` and fix the rows it names
   - repo not writable: the folder is somewhere the system protects. Move the
     repo into the user's home folder.
3. If everything passes and something is still wrong, the fault is in the data,
   not the install. Go to `os validate` and read every warning.
4. Never suggest reinstalling. Nothing here is fixed by reinstalling, and the
   data folder is the one thing that must never be replaced.

## Writes

Nothing.

## Finish line

`os doctor` exits clean and `os brief` prints the operator's own business name.

## Refuses

- To modify the data layer to make a check pass.
- To delete or move `data/` under any circumstance.

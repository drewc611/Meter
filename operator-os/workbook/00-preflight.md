# 00 Pre flight

Twenty minutes. This is the module that used to be a live clinic. It checks your
machine before you build anything on it, so nothing later fails for a reason that
has nothing to do with your business.

## The finish line

`./os doctor` prints "Machine is ready." and nothing above it says MISSING.

## Do this, on a Mac

1. Open Terminal. Press Command and Space, type Terminal, press Return.
2. Check python:

```
python3 --version
```

You need 3.9 or newer. If the command is not found, or the number is lower:

```
xcode-select --install
```

Let that finish, then download the current python from python.org and install it.
Close Terminal and open it again afterwards. That step is not optional. A new
terminal is how the machine notices what you installed.

3. Check git:

```
git --version
```

If it is missing, `xcode-select --install` covers it too.

4. Put the repo where you keep your work. Your home folder is the safest place.
   Not Downloads, not a synced folder you have never checked, not anywhere with a
   space in the path if you can avoid it.

```
cd ~
unzip ~/Downloads/operator-os.zip
cd operator-os
bash scripts/install.sh
```

5. Run the check:

```
./os doctor
```

## Do this, on Windows

1. Open PowerShell. Press the Windows key, type PowerShell, press Return.
2. Check python:

```
python --version
```

If nothing happens, or Microsoft Store opens, python is not installed properly.
Download it from python.org, and during the install tick **Add python.exe to
PATH**. That checkbox is the single most common reason a Windows install fails.
Close PowerShell and open a new one afterwards.

3. Check git:

```
git --version
```

If it is missing, install Git for Windows from git-scm.com and reopen PowerShell.

4. Unzip the repo into your user folder. Right click the zip, Extract All, and
   set the destination to `C:\Users\<you>\operator-os`.

```
cd ~\operator-os
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

5. Run the check:

```
.\os.cmd doctor
```

## Check it

The output should look like this, with your own paths:

```
  python 3.9 or newer       3.12.4  ok
  git                       2.44.0
  data folder               .../operator-os/data
  registries                all 9 present
  business named            not set, run `os setup`
  data valid                clean
  repo writable             yes

  Machine is ready.
```

"business named: not set" is correct at this stage. You have not told it anything
about your business yet. That is module 01.

## When it goes wrong

**"python: command not found" even after installing.** You are in the terminal
window you had open before the install. Close it. Open a new one. This is true on
both platforms and it catches almost everyone once.

**"Permission denied" or "not writable".** The repo is somewhere the operating
system protects, usually a system folder or a locked cloud drive. Move the whole
folder into your home or user folder and run the installer again.

**PowerShell refuses to run the script.** Windows blocks unsigned scripts by
default. The command above already works around it with `-ExecutionPolicy
Bypass`, which applies to that one run only and changes nothing on your machine.

## Say this

If anything above failed and you want help reading the output:

```
Run the doctor tool. Here is what `os doctor` printed. Tell me the single
command that fixes the first failure, and nothing else.
```

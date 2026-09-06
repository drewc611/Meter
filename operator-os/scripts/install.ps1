# Operator OS installer for Windows PowerShell.
# Safe to run more than once. It never touches data\ if data\ already exists.

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Say([string]$m)  { Write-Host "  $m" }
function Step([string]$m) { Write-Host ""; Write-Host $m; Write-Host ("-" * 60) }

$Name = "Operator OS"
try {
  $Name = (Get-Content (Join-Path $Here "brand.json") -Raw | ConvertFrom-Json).product_name
} catch { }

Step "$Name install"

$Py = $null
foreach ($c in @("python", "py")) {
  $found = Get-Command $c -ErrorAction SilentlyContinue
  if ($found) {
    try {
      $v = & $c -c "import sys;print('%d.%d' % sys.version_info[:2])" 2>$null
      $parts = $v.Split(".")
      if ([int]$parts[0] -ge 3 -and [int]$parts[1] -ge 9) { $Py = $c; break }
    } catch { }
  }
}
if (-not $Py) {
  Say "Python 3.9 or newer is required and was not found."
  Say ""
  Say "  Download it from https://www.python.org/downloads/"
  Say "  During install, tick 'Add python.exe to PATH'."
  Say "  Then close this window, open a new one, and run this installer again."
  exit 1
}
$pyver = & $Py -c "import sys;print(sys.version.split()[0])"
Say "python            $pyver"

if (Get-Command git -ErrorAction SilentlyContinue) {
  Say "git               $((git --version).Split(' ')[2])"
} else {
  Say "git               not found. Optional, but you lose version history."
  Say "                  Get it from https://git-scm.com/download/win"
}

try {
  $probe = Join-Path $Here ".writetest"
  New-Item -Path $probe -ItemType File -Force | Out-Null
  Remove-Item $probe -Force
  Say "folder            writable"
} catch {
  Say "This folder is not writable. Move the repo into your user folder and retry."
  exit 1
}

if (Test-Path (Join-Path $Here "data\business.yml")) {
  Say "data              already exists, left untouched"
} else {
  & $Py (Join-Path $Here "scripts\os.py") init | Out-Null
  Say "data              created at data\"
}

$profileDir = Split-Path -Parent $PROFILE
if (-not (Test-Path $profileDir)) { New-Item -ItemType Directory -Path $profileDir -Force | Out-Null }
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }
if (-not (Select-String -Path $PROFILE -Pattern "OPERATOR_OS_HOME" -Quiet)) {
  Add-Content $PROFILE ""
  Add-Content $PROFILE "# $Name"
  Add-Content $PROFILE "`$env:OPERATOR_OS_HOME = `"$Here`""
  Add-Content $PROFILE "function os { & `"$Here\os.cmd`" @args }"
  Say "shortcut          'os' added to your PowerShell profile"
  Say "                  open a new PowerShell window to use it"
} else {
  Say "shortcut          already set"
}

Step "Installed"
Say "Next, in order:"
Say ""
Say "  .\os.cmd doctor                 check this machine"
Say "  .\os.cmd use                    look at the five encoded businesses"
Say "  .\os.cmd use 01-field-service   load one and look around"
Say "  .\os.cmd brief                  see it running"
Say ""
Say "When you are ready to make it yours:"
Say ""
Say "  .\os.cmd use 01-field-service --empty"
Say "  .\os.cmd setup"
Say "  .\os.cmd brief"
Say ""
Say "That last command printing your own business name is the finish line."
Write-Host ""

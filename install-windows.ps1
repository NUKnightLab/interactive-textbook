#Requires -Version 5.1
# Windows setup for Knight Lab Interactive Textbook.
# Double-click install-windows.bat to run, or right-click this file and choose Run with PowerShell.

# Resolve the folder this script lives in (the unzipped bundle root).
# This makes the script work regardless of where the student unzipped to.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$CourseDir  = Join-Path $ScriptDir "knightlab-course"

# Find the Knight Lab Textbook VSIX. Two locations supported:
#   1. .\knightlab-textbook-0.0.1.vsix           (distribution zip layout)
#   2. .\knightlab-textbook\...\same.vsix         (local dev tree layout)
# First match wins.
$TextbookVsix = $null
foreach ($candidate in @(
    (Join-Path $ScriptDir "knightlab-textbook-0.0.1.vsix"),
    (Join-Path $ScriptDir "knightlab-textbook\knightlab-textbook-0.0.1.vsix")
)) {
    if (Test-Path $candidate) { $TextbookVsix = $candidate; break }
}

# Refresh PATH in this session so newly-installed tools are visible without reopening the window.
function Update-SessionPath {
    $machine = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
    $user    = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH = "$machine;$user"
}

# Find the VS Code CLI. Checks PATH first, then the default per-user install location.
function Get-CodeCli {
    if (Get-Command "code" -ErrorAction SilentlyContinue) { return "code" }
    $fixed = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"
    if (Test-Path $fixed) { return $fixed }
    return $null
}

# [1/6] winget (Windows Package Manager — built into Windows 10 1709+ and Windows 11)
if (-not (Get-Command "winget" -ErrorAction SilentlyContinue)) {
    Write-Host "[1/6] winget not found. Opening Microsoft Store to install it..."
    Start-Process "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1"
    Write-Host "Install 'App Installer' from the Store window that just opened, then re-run this script."
    Read-Host "Press Enter to exit"
    exit 1
} else {
    Write-Host "[1/6] winget already available."
}

# [2/6] Git (required to connect the textbook to its update source)
if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    Write-Host "[2/6] Installing Git..."
    winget install --id Git.Git --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Git installation may have failed."
        Write-Host "Install it manually from https://git-scm.com/download/win, then re-run."
    }
    Update-SessionPath
} else {
    Write-Host "[2/6] Git already installed."
}

# [3/6] Docker Desktop
$DockerExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path $DockerExe)) {
    Write-Host "[3/6] Installing Docker Desktop..."
    winget install --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Docker Desktop installation may have failed."
        Write-Host "Install it manually from https://www.docker.com/products/docker-desktop, then re-run."
    }
    Update-SessionPath
} else {
    Write-Host "[3/6] Docker Desktop already installed."
}

# [4/6] VS Code
$VsCodeExe = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\Code.exe"
if (-not (Test-Path $VsCodeExe)) {
    Write-Host "[4/6] Installing VS Code..."
    winget install --id Microsoft.VisualStudioCode --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: VS Code installation may have failed."
        Write-Host "Install it manually from https://code.visualstudio.com, then re-run."
    }
    Update-SessionPath
} else {
    Write-Host "[4/6] VS Code already installed."
}

$CodeCli = Get-CodeCli
if (-not $CodeCli) {
    Write-Host ""
    Write-Host "ERROR: VS Code CLI (code) not found."
    Write-Host "Try closing and reopening this window, then run the script again."
    Read-Host "Press Enter to exit"
    exit 1
}

# [5/6] Dev Containers extension
Write-Host "[5/6] Installing Dev Containers extension..."
& $CodeCli --install-extension ms-vscode-remote.remote-containers --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not install the Dev Containers extension automatically."
    Write-Host "Install it later from VS Code: open the Extensions panel and search 'Dev Containers'."
}

# [6/6] Knight Lab Textbook extension (the VSIX bundled with this install script)
if ($TextbookVsix) {
    Write-Host "[6/6] Installing Knight Lab Textbook extension..."
    & $CodeCli --install-extension $TextbookVsix --force
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Could not install the Knight Lab Textbook extension automatically."
        Write-Host "Install it later from VS Code: Extensions panel, '...' menu, Install from VSIX."
    }
} else {
    Write-Host "[6/6] Knight Lab Textbook VSIX not found — skipping."
    Write-Host "Place knightlab-textbook-0.0.1.vsix next to this script and re-run."
}

# Launch Docker Desktop (skip if already running).
Write-Host ""
Write-Host "Launching Docker Desktop..."
Write-Host "(Docker requires WSL 2. If prompted to install it, approve and let Docker Desktop restart.)"
if (-not (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) {
    if (Test-Path $DockerExe) { Start-Process $DockerExe }
}

# Wait for Docker daemon to accept commands.
# First launch takes longer while the user approves WSL 2 and license prompts.
Write-Host ""
Write-Host "Waiting for Docker Desktop to be ready..."
Write-Host "(If Docker shows first-run dialogs, approve them now.)"
$waitSecs = 0
$ready    = $false
while (-not $ready) {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
    } else {
        Start-Sleep -Seconds 2
        $waitSecs += 2
        if ($waitSecs -ge 180) {
            Write-Host "Timed out waiting for Docker after 3 minutes."
            Write-Host "Make sure Docker Desktop is running, then re-run this script."
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
}
Write-Host "Docker is ready."

# Pre-build the course image so the first chapter click is fast.
if (Test-Path $CourseDir) {
    Write-Host ""
    Write-Host "Pre-building the course Docker image (~5 minutes, one-time only)..."
    Push-Location $CourseDir
    docker compose build
    Pop-Location
    Write-Host "Image built and cached."

    # Connect the course folder to the update source (one-time)
    if (-not (Test-Path (Join-Path $CourseDir ".git"))) {
        $ParentGit = git -C $CourseDir rev-parse --show-toplevel 2>$null
        if (-not $ParentGit) {
            Write-Host "Connecting textbook for future updates..."
            git -C $CourseDir init -b main
            git -C $CourseDir remote add origin https://github.com/NUKnightLab/interactive-textbook.git
            git -C $CourseDir fetch origin course-content --depth=1 --quiet
            git -C $CourseDir reset --hard origin/course-content
            Write-Host "Textbook connected."
        }
    }
} else {
    Write-Host ""
    Write-Host "(Course folder not found at $CourseDir — skipping image pre-build.)"
    Write-Host "Place the knightlab-course folder there and re-run to pre-build."
}

# Open VS Code with the course folder.
if (Test-Path $CourseDir) {
    Write-Host ""
    Write-Host "Opening VS Code with the course folder..."
    Write-Host "(VS Code will attach to the dev container — first launch may take ~30 seconds.)"
    & $CodeCli $CourseDir
}

Write-Host ""
Read-Host "Press Enter to close this window"

#!/usr/bin/env bash
# macOS setup
# click this file in finder or run from terminal

# exit if fails
set -euo pipefail

# Resolve the folder this script lives in (the unzipped bundle root).
# This makes the script work regardless of where the student unzipped to.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COURSE_DIR="$SCRIPT_DIR/knightlab-course"

# Find the Knight Lab Textbook VSIX. Two locations supported:
#   1. ./knightlab-textbook-0.0.1.vsix         (distribution zip layout)
#   2. ./knightlab-textbook/...same.vsix       (local dev tree layout)
# First match wins.
TEXTBOOK_VSIX=""
for candidate in \
  "$SCRIPT_DIR/knightlab-textbook-0.0.1.vsix" \
  "$SCRIPT_DIR/knightlab-textbook/knightlab-textbook-0.0.1.vsix"; do
  if [[ -f "$candidate" ]]; then
    TEXTBOOK_VSIX="$candidate"
    break
  fi
done

# install homebrew if missing
if ! command -v brew >/dev/null 2>&1; then
  echo "[1/5] Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Make brew available in this shell session for the steps below
  if [[ -x /opt/homebrew/bin/brew ]]; then
    # apple silicon
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    # intel mac
    eval "$(/usr/local/bin/brew shellenv)"         
  fi
else
  echo "[1/5] Homebrew already installed."
fi

# install docker desktop
if [[ ! -d "/Applications/Docker.app" ]]; then
  echo "[2/5] Installing Docker Desktop..."
  brew install --cask docker
else
  echo "[2/5] Docker Desktop already installed."
fi

# install VSCode
if [[ ! -d "/Applications/Visual Studio Code.app" ]]; then
  echo "[3/5] Installing VS Code..."
  brew install --cask visual-studio-code
else
  echo "[3/5] VS Code already installed."
fi

CODE_CLI="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"

# launch docker desktop (first launch needs user approval -privileged helper install, license accept)
echo "Launching Docker Desktop..."
open -a Docker || true

# wait for docker daemon to accept commands
# first launch can take a minute while the user approves prompts
echo ""
echo "Waiting for Docker Desktop to be ready..."
echo "(If Docker shows first-run dialogs, approve them now.)"
WAIT_SECS=0
until docker info >/dev/null 2>&1; do
  sleep 2
  WAIT_SECS=$((WAIT_SECS + 2))
  if (( WAIT_SECS >= 180 )); then
    echo "Timed out waiting for Docker after 3 minutes."
    echo "Please make sure Docker Desktop is running, then re-run this script."
    exit 1
  fi
done
echo "Docker is ready."

# pre-build the course image so the first chapter click is fast
# this moves ~5 minutes of build time from "first chapter click" to here
if [[ -d "$COURSE_DIR" ]]; then
  echo ""
  echo "Pre-building the course Docker image (~5 minutes, one-time only)..."
  cd "$COURSE_DIR"
  docker compose build
  echo "Image built and cached."

  # Connect the course folder to the update source (one-time)
  if [[ ! -d "$COURSE_DIR/.git" ]]; then
    PARENT_GIT=$(git -C "$COURSE_DIR" rev-parse --show-toplevel 2>/dev/null)
    if [[ -z "$PARENT_GIT" ]]; then
      echo "Connecting textbook for future updates..."
      git -C "$COURSE_DIR" init -b main
      git -C "$COURSE_DIR" remote add origin https://github.com/NUKnightLab/interactive-textbook.git
      git -C "$COURSE_DIR" fetch origin course-content --depth=1 --quiet
      git -C "$COURSE_DIR" reset --hard origin/course-content
      echo "Textbook connected."
    fi
  fi
else
  echo ""
  echo "(Course folder not found at $COURSE_DIR — skipping image pre-build.)"
  echo "Place the knightlab-course folder there and re-run to pre-build."
fi

# dev containers extension (uses VSCode's bundled CLI directly)
echo "[4/5] Installing Dev Containers extension..."
if ! "$CODE_CLI" --install-extension ms-vscode-remote.remote-containers --force; then
  echo "WARNING: Could not install the Dev Containers extension automatically."
  echo "Install it later from VS Code: open the Extensions panel and search 'Dev Containers'."
fi

# Knight Lab Textbook extension (the VSIX bundled with this install script)
if [[ -f "$TEXTBOOK_VSIX" ]]; then
  echo "[5/5] Installing Knight Lab Textbook extension..."
  if ! "$CODE_CLI" --install-extension "$TEXTBOOK_VSIX" --force; then
    echo "WARNING: Could not install the Knight Lab Textbook extension automatically."
    echo "Install it later from VS Code: Extensions panel, '...' menu, Install from VSIX."
  fi
else
  echo "[5/5] Knight Lab Textbook VSIX not found at $TEXTBOOK_VSIX — skipping."
  echo "Place knightlab-textbook-0.0.1.vsix next to this script and re-run."
fi

# Auto-launch VS Code with the course folder. The textbook extension
# auto-opens the textbook and reopens in container; the student arrives
# at the chapter list without further action.
if [[ -d "$COURSE_DIR" ]]; then
  echo ""
  echo "Opening VS Code with the course folder..."
  echo "(VS Code will attach to the dev container — first launch may take ~30 seconds.)"
  "$CODE_CLI" "$COURSE_DIR"
fi

echo ""
read -n 1 -s -r -p "Press any key to close this window..." || true
echo ""



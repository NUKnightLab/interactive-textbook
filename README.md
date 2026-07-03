# Knight Lab Interactive Textbook

An interactive course textbook that runs inside VS Code. 

## Getting started (Mac)

The installer downloads and sets up several tools.
- Homebrew (and Xcode Command Line Tools, if missing)
- Docker Desktop
- VS Code + extensions
- Course environment (Docker image)

Steps:

1. On this page, click the green **Code** button, choose **Download ZIP**, and unzip the downloaded `interactive-textbook-main.zip`.
2. Double-click `install-mac.command`. If macOS blocks it with a warning that it "could not verify" the file, click **Done** (not "Move to Trash").
3. Open **System Settings** and scroll down the left sidebar to find **Privacy & Security**. Inside, scroll down to the Security section and click **Open Anyway** next to the message about `install-mac.command`. Confirm when asked (macOS may ask for your password or Touch ID), and the installer starts.
4. The installer runs on its own for about 10 minutes. Along the way, Docker Desktop, Terminal, and VS Code may each ask for permissions. Approve them when prompted.
5. When it finishes, VS Code opens by itself. Wait until the textbook shows up with five chapter cards.

Click any chapter to begin. The lesson appears on the left, the starter code on the right.

## Getting started (Windows)

The installer downloads and sets up several tools.
- winget (Windows Package Manager, should be built-in for Windows 10/11)
- Git (used to fetch textbook updates)
- Docker Desktop
- VS Code + extensions
- Course environment (Docker image)

Steps:

1. On this page, click the green **Code** button, choose **Download ZIP**, and unzip the downloaded `interactive-textbook-main.zip`.
2. Double-click `install-windows.bat`. If Windows shows a SmartScreen warning ("Windows protected your PC"), click **More info** then **Run anyway**.
3. The installer runs on its own for about 10 minutes. It sets up Docker Desktop, VS Code, and the course. Docker Desktop will ask for a few approvals and may prompt to install WSL 2. Approve these when asked.
4. When it finishes, VS Code opens by itself. Wait for the textbook to show up with five chapter cards.

Click any chapter to begin. The lesson appears on the left, the starter code on the right.

## After the first time

That first install is slow because it builds everything from scratch. Every launch after that takes only 5-10 seconds.
# Knight Lab Interactive Textbook

An interactive course textbook that runs inside VS Code. 

## Getting started (Mac)

The installer downloads and sets up several tools.
- Homebrew (and Xcode Command Line Tools, if missing)
- Docker Desktop
- VS Code + extensions
- Course environment (Docker image)

Steps:

1. Download `knight-lab-launch.zip` and unzip.
2. Right-click `install-mac.command` and choose **Open**. Right-clicking triggers the confirmation
   from macOS to run unsigned scripts.
3. When macOS asks whether you're sure, click **Open** again.
4. The installer runs on its own for about 10 minutes. Along the way, Docker Desktop, Terminal,
   and VS Code may each ask for permissions. Approve them when prompted.
5. When it finishes, VS Code opens by itself. Give it about 20 seconds and the
   textbook shows up with five chapter cards.

Click any chapter to begin. The lesson appears on the left, the starter code on the right.

## Getting started (Windows)

The installer downloads and sets up several tools.
- winget (Windows Package Manager, should be built-in for Windows 10/11)
- Docker Desktop
- VS Code + extensions
- Course environment (Docker image)

Steps:

1. Download `knight-lab-launch.zip` and unzip.
2. Double-click `install-windows.bat`. If Windows shows a SmartScreen warning ("Windows protected
   your PC"), click **More info** then **Run anyway**.
3. The installer runs on its own for about 10 minutes. It sets up Docker Desktop, VS Code, and the
   course. Docker Desktop will ask for a few approvals and may prompt to install WSL 2. Approve
   these when asked.
4. When it finishes, VS Code opens by itself. Wait about 20 seconds for the
   textbook to show up with five chapter cards.

Click any chapter to begin. The lesson appears on the left, the starter code on the right.

## After the first time

That first install is slow because it builds everything from scratch. Every
launch after that takes only 5-10 seconds.
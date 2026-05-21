# Knight Lab Interactive Textbook

An interactive course textbook that runs inside VS Code. 

## Getting started (Mac)

The installer downloads and sets up several tools.
- Homebrew (and Xcode Command Line Tools, if missing)
- Docker Desktop
- VS Code + extensions
- Course environment (Docker image)

Steps:

1. Download `knight-lab-launch.zip` and unzip
2. Right-click `install-mac.command` and choose **Open**. Right-clicking triggers the confirmation 
   from macOS to run unsigned scripts.
3. When macOS asks whether you're sure, click **Open** again.
4. The installer runs on its own for about 10 minutes. It sets up Docker
   Desktop, VS Code, and the course. Partway through, Docker Desktop will ask for a few approvals.
6. When it finishes, VS Code opens by itself. Give it about 20 seconds and the
   textbook shows up with five chapter cards.

Click any chapter to begin. The lesson appears on the left, the starter code on the right.

## After the first time

That first install is slow because it builds everything from scratch. Every
launch after that takes only 5-10 seconds.

## Old files

py-dataviz is an old folder that supported Jupyter Lab for Python. Jupyter Lab is not included in the current setup, which uses VS Code only. 

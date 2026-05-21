# Knight Lab Interactive Textbook

An interactive course textbook that runs inside VS Code. 

## Getting started (Mac)

The installer downloads and sets up several tools.
- Homebrew (and Xcode Command Line Tools, if missing)
- Docker Desktop
- VS Code + extensions
- Course environment (Docker image)

Steps:

1. Download files in this repo (students would get a zipped folder)
2. Right-click `install-mac.command` and choose **Open**. Right-clicking triggers the confirmation 
   from macOS to run unsigned scripts.
3. Approve any pop-ups from macOS. 
4. The installer runs on its own for about 10 minutes. It sets up Docker
   Desktop, VS Code, and the course. Partway through, Docker Desktop may ask for a few approvals.
6. When it finishes, VS Code opens by itself to the table of contents. 

Click any chapter to begin. The lesson appears on the left, the starter code on the right.

## After the first time

That first install is slow, but every launch after should only take 5-10 seconds.

## Old files

py-dataviz is an old folder that supported Jupyter Lab for Python. Jupyter Lab is not included in the current setup.

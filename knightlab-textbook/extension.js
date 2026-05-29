// Knight Lab Textbook Extension

// webview panel with a table of contents
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

let currentPanel = undefined;

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    'knightlab.openTextbook',
    () => openTextbookPanel(context)
  );
  context.subscriptions.push(disposable);

  const updateDisposable = vscode.commands.registerCommand(
    'knightlab.updateTextbook',
    () => runUpdateTextbook(context)
  );
  context.subscriptions.push(updateDisposable);

  if (!workspaceHasDevContainer() && !isInDevContainer()) {
    return;
  }

  suppressWelcomePage();

  if (!isInDevContainer() && isDockerRunning()) {
    vscode.commands.executeCommand('remote-containers.reopenInContainer');
    return;
  }

  openTextbookPanel(context);
  resumePendingChapter(context);
}

async function suppressWelcomePage() {
  if (!vscode.workspace.workspaceFolders?.length) return;
  try {
    await vscode.workspace
      .getConfiguration('workbench')
      .update('startupEditor', 'none', vscode.ConfigurationTarget.Workspace);
  } catch {
  }
}

async function resumePendingChapter(context) {
  const pending = context.globalState.get('pendingChapter');
  if (!pending) return;
  await context.globalState.update('pendingChapter', undefined);
  await showLessonContent(pending.lesson);
  await openLessonFile(pending.file, pending.title);
}

// webview panel (toc)
function openTextbookPanel(context) {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'knightlabTextbook',
    'Knight Lab Textbook',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  currentPanel.webview.html = getTextbookHtml();
  wireWebviewMessages(context);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}

function wireWebviewMessages(context) {
  currentPanel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.command === 'openLesson') {
      await handleChapterClick(context, msg);
    } else if (msg.command === 'backToToc') {
      currentPanel.webview.html = getTextbookHtml();
    } else if (msg.command === 'updateTextbook') {
      await runUpdateTextbook(context);
    }
  });
}

// click handler
async function handleChapterClick(context, msg) {
  // static chapters
  if (!msg.requiresDocker) {
    await showLessonContent(msg.lesson);
    await openLessonFile(msg.file, msg.title);
    return;
  }

  // docker chapter, in container alr
  if (isInDevContainer()) {
    await showLessonContent(msg.lesson);
    await openLessonFile(msg.file, msg.title);
    return;
  }

  // docker chapter, not in container yet
  if (!workspaceHasDevContainer()) {
    vscode.window.showErrorMessage(
      "Open the knightlab-course folder first (File → Open Folder)."
    );
    return;
  }

  // docker not running, show the message in the webview
  if (!isDockerRunning()) {
    currentPanel.webview.html = getDockerNotRunningHtml();
    return;
  }

  // docker is running, we're not in container - save the click and reopen
  await context.globalState.update('pendingChapter', {
    file: msg.file,
    title: msg.title,
    lesson: msg.lesson,
  });
  await vscode.commands.executeCommand('remote-containers.reopenInContainer');
}

// render textbook file
async function showLessonContent(lessonRelativePath) {
  try {
    const uri = vscode.Uri.joinPath(getCourseRootUri(), lessonRelativePath);
    const bytes = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(bytes).toString('utf-8');
    currentPanel.webview.html = getLessonHtml(content);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Could not load lesson content: ${err.message}`
    );
  }
}

// open starter file in right panel
async function openLessonFile(relativePath, title) {
  const uri = vscode.Uri.joinPath(getCourseRootUri(), relativePath);
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
  } catch (err) {
    vscode.window.showErrorMessage(
      `Could not open ${title}: ${err.message}`
    );
  }
}

// check environment
function isInDevContainer() {
  return vscode.env.remoteName === 'dev-container';
}

function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

function workspaceHasDevContainer() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return false;
  const devcontainerPath = path.join(
    folders[0].uri.fsPath,
    '.devcontainer',
    'devcontainer.json'
  );
  return fs.existsSync(devcontainerPath);
}

// path resolution
function getCourseRootUri() {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri;
  }
  throw new Error('Knight Lab Textbook: no workspace folder open. Open the knightlab-course folder.');
}

// get the host path of the chapters/ bind mount from Docker to run git commands there
function resolveHostPathFromDocker() {
  try {
    const info = execSync(
      'docker inspect knightlab-course --format "{{json .Mounts}}"',
      { encoding: 'utf-8', shell: true }
    );
    const mounts = JSON.parse(info.trim());
    for (const m of mounts) {
      if (m.Destination === '/home/student/chapters') {
        return path.dirname(m.Source); // parent of chapters/ is the course root
      }
    }
  } catch {}
  return null;
}

async function runUpdateTextbook(context) {
  // get the host root
  const courseRoot = isInDevContainer()
    ? resolveHostPathFromDocker()
    : (() => { try { return getCourseRootUri().fsPath; } catch { return null; } })();

  if (!courseRoot) {
    vscode.window.showErrorMessage('Open the knightlab-course folder first.');
    return;
  }

  const git = (cmd) =>
    execSync(cmd, { cwd: courseRoot, encoding: 'utf-8', shell: true }).trim();

  // verify this is a git repo with a remote
  try {
    git('git rev-parse --git-dir');
    git('git remote get-url origin');
  } catch {
    vscode.window.showErrorMessage(
      'Textbook is not connected to an update source. Contact your instructor.'
    );
    return;
  }

  // fetch latest from remote
  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Checking for textbook updates…' },
      async () => { git('git fetch origin'); }
    );
  } catch (err) {
    vscode.window.showErrorMessage(`Could not reach update server: ${err.message}`);
    return;
  }

  // files in chapters/ that differ between local HEAD and origin/course-content
  let changed;
  try {
    changed = git('git diff --name-only HEAD origin/course-content -- chapters/')
      .split('\n').filter(Boolean);
  } catch (err) {
    vscode.window.showErrorMessage(`Update failed: ${err.message}`);
    return;
  }

  if (changed.length === 0) {
    vscode.window.showInformationMessage('Your textbook is already up to date.');
    return;
  }

  const updated = [];
  const saved = [];

  for (const relPath of changed) {
    const absPath = path.join(courseRoot, relPath);
    const basename = path.basename(relPath);

    let remoteContent;
    try {
      remoteContent = git(`git show "origin/course-content:${relPath}"`);
    } catch {
      continue; // file deleted on remote — skip
    }

    if (basename === 'lesson.html') {
      // lesson files are always overwritten bc students don't edit them
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, remoteContent, 'utf-8');
      git(`git add "${relPath}"`);
      const chapterDir = path.basename(path.dirname(relPath));
      updated.push(`lesson (${chapterDir})`);
    } else {
      // check for student modifications in starter code
      let localDiff = '';
      try { localDiff = git(`git diff HEAD -- "${relPath}"`); } catch {}

      if (!localDiff) {
        // safe to overwrite (no local changes)
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, remoteContent, 'utf-8');
        git(`git add "${relPath}"`);
        updated.push(basename);
      } else {
        // student modified this file, save remote as vN, leave original alone
        const savedPath = findVersionedPath(absPath);
        fs.writeFileSync(savedPath, remoteContent, 'utf-8');
        saved.push(path.basename(savedPath));

        // advance HEAD for this file to remote so next update skips it
        const sha = git(`git show "origin/course-content:${relPath}" | git hash-object -w --stdin`);
        git(`git update-index --cacheinfo 100644,${sha},"${relPath}"`);
      }
    }
  }

  // commit staged changes to local .git
  try {
    git('git -c user.name="Knight Lab" -c user.email="textbook@knightlab.com" commit -m "textbook update"');
  } catch {}

  // messages after pushing the update button
  const parts = [];
  if (updated.length > 0) parts.push(`Updated: ${updated.join(', ')}`);
  if (saved.length > 0) parts.push(`Your edits were preserved. New version saved as: ${saved.join(', ')}`);
  vscode.window.showInformationMessage(
    parts.length ? parts.join('. ') : 'Textbook updated.'
  );
}

function findVersionedPath(absPath) {
  const ext = path.extname(absPath);
  const base = absPath.slice(0, -ext.length);
  let n = 2;
  let candidate;
  do {
    candidate = `${base}_v${n}${ext}`;
    n++;
  } while (fs.existsSync(candidate));
  return candidate;
}

// shared CSS for all webview pages
function mainStyle() {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0 auto;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    h1 { color: #fbfbfb; }
    .back {
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      text-decoration: underline;
    }
  `;
}

// webview HTML styles
function getTextbookHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    ${mainStyle()}
    body {
      max-width: 720px;
      padding: 3rem 2rem;
    }
    h1 { margin-bottom: 0.25rem; }
    .subtitle {
      color: var(--vscode-descriptionForeground);
      margin-top: 0;
      margin-bottom: 2rem;
    }
    ul { list-style: none; padding: 0; }
    li {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 1rem 1.25rem;
      margin: 0.75rem 0;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    li:hover { background: var(--vscode-list-hoverBackground); }
    .chapter-title { font-weight: 600; font-size: 1.05rem; }
    .lang-tag {
      display: inline-block;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 0.1rem 0.5rem;
      border-radius: 3px;
      font-size: 0.75rem;
      margin-left: 0.5rem;
      vertical-align: middle;
    }
    .header-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }
    .update-btn {
      background: none;
      border: 1px solid var(--vscode-button-secondaryBackground, #555);
      color: var(--vscode-descriptionForeground);
      border-radius: 4px;
      padding: 0.25rem 0.75rem;
      font-size: 0.8rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .update-btn:hover {
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-foreground);
    }
  </style>
</head>
<body>
  <div class="header-row">
    <h1>Knight Lab Interactive Textbook</h1>
    <button class="update-btn" id="update-btn">Update Textbook</button>
  </div>

  <ul id="toc">
    <li data-title="Chapter 1"
        data-file="chapters/01-intro/hello.py"
        data-lesson="chapters/01-intro/lesson.html"
        data-requires-docker="true">
      <span class="chapter-title">Chapter 1</span>
      <span class="lang-tag">Python</span>
    </li>
    <li data-title="Chapter 2"
        data-file="chapters/02-data/load.py"
        data-lesson="chapters/02-data/lesson.html"
        data-requires-docker="true">
      <span class="chapter-title">Chapter 2</span>
      <span class="lang-tag">Python</span>
    </li>
    <li data-title="Chapter 3"
        data-file="chapters/03-charts/plot.py"
        data-lesson="chapters/03-charts/lesson.html"
        data-requires-docker="true">
      <span class="chapter-title">Chapter 3</span>
      <span class="lang-tag">Python</span>
    </li>
    <li data-title="Chapter 4"
        data-file="chapters/04-r-stats/analyze.R"
        data-lesson="chapters/04-r-stats/lesson.html"
        data-requires-docker="true">
      <span class="chapter-title">Chapter 4</span>
      <span class="lang-tag">R</span>
    </li>
    <li data-title="Chapter 5"
        data-file="chapters/05-node-data/analyze.js"
        data-lesson="chapters/05-node-data/lesson.html"
        data-requires-docker="true">
      <span class="chapter-title">Chapter 5</span>
      <span class="lang-tag">Node</span>
    </li>
  </ul>

  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('#toc li').forEach((li) => {
      li.addEventListener('click', () => {
        vscode.postMessage({
          command: 'openLesson',
          title: li.dataset.title,
          file: li.dataset.file,
          lesson: li.dataset.lesson,
          requiresDocker: li.dataset.requiresDocker === 'true',
        });
      });
    });
    document.getElementById('update-btn').addEventListener('click', () => {
      vscode.postMessage({ command: 'updateTextbook' });
    });
  </script>
</body>
</html>`;
}

// chapter content inside textbook + back button
function getLessonHtml(lessonContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    ${mainStyle()}
    body {
      max-width: 720px;
      padding: 2rem 2rem 4rem;
      line-height: 1.55;
    }
    .back {
      display: inline-block;
      margin-bottom: 1.5rem;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .back:hover { text-decoration: underline; }
    .lesson h1 { margin-top: 0; }
    .lesson h2 {
      margin-top: 1.75rem;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }
    .lesson code {
      background: var(--vscode-textCodeBlock-background);
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 0.9em;
    }
    .lesson pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 1rem;
      border-radius: 5px;
      overflow-x: auto;
    }
    .lesson pre code {
      background: none;
      padding: 0;
    }
    .lesson ol, .lesson ul { padding-left: 1.4rem; }
    .lesson li { margin: 0.35rem 0; }
  </style>
</head>
<body>
  <a class="back" id="back">← Back to chapters</a>
  <div class="lesson">
    ${lessonContent}
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('back').addEventListener('click', () => {
      vscode.postMessage({ command: 'backToToc' });
    });
  </script>
</body>
</html>`;
}

// docker not running
function getDockerNotRunningHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    ${mainStyle()}
    .back {
      display: inline-block;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <h1>Docker Required</h1>
  <p>This chapter requires Docker Desktop. Please start Docker Desktop
     from your applications folder, then reopen the chapter.</p>
  <a class="back" id="back">← Back to chapters</a>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('back').addEventListener('click', () => {
      vscode.postMessage({ command: 'backToToc' });
    });
  </script>
</body>
</html>`;
}

function deactivate() {}

module.exports = { activate, deactivate };

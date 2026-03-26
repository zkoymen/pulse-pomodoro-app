const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let db;
let isMiniMode = false;
let previousBounds = null;

function getMainWindow() {
  return BrowserWindow.getAllWindows()[0] || null;
}

function broadcastMiniMode(win, value) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('window:mini-mode-changed', value);
}

function enterMiniMode(win) {
  if (!win || win.isDestroyed() || isMiniMode) return;

  previousBounds = win.getBounds();
  const workArea = screen.getPrimaryDisplay().workArea;
  const miniWidth = 275;
  const miniHeight = 170;

  win.setAlwaysOnTop(true, 'floating');
  win.setResizable(false);
  win.setBounds({
    x: workArea.x + workArea.width - miniWidth - 12,
    y: workArea.y + 12,
    width: miniWidth,
    height: miniHeight,
  });

  isMiniMode = true;
  broadcastMiniMode(win, true);
}

function exitMiniMode(win) {
  if (!win || win.isDestroyed() || !isMiniMode) return;

  win.setAlwaysOnTop(false);
  win.setResizable(true);

  if (previousBounds) {
    win.setBounds(previousBounds);
  }

  isMiniMode = false;
  broadcastMiniMode(win, false);
}

function toggleMiniMode(win) {
  if (isMiniMode) {
    exitMiniMode(win);
  } else {
    enterMiniMode(win);
  }

  return isMiniMode;
}

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'pomodoro_history.db');
  db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        focus_minutes INTEGER NOT NULL,
        break_minutes INTEGER NOT NULL,
        session_type TEXT NOT NULL DEFAULT 'focus',
        note TEXT DEFAULT ''
      )
    `);

    db.all('PRAGMA table_info(sessions)', [], (err, columns) => {
      if (err || !columns) return;
      const hasSessionType = columns.some((col) => col.name === 'session_type');
      if (!hasSessionType) {
        db.run("ALTER TABLE sessions ADD COLUMN session_type TEXT NOT NULL DEFAULT 'focus'");
      }
    });
  });
}


// ekran büyüklüğü burası bi bak
function createWindow() {
  const win = new BrowserWindow({
    width: 740,
    height: 820,
    minWidth: 400,
    minHeight: 500,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Minimize should preserve the current mode exactly.
  win.on('restore', () => {
    if (isMiniMode) {
      win.setAlwaysOnTop(true, 'floating');
      win.setResizable(false);
    } else {
      win.setAlwaysOnTop(false);
      win.setResizable(true);
    }
  });
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      return;
    }

    const win = getMainWindow();
    if (win) {
      win.show();
      win.focus();
    }
  });
});

ipcMain.handle('window:toggleMiniMode', async () => {
  const win = BrowserWindow.getFocusedWindow() || getMainWindow();
  if (!win) return { isMiniMode };
  return { isMiniMode: toggleMiniMode(win) };
});

ipcMain.handle('window:getMiniMode', async () => ({ isMiniMode }));

ipcMain.handle('history:addSession', async (_, payload) => {
  const { focusMinutes, breakMinutes, note, sessionType } = payload;
  const now = new Date().toISOString();

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO sessions (created_at, focus_minutes, break_minutes, session_type, note) VALUES (?, ?, ?, ?, ?)',
      [now, focusMinutes, breakMinutes, sessionType || 'focus', (note || '').trim()],
      function onInsert(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
});

ipcMain.handle('history:getSessions', async () => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, created_at, focus_minutes, break_minutes, session_type, note FROM sessions ORDER BY id DESC',
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
});

ipcMain.handle('history:deleteSession', async (_, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM sessions WHERE id = ?', [id], function onDelete(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});

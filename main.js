const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let db;

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

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 820,
    minHeight: 560,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

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

# Pulse Pomodoro

A simple and compact desktop Pomodoro app.

## Features
- Adjustable focus and break durations (+/- buttons and direct number input)
- Start, pause, and reset controls
- Session saved to history when a focus cycle is completed
- Persistent local history with SQLite
- History tab to view previous sessions

## Tech Stack
- Electron
- SQLite (sqlite3)
- Vanilla HTML/CSS/JS

## Run Locally
```bash
npm install
npm start
```

## Build EXE (Windows)
```bash
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run dist
```

Output file:
- dist/Pulse Pomodoro-1.0.0-x64.exe

## Note
Session history is stored in the app data folder. Updates keep your history as long as the appId stays the same.

# Pulse Pomodoro

Basit, kompakt ve masaustu bir Pomodoro uygulamasi.

## Ozellikler
- Focus ve mola suresi ayarlama (+/- ve sayi girisi)
- Baslat, duraklat, sifirla
- Focus bitince seans gecmise kaydedilir
- Kalici gecmis (SQLite)
- History sekmesi ile onceki seanslari goruntuleme

## Teknoloji
- Electron
- SQLite (sqlite3)
- Vanilla HTML/CSS/JS

## Calistirma
```bash
npm install
npm start
```

## EXE Uretme (Windows)
```bash
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run dist
```

Cikti dosyasi:
- dist/Pulse Pomodoro-1.0.0-x64.exe

## Not
Seans gecmisi uygulama verisi klasorunde tutulur. Uygulama guncellense de gecmis korunur (appId degismedigi surece).


# @enderdba/wwebjs-electron

[![npm](https://img.shields.io/npm/v/@enderdba/wwebjs-electron)](https://www.npmjs.com/package/@enderdba/wwebjs-electron)
[![GitHub](https://img.shields.io/github/stars/enderdba/wwebjs-electron?style=social)](https://github.com/enderdba/wwebjs-electron)

> 🧠 This is a fork of [`wwebjs-electron`](https://github.com/AndyTargino/wwebjs-electron) adapted for deep integration inside Electron using `puppeteer-core` and `BrowserView`, without [`puppeteer-in-electron`](https://github.com/TrevorSundberg/puppeteer-in-electron), it uses the exact same code for `puppeteer-in-electron` only with new dependencies.

## ✅ Features

- 🧩 100% compatible with [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- 🧠 No need for external Puppeteer installation: works with Electron’s built-in Chromium
- 🔐 Session management via persistent partition (`BrowserView`)
- 📦 Minimal dependencies, clean API

---

## 🚀 Installation

```bash
npm install @enderdba/wwebjs-electron puppeteer-core
```

> **Note:** You must be using Electron ≥ v17 and `puppeteer-core` (not full `puppeteer`) There's no need for it since it uses internal Electron built-in Chromium.

---

## 🧪 Example (Electron main process)

```ts
// main.ts
import { app, BrowserWindow, BrowserView } from 'electron';
import puppeteer from 'puppeteer-core';
import { Client, ElectronPuppeteer } from '@enderdba/wwebjs-electron';

let win: BrowserWindow;
let client: Client;

app.whenReady().then(async () => {
  await ElectronPuppeteer.initialize(app); // ⬅️ MUST be before app.isReady()
  await app.whenReady();

  const browser = await ElectronPuppeteer.connect(app, puppeteer);

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      partition: 'persist:whatsapp_xxxx',
    },
  });

  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      partition: 'persist:whatsapp_xxxx',
    },
  });

  win.setBrowserView(view);
  view.setBounds({ x: 0, y: 0, width: 1200, height: 800 });
  await view.webContents.loadURL('https://web.whatsapp.com');

  client = new Client(browser, view, {
    webVersionCache: { type: 'none' }
  });

  client.on('ready', () => console.log('✅ Client is ready!'));
  client.on('message', msg => {
    if (msg.body === '!ping') msg.reply('pong');
  });

  await client.initialize();
});
```

---

## 📌 Session Management

You **do not** need to use authentication strategies. Electron handles session storage via `partition`:

```ts
partition: 'persist:whatsapp-session_123'
```

Just assign a different partition per session and you're done.
You can save partitions in a JSON, SQLite, anywhere, just make sure you persist it somewhere.

---

## 💡 Advanced

- You can extract `ClientInfo`, `Chat`, `Contact`, `Message` and other classes directly from `@enderdba/wwebjs-electron`, just like in WWEBJS!.
- All [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) features are supported, including stickers, polls, buttons, and media.

---

## 📦 About this fork

This is a custom fork of [`wwebjs-electron`](https://github.com/AndyTargino/wwebjs-electron), with some tweaks for:

- Eliminate `puppeteer-in-electron`
- Improve support for `BrowserView` in multi-session contexts
- Work reliably with `puppeteer-core` and Electron's remote-debugging port
- Integrate better with TypeScript + Vite

Maintained by [@enderdba](https://github.com/enderdba)

---

## 📄 License

Apache-2.0. See [LICENSE](./LICENSE)

> WhatsApp is a trademark of WhatsApp Inc., and this project is not affiliated with them in any way.

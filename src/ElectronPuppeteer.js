'use strict';

const getPort = require('get-port');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

let DEBUG_PORT = 0;

class ElectronPuppeteer {
    /**
     * Returns the remote debugging port used by the connected browser instance.
     * This value is only available after calling `initialize(app)`.
     */
    static get debugPort() {
        return DEBUG_PORT;
    }

    /**
     * Configures the remote debugging port for the connected browser instance.
     * Must be called before the app is ready.
     * @param {Electron.App} app
     * @param {number} [port=0]
     */
    static async initialize(app, port = 0) {
        if (!app) throw new Error('Invalid app instance.');
        if (app.isReady()) throw new Error('Must be called before app.whenReady');

        const existingPort = app.commandLine.getSwitchValue('remote-debugging-port');
        if (existingPort) {
            console.warn('Remote debugging port already set. Using it.');
            DEBUG_PORT = parseInt(existingPort);
            return;
        }

        const actualPort = port === 0 ? await getPort({ host: '127.0.0.1' }) : port;
        DEBUG_PORT = actualPort;

        app.commandLine.appendSwitch('remote-debugging-port', `${actualPort}`);
        app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
        console.log(`Remote debugging port set to: ${DEBUG_PORT}`);
    }

    /**
     * @private
     * @param {number} port
     * @returns {Promise<Object>}
     */
    static async _readJson(port) {
        return new Promise((resolve, reject) => {
            let data = '';
            http.get(`http://127.0.0.1:${port}/json/version`, res => {
                res.on('data', chunk => data += chunk.toString());
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Error parsing JSON: ${e.message}. Received: ${data}`));
                    }
                });
                res.on('error', reject);
            }).on('error', err => {
                reject(new Error(`HTTP request error on /json/version: ${err.message}`));
            });
        });
    }

    /**
     * Connects to the browser instance launched by Electron.
     * @param {Electron.App} app
     * @param {Puppeteer} puppeteerInstance
     * @returns {Promise<Puppeteer.Browser>}
     */
    static async connect(app, puppeteerInstance) {
        const portValue = app.commandLine.getSwitchValue('remote-debugging-port');
        const port = DEBUG_PORT || (portValue ? parseInt(portValue) : 0);

        if (!port || isNaN(port)) {
            throw new Error('Remote debugging port not configured or invalid.');
        }

        const json = await this._readJson(port);
        if (!json.webSocketDebuggerUrl) {
            throw new Error('Missing webSocketDebuggerUrl from JSON endpoint.');
        }

        return await puppeteerInstance.connect({
            browserWSEndpoint: json.webSocketDebuggerUrl,
            defaultViewport: null
        });
    }

    /**
     * Retrieves Puppeteer Page instance for a BrowserWindow or BrowserView.
     * @param {Puppeteer.Browser} browser
     * @param {Electron.BrowserWindow|Electron.BrowserView} window
     * @returns {Promise<Puppeteer.Page>}
     */
    static async getPage(browser, window) {
        const guid = uuidv4();
        try {
            await window.webContents.executeJavaScript(`window.__PUPPETEER_GUID = "${guid}"`);
            const pages = await browser.pages();
            const guids = await Promise.all(pages.map(p => p.evaluate(() => window.__PUPPETEER_GUID).catch(() => null)));
            const index = guids.findIndex(g => g === guid);
            await window.webContents.executeJavaScript(`delete window.__PUPPETEER_GUID`);
            if (index === -1) throw new Error('Page not found for the given window/view.');
            return pages[index];
        } catch (error) {
            try {
                await window.webContents.executeJavaScript(`delete window.__PUPPETEER_GUID`);
            } catch (cleanupError) {
                console.warn('Cleanup error:', cleanupError);
            }
            throw error;
        }
    }
}

module.exports = ElectronPuppeteer;

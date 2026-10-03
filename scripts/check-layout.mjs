// Layout regression check: no page may ever scroll horizontally.
//
//   npm run test:layout            (uses Chrome/Chromium; set CHROME=/path/to/chrome if it isn't found)
//
// Serves the site, drives headless Chrome over the DevTools protocol, and at each width loads every page,
// runs a deliberately wide query, and submits a solution (so the results table and the pro's line render).
// Fails if the document is ever wider than the viewport. No dependencies: Node 22+ has fetch and WebSocket.

import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;
const WIDTHS = [1440, 1280, 1024, 860, 768, 390, 320];
const WIDE_QUERY = 'SELECT * FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id';
const PAGES = ['index.html', 'range.html', 'tournament.html?t=sql-basics', 'tournament.html?t=sql-joins', 'tournament.html?t=sql-windows', 'tournament.html?t=pandas',
  'hole.html?t=sql-basics&h=10', 'hole.html?t=sql-windows&h=15'];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '') || 'index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const chromePath = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => p && existsSync(p));
if (!chromePath) {
  console.error('Chrome not found. Set CHROME=/path/to/chrome.');
  process.exit(2);
}
const profile = await mkdtemp(join(tmpdir(), 'puttedex-layout-'));
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) resolve(m[1]);
  });
  chrome.on('exit', () => reject(new Error('Chrome exited early')));
});

const browser = new WebSocket(wsUrl);
await new Promise((r) => browser.addEventListener('open', r));
let id = 0;
const pending = new Map();
browser.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}, sessionId) => new Promise((resolve) => {
  const i = ++id;
  pending.set(i, resolve);
  browser.send(JSON.stringify({ id: i, method, params, sessionId }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
const page = (method, params) => send(method, params, sessionId);
const evaluate = async (expression) => (await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.result.value;
await page('Page.enable');

const failures = [];
const measure = async (label) => {
  const { doc, vw } = await evaluate('({ doc: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth })');
  if (doc > vw) failures.push(`${label}: document is ${doc}px wide in a ${vw}px viewport`);
};

for (const width of WIDTHS) {
  await page('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  for (const path of PAGES) {
    await page('Page.navigate', { url: base + path });
    await sleep(1200);
    await measure(`${width}px ${path}`);
    if (path.startsWith('hole.html')) {
      await evaluate(`(() => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.setValue(${JSON.stringify(WIDE_QUERY)}); document.querySelector('#run-btn').click(); })()`);
      await sleep(150);
      await measure(`${width}px ${path} after running a wide query`);
      await evaluate(`import('./js/data/holes/sql-basics.js').then((m) => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.setValue(m.default[9].solution); document.querySelector('#submit-btn').click(); document.querySelector('.feedback details').open = true; })`);
      await sleep(150);
      await measure(`${width}px ${path} after solving (pro's line open)`);
      await evaluate('localStorage.clear()');
    }
  }
}

browser.close();
await new Promise((r) => { chrome.once('exit', r); chrome.kill(); });
server.close();
await rm(profile, { recursive: true, force: true }).catch(() => {});

if (failures.length) {
  console.error(`Horizontal overflow found:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`No horizontal overflow: ${PAGES.length} pages x ${WIDTHS.length} widths.`);

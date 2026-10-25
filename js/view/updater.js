// Keeps a running game in step with the deployed one: polls version.json, and when a newer build exists saves and reloads from the network.
import { VERSION, BUILD, BUILT } from '../version.js';

const KEY = 'tm-update-attempts';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WARM_MS = 4000;
let pending = false;

export const versionLabel = () => `v${VERSION} · ${BUILD.slice(0, 7)}`;
export const builtLabel = () => (BUILT ? BUILT.replace('T', ' ').replace(/:\d\dZ$/, ' UTC') : 'unknown');

async function fetchLatest() {
  const r = await fetch('version.json', { cache: 'no-store' });
  if (!r.ok) throw new Error(`version.json: ${r.status}`);
  return r.json();
}

const attempts = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
const noteAttempt = build => { try { const a = attempts(); a[build] = (a[build] || 0) + 1; sessionStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { /* storage blocked: the guard just stays off */ } };

/**
 * Forget the service worker and every cache, warm the browser's HTTP cache with fresh copies of the code and data, then reload.
 * The old worker goes first so the warm-up goes straight to the network instead of through it. Only code and data are warmed (the
 * pictures are asked for with the build id in their address, so they are always fresh), and the wait is capped: on a slow
 * connection the reload still happens within a few seconds. Saves live in IndexedDB and are untouched.
 */
async function hardReload(files) {
  const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), sleep(ms)]);       // no step may hold the reload up
  await within((async () => { const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []; await Promise.all(regs.map(r => r.unregister())); })(), 1500);
  await within((async () => { if (window.caches) await Promise.all((await caches.keys()).map(k => caches.delete(k))); })(), 1500);
  const core = files.filter(f => !f.startsWith('art/') && !f.startsWith('icons/'));
  await within(Promise.all(core.map(f => fetch(f, { cache: 'reload' }).catch(() => null))), WARM_MS);
  location.reload();
}

/**
 * Compare this build with the deployed one. Returns 'current', 'updating' or 'offline'.
 * Automatic checks wait for a quiet moment (no panel open, nothing being dragged); a manual check updates at once.
 */
export async function checkForUpdate(app, manual = false) {
  if (pending) return 'updating';
  let latest;
  try { latest = await fetchLatest(); } catch (e) { return 'offline'; }
  navigator.serviceWorker?.getRegistration?.().then(r => r && r.update()).catch(() => {});
  if (!latest.build || latest.build === BUILD) return 'current';
  if (!manual && (attempts()[latest.build] || 0) >= 2) return 'current'; // reloaded twice and still behind: stop looping, the player can use Settings
  pending = true;
  const go = async () => {
    const quiet = manual || (!app.modalOpen() && !app.renderer.drag && performance.now() - app.lastActivity > 2500);
    if (!quiet) { setTimeout(go, 2000); return; }
    app.toast(`Updating to v${latest.version}…`, 'gold', 1800);
    app.save(true); noteAttempt(latest.build);
    await sleep(900);
    await hardReload(latest.files || []);
  };
  go();
  return 'updating';
}

/** Check shortly after start, every few minutes, and whenever the player comes back to the tab. */
export function startUpdateWatcher(app) {
  const run = () => { if (!document.hidden) checkForUpdate(app).catch(() => {}); };
  setTimeout(run, 4000);
  setInterval(run, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', run);
}

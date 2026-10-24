// Bootstrap: load config data, restore the save, start the app, register the offline service worker.
import { Game, loadData } from './core/index.js';
import { SaveStore } from './core/save.js';
import { App } from './view/app.js';
import { DevTweaks } from './core/devtools.js';
import { startUpdateWatcher } from './view/updater.js';
import { loadNewArt } from './view/new-art.js';

const msg = t => { const el = document.getElementById('splash-msg'); if (el) el.textContent = t; };
const reader = async path => { const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); };

function showFatal(err, store) {
  console.error(err);
  const card = document.querySelector('#splash .splash-card'); if (!card) return;
  card.innerHTML = '';
  const p = document.createElement('p'); p.textContent = 'Something went wrong while loading the island.'; card.append(p);
  const small = document.createElement('p'); small.style.fontSize = '0.8rem'; small.textContent = String(err && err.message || err); card.append(small);
  const b1 = document.createElement('button'); b1.className = 'btn'; b1.textContent = 'Try again'; b1.onclick = () => location.reload(); card.append(b1);
  if (store) { const b2 = document.createElement('button'); b2.className = 'btn ghost'; b2.style.marginLeft = '8px'; b2.textContent = 'Start a new island'; b2.onclick = async () => { if (confirm('This erases the saved island on this device. Continue?')) { await store.clear(); location.reload(); } }; card.append(b2); }
}

async function boot() {
  const store = new SaveStore();
  try {
    msg('Loading the island…');
    const data = await loadData(reader);
    await loadNewArt();                              // painted art; a file that fails to load just keeps its vector version
    const dev = new DevTweaks(data).applySaved();   // developer-mode tweaks (empty unless dev mode was used on this device)
    msg('Finding your save…');
    const doc = await store.load();
    let game = null, fresh = false;
    if (doc && doc.state) {
      try { game = Game.fromSave(data, doc); } catch (e) { console.error('save failed to load', e); showFatal(new Error('Your saved island could not be opened. It has not been erased.'), store); return; }
    }
    if (!game) { game = Game.create(data); fresh = true; }
    msg('Painting the palm trees…');
    const app = new App(data, store);
    app.dev = dev;
    window.__tm = { app, game };
    app.attach(game, { fresh });
    if (fresh) app.save(true);
    const splash = document.getElementById('splash');
    requestAnimationFrame(() => { splash.classList.add('gone'); setTimeout(() => splash.remove(), 600); });
    registerWorker();
    startUpdateWatcher(app);
  } catch (err) { showFatal(err, store); }
}

function registerWorker() {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;
  // updateViaCache 'none': the browser never reuses an HTTP-cached copy of sw.js when checking for a new one
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(e => console.warn('service worker failed', e));
}

boot();

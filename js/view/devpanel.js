// Developer mode: password prompt and the tuning panel. Changes are stored on this device only (see core/devtools.js).
import { h } from './ui.js';
import { DevTweaks, checkPassword } from '../core/devtools.js';

const FIRST = ['magnet', 'drops', 'shop', 'energy', 'refill', 'storage', 'merge', 'shimmer'];   // the groups people reach for most

function tweaks(panels) {
  const app = panels.app;
  if (!app.dev) app.dev = new DevTweaks(panels.d).applySaved();
  return app.dev;
}

/** Ask for the password every time, then open the panel. The check ignores case. */
export function askDevPassword(panels) {
  const input = h('input', { type: 'password', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Password', 'aria-label': 'Developer password', style: { width: '100%', padding: '10px', fontSize: '1rem', borderRadius: '10px', border: '2px solid #cdbf98', boxSizing: 'border-box', textAlign: 'center' } });
  const msg = h('p', { class: 'sub center', style: { minHeight: '1.2em', color: 'var(--bad)', fontWeight: 700 } }, '');
  panels.ui.modal({
    title: 'Developer mode', cls: 'small',
    render: () => h('div', null, h('p', { class: 'sub center' }, 'Enter the password to tune the game.'), input, msg),
    footerRender: m => {
      const go = () => {
        if (checkPassword(input.value)) { m.close(); openDevPanel(panels); return; }
        msg.textContent = 'Wrong password.'; input.value = ''; input.focus();
        panels.app.audio.sfx('invalid');
      };
      input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
      return [h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Cancel'), h('button', { class: 'btn good', onclick: go }, 'Unlock')];
    }
  });
  setTimeout(() => input.focus(), 60);
}

export function openDevPanel(panels) {
  const dev = tweaks(panels), g = panels.g, app = panels.app, d = panels.d;
  const rows = [];           // { el, text } for the search filter
  const sections = [];       // { el, rows: [] }
  const countEl = h('span', { class: 'sub' }, '');
  const updateCount = () => { const n = dev.count(); countEl.textContent = n ? `${n} changed value${n === 1 ? '' : 's'} (saved on this device)` : 'Nothing changed: the game uses its shipped numbers.'; };

  // one editable number: label, input, reset button
  function numRow(path, label, { auto = null, step = 'any', group = null } = {}) {
    const input = h('input', { type: 'number', inputmode: 'decimal', min: '0', step, 'aria-label': label, style: { width: '7.5rem', padding: '5px 6px', borderRadius: '8px', border: '2px solid #cdbf98', textAlign: 'right', font: 'inherit' } });
    const undo = h('button', { class: 'btn ghost small', 'aria-label': `Reset ${label}`, title: 'Put the shipped value back', style: { padding: '2px 8px', minWidth: 0 } }, '↺');
    const row = h('div', { class: 'row', style: { justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' } }, h('span', { style: { flex: 1, fontWeight: 600, fontSize: '0.9em' } }, label), input, undo);
    const show = () => {
      const def = dev.def(path), changed = dev.changed(path), v = changed ? dev.get(path) : def;
      input.value = v == null ? '' : String(v);
      if (auto) input.placeholder = auto();
      else input.placeholder = def == null ? '' : String(def);
      input.style.background = changed ? '#fff3b8' : '#fff';
      undo.style.visibility = changed ? 'visible' : 'hidden';
      row.title = def != null ? `Shipped value: ${def}` : (auto ? `Automatic: ${auto()}` : '');
      updateCount();
    };
    const commit = () => {
      const raw = input.value.trim();
      if (raw === '') dev.reset(path);
      else { const v = dev.set(path, raw); if (v === undefined) return show(); }
      if (raw !== '' && dev.clean(path, raw) === null) app.toast('Use a number that is 0 or more.', 'bad');
      show(); afterChange(path);
    };
    input.addEventListener('change', commit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
    undo.onclick = () => { dev.reset(path); show(); afterChange(path); };
    row._show = show; show();
    const entry = { el: row, text: (label + ' ' + path + ' ' + (group || '')).toLowerCase() };
    rows.push(entry);
    return entry;
  }
  // anything that is cached in the open game gets refreshed here
  function afterChange(path) {
    if (path.startsWith('eco:energy')) g.syncEnergy?.();
    app.dirty = true; app.hudDirty = true; app.ui.refresh(true);
  }

  function section(title, entries, { open = false, note = null } = {}) {
    const det = h('details', { style: { margin: '8px 0', border: '2px solid #eadfc0', borderRadius: '12px', background: 'rgba(255,255,255,0.5)' } });
    if (open) det.open = true;
    const sum = h('summary', { style: { cursor: 'pointer', fontWeight: 800, padding: '8px 10px' } }, title, h('span', { class: 'sub', style: { fontWeight: 600 } }, `  (${entries.length})`));
    const body = h('div', { style: { padding: '0 10px 8px' } }, note ? h('p', { class: 'sub', style: { fontSize: '0.8em' } }, note) : null, entries.map(e => e.el));
    det.append(sum, body);
    const sec = { el: det, entries, wasOpen: open };
    sections.push(sec);
    return det;
  }

  // ---------------------------------------------------------- quick actions
  const act = (label, fn, msg) => h('button', { class: 'btn alt small', onclick: () => { fn(); app.ui.refresh(true); app.hudDirty = true; if (msg) app.toast(msg, 'good'); } }, label);
  const actions = h('div', { class: 'row wrap', style: { gap: '6px' } },
    act('+1,000 coins', () => g.addCoins(1000, 'dev'), '+1,000 coins'),
    act('+100 pearls', () => g.addPearls(100), '+100 pearls'),
    act('+5 amulets', () => g.addAmulets(5), '+5 amulets'),
    act('Fill energy', () => { g.addEnergy(d.economy.energy.max); }, 'Energy filled'),
    act('+1 level', () => g.addXP(g.xpForLevel(g.s.player.level)), 'Level up'),
    act('Magnet ready', () => { g.s.magnetAt = 0; }, 'Magnet recharged'),
    act('Balloons now', () => { g.dropState().nextAt = g.now(); }, 'Balloons are on their way'),
    act('New shop deals', () => { g.s.shopDeals.date = ''; g.shopDeals(); }, 'Shop deals refreshed'));

  // ---------------------------------------------------------- the lists
  const q = h('input', { type: 'search', placeholder: 'Search settings (for example: magnet, balloon, price)', 'aria-label': 'Search settings', style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '10px', border: '2px solid #cdbf98', font: 'inherit', margin: '6px 0' } });
  const holder = h('div');

  const groups = dev.ecoGroups().sort((a, b) => { const ia = FIRST.indexOf(a.group), ib = FIRST.indexOf(b.group); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  for (const grp of groups) {
    const entries = grp.fields.map(f => numRow(f.path, f.label, { group: grp.title, step: Number.isInteger(f.def) && f.def >= 1 ? '1' : 'any' }));
    holder.append(section(grp.title, entries, { open: grp.group === 'magnet' }));
  }

  const iRows = dev.itemRows().sort((a, b) => (a.chain < b.chain ? -1 : a.chain > b.chain ? 1 : a.level - b.level));
  const itemEntries = [];
  for (const r of iRows) {
    const a = numRow(r.sellPath, `${r.name} · sells for`, { step: '1', group: 'item prices sell ' + r.id });
    const b = numRow(r.shopPath, `${r.name} · shop price`, { step: '1', auto: () => String(Math.round(r.autoShop())), group: 'item prices shop store ' + r.id });
    itemEntries.push(a, b);
  }
  holder.append(section('Item prices', itemEntries, { note: 'Sell value is what the item sells for (and the base of trade prices). Shop price is what the daily shop charges: leave it empty for the automatic price (sell value x the shop multiplier). Use "New shop deals" above to roll a fresh set.' }));

  const zoneEntries = [];
  for (const z of dev.zoneRows()) for (const f of z.fields) zoneEntries.push(numRow(f.path, `Zone ${z.n} ${z.name}: ${({ level: 'level needed', amulets: 'amulets', coins: 'coins', clearedPct: 'cleared share (0 to 1)' })[f.key]}`, { step: f.key === 'clearedPct' ? 'any' : '1', group: 'zone unlock' }));
  holder.append(section('Zone unlocking', zoneEntries));
  holder.append(section('Building costs', dev.buildingRows().map(b => numRow(b.path, `${b.name} (coins)`, { step: '1', group: 'building cost' }))));

  // ---------------------------------------------------------- search
  const runSearch = () => {
    const t = q.value.trim().toLowerCase();
    for (const sec of sections) {
      let any = false;
      for (const e of sec.entries) { const hit = !t || e.text.includes(t); e.el.classList.toggle('hidden', !hit); if (hit) any = true; }
      sec.el.classList.toggle('hidden', !any);
      if (t && any) sec.el.open = true; else if (!t) sec.el.open = sec.wasOpen;
    }
  };
  q.addEventListener('input', runSearch);

  updateCount();
  panels.ui.modal({
    title: 'Developer settings', cls: 'wide',
    render: () => h('div', null,
      h('p', { class: 'sub' }, 'Changes apply right away and are kept on this device only. They do not change the game version. Highlighted fields differ from the shipped numbers; ↺ puts one back.'),
      h('h4', { style: { margin: '8px 0 4px', color: 'var(--sea-d)' } }, 'Quick actions'), actions,
      q, countEl, holder),
    footerRender: m => [
      h('button', { class: 'btn ghost', onclick: () => panels.ui.confirm({ title: 'Reset everything?', text: 'Every developer change is removed and the shipped numbers come back.', yes: 'Reset all', no: 'Keep', onYes: () => { dev.resetAll(); for (const r of rows) r.el._show(); app.ui.refresh(true); app.toast('All numbers are back to normal.', 'good'); } }) }, 'Reset all'),
      h('button', { class: 'btn good', onclick: () => m.close() }, 'Done')]
  });
}

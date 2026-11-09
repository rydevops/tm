// Settings → Cloud save (Puter): sign in, save to the cloud, restore from it. A restore of a save that is older than the one on this
// device always asks first, and says how much older. An old jsonhosting transfer code can still be restored (restore only).
import { h, fmtTime, fmt, itemCanvas } from './ui.js';
import { PuterCloud, restoreVerdict, cloudErrorText, summarizeFull } from '../core/puter-cloud.js';
import { Cloud, cloudMessage as legacyMessage } from '../core/cloud.js';

const when = ms => (ms ? new Date(ms).toLocaleString() : 'unknown');
const ago = ms => {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 90) return 'moments ago'; if (s < 5400) return `${Math.round(s / 60)} minutes ago`; if (s < 129600) return `${Math.round(s / 3600)} hours ago`; return `${Math.round(s / 86400)} days ago`;
};
/** How far apart two save times are, in words. */
const gap = (a, b) => { const s = Math.abs(a - b) / 1000; return s < 90 ? 'less than a minute' : s < 5400 ? `${Math.round(s / 60)} minutes` : s < 129600 ? `${Math.round(s / 3600)} hours` : `${Math.round(s / 86400)} days`; };

export function installCloudPanel(Panels) {
  const P = Panels.prototype;
  Object.defineProperty(P, 'puter', { get() { return this.app.puter || (this.app.puter = new PuterCloud()); } });

  /** What this device holds, in the same shape as a cloud summary. */
  P.localSummary = function () {
    const s = this.g.s;
    return { savedAt: s.savedAt || 0, level: s.player.level, playtime: s.playtime || 0, quests: s.quests.done.length, full: summarizeFull({ state: s, home: { items: this.g.home.board.items.filter(Boolean) } }) };
  };
  /** One line about a save: the facts that matter, so it is clear what is (or is not) in it. */
  P.summaryText = function (x) {
    const f = x.full || x.summary;
    return `level ${x.level}${f ? `, ${f.storyQuestsDone} quests done, ${fmt(f.coins)} coins, ${f.zonesUnlocked} areas` : ''}, ${fmtTime(x.playtime || 0)} played, saved ${when(x.savedAt)}`;
  };
  /** Everything that is in a save, for the "what is in my cloud save?" list. */
  P.cloudDetails = function (x) {
    const f = x.full || x.summary; if (!f) return null;
    const rows = [['Level', `${f.level} (${fmt(f.xp)} XP)`], ['Coins', fmt(f.coins)], ['Pearls', fmt(f.pearls)], ['Energy', f.energy], ['Amulets', f.amulets], ['Expedition tickets', f.tickets], ['Areas unlocked', f.zonesUnlocked],
      ['Story quests done', `${f.storyQuestsDone} of ${this.d.quests.length}`], ['Buildings built', f.buildingsBuilt], ['Items on the island', f.itemsOnBoard], ['Items in storage', f.itemsInStorage], ['Items discovered', f.itemsDiscovered],
      ['Pets', f.petsOwned], ['Achievements', f.achievements], ['Daily streak', f.dailyStreak], ['Time played', fmtTime(f.playtimeSeconds || x.playtime || 0)]];
    const inv = f.inventory, nm = id => this.d.name(id), total = o => Object.values(o || {}).reduce((s, n) => s + n, 0);
    const list = (title, o, extra) => { const ids = Object.keys(o || {}); if (!ids.length && !extra) return null; return h('div', { class: 'cloud-inv' }, h('b', null, `${title} (${total(o) + (extra || 0)})`), h('div', { class: 'cloud-inv-l' }, ids.map(id => h('span', { class: 'qb-chip mini' }, itemCanvas(this.d, id, 26), h('span', { class: 't' }, `${o[id]}× ${nm(id)}`))), extra ? h('span', { class: 'sub' }, `+ ${extra} waiting in overflow`) : null)); };
    const items = inv ? [list('Items on the island', inv.onBoard), list('In storage', inv.inStorage, inv.overflow), ...Object.entries(inv.islands || {}).map(([id, b]) => list(`On ${this.d.islandById[id]?.name || id}`, { ...b.onBoard }, 0))].filter(Boolean) : [];
    const appId = x.puterAppId || x.file ? h('div', { class: 'sub cloud-appid' }, x.puterAppId ? h('div', null, 'Puter app id: ', h('code', null, x.puterAppId)) : null, x.file ? h('div', null, 'Save file: ', h('code', null, x.file.path || x.file.relative)) : null) : null;
    return h('details', { class: 'cloud-details' }, h('summary', null, 'What is in this save?'), h('div', { class: 'cloud-grid' }, rows.map(([k, v]) => h('div', null, h('span', null, k), h('b', null, String(v))))), ...items, appId);
  };
  /** "Brings back 23 items on the island and 2 in storage." */
  P.bringsBack = function (x) {
    const inv = (x.full || x.summary)?.inventory; if (!inv) return '';
    const n = o => Object.values(o || {}).reduce((s, v) => s + v, 0), isl = Object.values(inv.islands || {}).reduce((s, b) => s + n(b.onBoard), 0);
    return ` It brings back ${n(inv.onBoard)} items on the island${n(inv.inStorage) + (inv.overflow || 0) ? `, ${n(inv.inStorage) + (inv.overflow || 0)} in storage` : ''}${isl ? ` and ${isl} on expedition islands` : ''}.`;
  };

  /* ------------------------------------------------------------ the settings section */
  P.cloudSection = function (m) {
    const c = this.puter, info = this.cloudInfo || (this.cloudInfo = { state: 'idle' });
    if (info.state === 'idle' && c.connectedBefore) this.cloudCheck(m);          // signed in before: show the account without a tap
    const busy = (btn, label, fn) => async () => { const old = btn.textContent; btn.disabled = true; btn.textContent = label; try { await fn(); } finally { btn.disabled = false; btn.textContent = old; } };
    const mk = (label, cls, fn, busyLabel) => { const b = h('button', { class: 'btn small ' + cls }, label); b.onclick = busy(b, busyLabel || 'Working…', fn); return b; };
    const out = h('div', { class: 'cloud' });
    const signIn = mk('Sign in with Puter', 'alt', () => this.cloudSignIn(m), 'Opening Puter…');
    if (info.state === 'loading') out.append(h('p', { class: 'sub' }, 'Checking your Puter account…'));
    else if (info.state === 'error') out.append(h('p', { class: 'sub' }, info.message), h('div', { class: 'row wrap' }, mk('Try again', 'alt', () => this.cloudCheck(m), 'Checking…')));
    else if (info.state === 'in') {
      const local = this.localSummary();
      out.append(h('div', { class: 'cloud-card' },
        h('div', { class: 'cloud-who' }, h('span', { class: 'cloud-dot' }), h('b', null, `Signed in as ${info.user}`)),
        info.meta
          ? h('div', { class: 'cloud-rows' }, h('div', null, h('b', null, '☁ Cloud: '), this.summaryText(info.meta)), h('div', { class: 'sub' }, `Last saved to the cloud ${ago(info.meta.uploadedAt || info.meta.savedAt)} (${when(info.meta.uploadedAt || info.meta.savedAt)})`), h('div', null, h('b', null, '📱 This device: '), this.summaryText(local)), this.cloudDetails({ ...info.meta, playtime: info.meta.playtime }))
          : h('div', { class: 'cloud-rows' }, h('div', null, 'No cloud save in this account yet.'), h('div', null, h('b', null, '📱 This device: '), this.summaryText(local)))));
      out.append(h('div', { class: 'row wrap' },
        mk('Save to cloud', 'good', () => this.cloudSave(m), 'Saving…'),
        mk('Restore from cloud', 'alt', () => this.cloudRestore(m), 'Checking…'),
        info.meta ? mk('Delete cloud copy', 'ghost', () => this.cloudDelete(m), 'Deleting…') : null,
        mk('Sign out', 'ghost', () => this.cloudSignOut(m), 'Signing out…')));
    } else {
      out.append(h('p', { class: 'sub' }, 'Save your island to your own Puter account and restore it on any device. Free; you sign in with Puter and nothing else is needed.'), h('div', { class: 'row wrap' }, signIn));
    }
    if (info.lastError) out.append(h('p', { class: 'sub cloud-err' }, '⚠ Last problem: ', info.lastError));
    out.append(h('p', { class: 'sub', style: { fontSize: '0.8em', marginTop: '8px' } }, 'Puter is loaded only when you use this. Your save goes to your Puter account’s storage; this game keeps no copy on a server. A restore of a save that is older than the one on this device always asks first. Keep an exported file too.'));
    out.append(h('div', { class: 'row wrap' }, mk('Restore from an old transfer code', 'ghost', () => this.cloudLegacyPrompt(m))));
    return out;
  };

  /* ------------------------------------------------------------ account */
  P.cloudCheck = async function (m) {
    const c = this.puter, info = this.cloudInfo;
    info.state = 'loading'; m?.render?.();
    try {
      if (!(await c.isSignedIn())) { info.state = 'out'; }
      else { info.user = (await c.user()).name; info.meta = await c.meta(); info.state = 'in'; }
    } catch (e) { info.state = 'error'; info.message = cloudErrorText(e); }
    m?.render?.();
  };
  P.cloudSignIn = async function (m) {
    const c = this.puter;
    try { await c.signIn(); } catch (e) { this.app.toast(cloudErrorText(e), 'bad'); this.cloudInfo.state = e.reason === 'unavailable' ? 'error' : 'out'; this.cloudInfo.message = cloudErrorText(e); m.render(); return; }
    await this.cloudCheck(m);
  };
  P.cloudSignOut = async function (m) { try { await this.puter.signOut(); } catch (e) { /* ignore */ } this.cloudInfo = { state: 'out' }; this.app.toast('Signed out of Puter.', 'good'); m.render(); };

  /* ------------------------------------------------------------ save */
  P.cloudSave = async function (m) {
    const app = this.app, c = this.puter, info = this.cloudInfo;
    try {
      app.save?.(true);                                          // the newest progress goes to this device first, so both copies carry the same stamp
      const doc = this.g.serialize();
      const r = await c.push(doc);
      if (r.ok) { const f = r.summary; app.toast(`${r.created ? 'Saved to your Puter cloud' : 'Cloud save updated'}: ${f.storyQuestsDone} quests, ${fmt(f.coins)} coins, ${f.zonesUnlocked} areas (${Math.max(1, Math.round(r.bytes / 1024))} KB${r.verified === 'unknown' ? '; Puter would not let me double-check it' : ''}).`, 'good', 4200); info.lastError = ''; info.meta = await c.meta(); m.render(); return; }
      this.cloudConflict(r, m);
    } catch (e) { console.warn('cloud save failed', e); info.lastError = cloudErrorText(e); app.toast(cloudErrorText(e), 'bad', 6000); m.render(); }
  };
  /** The cloud holds a save this device has not seen: say what is where, and let the player choose. */
  P.cloudConflict = function (r, m) {
    const c = this.puter, app = this.app, info = this.cloudInfo, remote = r.remote, local = this.localSummary();
    const newer = remote.savedAt > local.savedAt;
    this.ui.modal({ title: 'Cloud save is different', cls: 'small',
      render: () => h('div', null, h('p', { class: 'center', style: { fontWeight: 700 } }, 'The cloud holds a save this device has not seen, probably from another device.'),
        h('p', { class: 'sub' }, h('b', null, '☁ Cloud: '), this.summaryText(remote), newer ? ' (newer)' : ' (older)'), h('p', { class: 'sub' }, h('b', null, '📱 This device: '), this.summaryText(local), newer ? ' (older)' : ' (newer)')),
      footerRender: mm => [
        h('button', { class: 'btn ghost', onclick: () => mm.close() }, 'Cancel'),
        h('button', { class: 'btn alt', onclick: async () => { mm.close(); await this.cloudRestore(m); } }, 'Use cloud save'),
        h('button', { class: 'btn good', onclick: async () => { mm.close(); try { await c.push(this.g.serialize(), { force: true }); info.meta = await c.meta(); app.toast('Cloud save replaced with this device.', 'good'); m.render(); } catch (e) { app.toast(cloudErrorText(e), 'bad'); } } }, 'Keep this device')] });
  };

  /* ------------------------------------------------------------ restore */
  P.cloudRestore = async function (m) {
    const app = this.app, c = this.puter;
    let r;
    try { r = await c.pull(); } catch (e) { app.toast(cloudErrorText(e), 'bad'); return false; }
    this.restoreConfirm(r.remote, r.doc, async () => { const st = app.store; await st.save(r.doc); st.freeze(); await c.adopt(r.doc); location.reload(); });
    return true;
  };
  /**
   * Ask before replacing this device's island with `doc`. A save that is OLDER than the one on this device gets a stronger,
   * explicit question that shows both dates and how far apart they are.
   */
  P.restoreConfirm = function (remote, doc, onYes) {
    if (!doc || !doc.state) { this.app.toast('That save is not valid.', 'bad'); return; }
    const local = this.localSummary(), verdict = restoreVerdict(remote, local);
    if (verdict === 'older') {
      this.ui.modal({ title: 'Restore an OLDER save?', cls: 'small',
        render: () => h('div', null, h('p', { class: 'center', style: { fontWeight: 800, color: 'var(--bad)' } }, `The cloud save is ${gap(remote.savedAt, local.savedAt)} older than the one on this device.`),
          h('p', { class: 'sub' }, h('b', null, '☁ Cloud (older): '), this.summaryText(remote)), h('p', { class: 'sub' }, h('b', null, '📱 This device (newer): '), this.summaryText(local)),
          h('p', null, 'Restoring replaces your newer progress on this device with the older cloud save.' + this.bringsBack(remote) + ' This cannot be undone.'), h('p', { style: { fontWeight: 800 } }, 'Are you sure you want to restore the older save?')),
        footerRender: mm => [h('button', { class: 'btn good', onclick: () => mm.close() }, 'No, keep this device'), h('button', { class: 'btn ghost', onclick: () => { mm.close(); onYes(); } }, 'Yes, restore the older save')] });
      return;
    }
    const text = verdict === 'untouched' ? `Cloud save: ${this.summaryText(remote)}. This device has no progress yet, so nothing is lost.${this.bringsBack(remote)}` : verdict === 'newer' ? `Cloud save (newer): ${this.summaryText(remote)}. It will replace the island on this device.${this.bringsBack(remote)}` : `Cloud save: ${this.summaryText(remote)}. It will replace the island on this device.${this.bringsBack(remote)}`;
    this.ui.confirm({ title: 'Restore this island?', text, yes: 'Restore', no: 'Cancel', onYes });
  };
  P.cloudDelete = function (m) {
    return new Promise(res => this.ui.confirm({ title: 'Delete the cloud copy?', text: 'The save in your Puter account is deleted. Your island on this device is not affected.', yes: 'Delete', no: 'Keep it',
      onYes: async () => { try { await this.puter.remove(); this.cloudInfo.meta = null; this.app.toast('Cloud copy deleted.', 'good'); } catch (e) { this.app.toast(cloudErrorText(e), 'bad'); } m.render(); res(); }, onNo: () => res() }));
  };

  /* ------------------------------------------------------------ old transfer codes (restore only) */
  P.cloudLegacyPrompt = function () {
    const box = h('textarea', { class: 'codebox', rows: 3, placeholder: 'Paste your old transfer code', style: { width: '100%', fontSize: '0.8em', wordBreak: 'break-all' } });
    this.ui.modal({ title: 'Restore from an old transfer code', cls: 'small',
      render: () => h('div', null, h('p', { class: 'sub' }, 'Earlier versions backed up to a different service and gave you a transfer code. You can still restore from one. New cloud saves use your Puter account.'), box),
      footerRender: mm => { const go = h('button', { class: 'btn good' }, 'Restore'); go.onclick = async () => { go.disabled = true; go.textContent = 'Checking…'; const ok = await this.cloudLegacyRestore(box.value); go.disabled = false; go.textContent = 'Restore'; if (ok) mm.close(); }; return [h('button', { class: 'btn ghost', onclick: () => mm.close() }, 'Cancel'), go]; } });
    setTimeout(() => box.focus?.(), 50);
  };
  P.cloudLegacyRestore = async function (code) {
    const app = this.app;
    if (!Cloud.parse(code)) { app.toast('That does not look like a transfer code.', 'bad'); return false; }
    const old = new Cloud();
    let r; try { r = await old.pull(code); } catch (e) { app.toast(legacyMessage(e), 'bad'); return false; }
    this.restoreConfirm(r.remote, r.doc, async () => { const st = app.store; await st.save(r.doc); st.freeze(); old.forget(); location.reload(); });
    return true;
  };
}

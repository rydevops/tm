// Cloud save on Puter (https://puter.com), through puter.js. The player signs in with their own Puter account and the save lives in that
// account's cloud storage: nothing is stored on a server of ours and no code has to be copied between devices. Every upload is stamped with
// when it was saved, so a restore can tell whether the cloud copy is older or newer than the one on the device.
// puter.js is loaded only when the player asks for cloud features (it is a third-party script, and the game also plays offline).
// Nothing here touches the game state; callers get plain results.

export const PUTER_SRC = 'https://js.puter.com/v2/';
const SAVE_PATH = 'tropical-merge/save.json';          // in the app's own storage area of the player's Puter account
const META_KEY = 'tropical-merge:save-meta';           // small record kept beside it: when it was saved, level, play time
const LS_KEY = 'tropical-merge-puter-v1';

export class CloudError extends Error { constructor(reason, detail) { super(reason); this.reason = reason; this.detail = detail; } }

/** Short facts about a save, for the "which one do you keep?" prompts. */
export const summarize = doc => ({ savedAt: doc.savedAt || 0, level: doc.state?.player?.level ?? 1, playtime: doc.state?.playtime ?? 0 });

/** Everything worth knowing about a save at a glance, in plain words. It is stored beside the save (and at the top of the cloud file), so what is in the cloud can be read without opening the game. */
export function summarizeFull(doc) {
  const s = doc.state || {}, p = s.player || {}, count = o => Object.keys(o || {}).length;
  const tally = list => { const o = {}; for (const it of list || []) if (it && it.id) o[it.id] = (o[it.id] || 0) + 1; return Object.fromEntries(Object.entries(o).sort()); };
  const islands = Object.fromEntries(Object.entries(doc.islandBoards || {}).map(([id, b]) => [id, { onBoard: tally(b.items), inStorage: tally(b.tray), overflow: (b.overflow || []).length }]));
  return {
    // every item the player holds, by id and count: on the island, in the storage tray, in overflow and on each expedition island
    inventory: { onBoard: tally(doc.home?.items), inStorage: tally(s.storage), overflow: (s.overflow || []).length, islands },
    level: p.level ?? 1, xp: p.xp ?? 0, coins: p.coins ?? 0, pearls: p.pearls ?? 0, energy: p.energy ?? 0, amulets: p.amulets ?? 0, tickets: p.tickets ?? 0,
    playtimeSeconds: Math.round(s.playtime || 0), zonesUnlocked: (s.zones?.unlocked || []).length, storyQuestsDone: (s.quests?.done || []).length, activeQuests: s.quests?.active || [],
    buildingsBuilt: count(s.built), itemsOnBoard: doc.home?.items?.length ?? 0, itemsInStorage: (s.storage || []).filter(Boolean).length, itemsDiscovered: count(s.journal?.discovered),
    petsOwned: (s.petsOwned || []).length, achievements: count(s.ach?.done), dailyStreak: s.daily?.streak ?? 0, islandsStarted: count(s.islands)
  };
}
/** The file written to the cloud: a readable summary first, then the complete save. One JSON object. */
export function buildCloudFile(doc, uploadedAt, appId = null) {
  const head = { app: 'Tropical Merge', puterAppId: appId, format: 2, savedAt: doc.savedAt || 0, savedAtISO: doc.savedAt ? new Date(doc.savedAt).toISOString() : null, uploadedAt, uploadedAtISO: new Date(uploadedAt).toISOString(), schema: doc.schema || 0, summary: summarizeFull(doc) };
  return `{\n"info": ${JSON.stringify(head, null, 2)},\n"save": ${JSON.stringify(doc)}\n}`;
}
/** Reads a cloud file back: the new wrapped format, or a bare save document from an earlier build. */
export function readCloudFile(text) {
  let o; try { o = JSON.parse(text); } catch (e) { throw new CloudError('corrupt', e); }
  const doc = o && o.save && o.save.state ? o.save : o;
  if (!doc || !doc.state || !doc.home) throw new CloudError('corrupt');
  return doc;
}

/**
 * Is `remote` (the cloud save) older than, newer than or the same as `local` (this device)? A device that has hardly been played
 * (level 1, a couple of minutes) counts as "same": there is no progress there to lose.
 */
export function restoreVerdict(remote, local) {
  if (!local || (local.level <= 1 && (local.playtime || 0) < 120 && !local.quests)) return remote.savedAt > 0 ? 'untouched' : 'same';
  if (remote.savedAt < local.savedAt) return 'older';
  return remote.savedAt > local.savedAt ? 'newer' : 'same';
}

/** Load puter.js on demand. Rejects with CloudError('unavailable') when offline, blocked or too slow. */
export function loadPuter({ timeoutMs = 12000, doc = globalThis.document } = {}) {
  if (globalThis.puter) return Promise.resolve(globalThis.puter);
  return new Promise((resolve, reject) => {
    if (!doc) { reject(new CloudError('unavailable')); return; }
    const s = doc.createElement('script'); s.src = PUTER_SRC; s.async = true;
    const fail = () => { clearTimeout(t); s.remove(); reject(new CloudError('unavailable')); };
    const t = setTimeout(fail, timeoutMs);
    s.onload = () => { clearTimeout(t); globalThis.puter ? resolve(globalThis.puter) : fail(); };
    s.onerror = fail;
    doc.head.append(s);
  });
}

/** A short, plain description of whatever an SDK threw (an Error, a {code, message} object or a string). */
export const errorText = e => {
  if (!e) return '';
  if (typeof e === 'string') return e.slice(0, 160);
  if (e.detail && !(e instanceof Error && !e.detail)) return errorText(e.detail);
  const bits = [e.code, e.message, e.msg].filter(x => typeof x === 'string' && x);
  if (bits.length) return [...new Set(bits)].join(': ').slice(0, 160);
  try { const j = JSON.stringify(e); return j && j !== '{}' ? j.slice(0, 160) : String(e).slice(0, 160); } catch (x) { return String(e).slice(0, 160); }
};

const missingError = e => /not.?exist|not.?found|ENOENT|no such/i.test(`${e?.code || ''} ${e?.message || ''} ${typeof e === 'string' ? e : ''}`);

export class PuterCloud {
  /** `getPuter` returns the puter.js object (tests pass a fake). `storage` remembers which save this device last synced. */
  constructor({ getPuter = loadPuter, storage } = {}) {
    this.getPuter = getPuter;
    this.store = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
    this.link = this._read();
    this.p = null;
  }
  _read() { try { const o = JSON.parse(this.store?.getItem(LS_KEY) || 'null'); return o && o.user ? o : null; } catch (e) { return null; } }
  _write(link) { this.link = link; try { if (link) this.store?.setItem(LS_KEY, JSON.stringify(link)); else this.store?.removeItem(LS_KEY); } catch (e) { /* private mode */ } }
  /** Has this player used Puter cloud save before? Then settings loads puter.js by itself to show the account. */
  get connectedBefore() { return !!this.link; }
  get lastSyncedAt() { return this.link?.t || 0; }

  async ready() {
    if (this.p) return this.p;
    try { this.p = await this.getPuter(); } catch (e) { throw e instanceof CloudError ? e : new CloudError('unavailable', e); }
    if (!this.p || !this.p.auth || !this.p.kv || !this.p.fs) throw new CloudError('unavailable');
    return this.p;
  }
  /** The unique id Puter gives this app (puter.appID), or null when the SDK does not report one. Stored with every save. */
  async appId() {
    const p = await this.ready();
    try { const v = typeof p.appID === 'function' ? await p.appID() : p.appID; return typeof v === 'string' && v ? v : null; } catch (e) { return null; }
  }
  async isSignedIn() { const p = await this.ready(); return !!(await p.auth.isSignedIn()); }
  async user() { const p = await this.ready(); try { const u = await p.auth.getUser(); return { name: u?.username || u?.name || 'your Puter account' }; } catch (e) { throw new CloudError('network', e); } }
  /** Opens Puter's sign-in window. Must be called straight from a tap, or the browser blocks the window. */
  async signIn() {
    const p = await this.ready();
    try { await p.auth.signIn(); } catch (e) { throw new CloudError('cancelled', e); }
    if (!(await p.auth.isSignedIn())) throw new CloudError('cancelled');
  }
  async signOut() { const p = await this.ready(); try { await p.auth.signOut(); } catch (e) { /* already signed out */ } this._write(null); }

  async _signedInUser() {
    const p = await this.ready();
    if (!(await p.auth.isSignedIn())) throw new CloudError('signedout');
    return (await this.user()).name;
  }
  async _guard(fn) { try { return await fn(); } catch (e) { if (e instanceof CloudError) throw e; throw new CloudError(missingError(e) ? 'missing' : 'network', e); } }

  /** What is in the cloud: { savedAt, uploadedAt, level, playtime } or null when there is no cloud save yet. */
  async meta() {
    const p = await this.ready();
    await this._signedInUser();
    return this._guard(async () => {
      const v = await p.kv.get(META_KEY);
      if (!v) return null;
      const m = typeof v === 'string' ? JSON.parse(v) : v;
      return m && m.savedAt ? m : null;
    });
  }

  /**
   * Upload the save. If another device uploaded since this one last synced, nothing is written and the result is
   * { ok:false, reason:'conflict', remote, local }: the caller decides, and can call again with force:true to overwrite.
   */
  async push(doc, { force = false } = {}) {
    const p = await this.ready(), user = await this._signedInUser();
    const remote = await this.meta();
    const mine = this.link && this.link.user === user ? this.link : null;
    if (remote && !force && (!mine || remote.savedAt !== mine.at)) return { ok: false, reason: 'conflict', remote, local: summarize(doc) };
    const now = Date.now(), sum = summarize(doc), full = summarizeFull(doc), appId = await this.appId(), text = buildCloudFile(doc, now, appId);
    await this._guard(() => p.fs.write(SAVE_PATH, text, { overwrite: true, createMissingParents: true }));    // the data first, so the record never points at nothing
    const verified = await this._verify(p, doc, text);
    await this._guard(() => p.kv.set(META_KEY, JSON.stringify({ v: 2, puterAppId: appId, savedAt: sum.savedAt, uploadedAt: now, level: sum.level, playtime: sum.playtime, schema: doc.schema || 0, summary: full })));
    this._write({ user, at: sum.savedAt, t: now });
    return { ok: true, created: !remote, uploadedAt: now, bytes: text.length, summary: full, verified };
  }

  /**
   * Read the file back and check it is the whole save. 'ok' when it is. 'unknown' when it cannot be read back (the write itself
   * succeeded, so the save is not failed over a check). It fails only when Puter hands back a readable save that is a different one
   * (a stub, an older copy), after a second look in case the new file had not settled yet.
   */
  async _verify(p, doc, text) {
    let last = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 700));
      let raw;
      try { const r = await p.fs.read(SAVE_PATH); raw = typeof r === 'string' ? r : await r.text(); } catch (e) { last = { unreadable: errorText(e) }; continue; }
      let obj; try { obj = JSON.parse(raw); } catch (e) { last = { unreadable: 'not JSON', wrote: text.length, got: raw.length }; continue; }
      const back = obj && obj.save && obj.save.state ? obj.save : (obj || {});          // readable JSON that is not the save (a stub) is a real mismatch, not a failed check
      const q = x => x.state?.quests?.done?.length ?? -1, items = x => x.home?.items?.length ?? -1;
      const inv = x => JSON.stringify(summarizeFull(x).inventory);
      if (back.state && back.savedAt === doc.savedAt && q(back) === q(doc) && items(back) === items(doc) && inv(back) === inv(doc) && Object.keys(back.state).length === Object.keys(doc.state).length) return 'ok';
      last = { wrote: text.length, got: raw.length, savedAt: [doc.savedAt, back.savedAt], quests: [q(doc), q(back)], items: [items(doc), items(back)] };
    }
    if (last && last.unreadable) return 'unknown';
    throw new CloudError('verify', last);
  }

  /** Download the cloud save. Nothing on the device changes until the caller restores it and calls adopt(). */
  async pull() {
    const p = await this.ready(); await this._signedInUser();
    const meta = await this.meta();
    if (!meta) throw new CloudError('missing');
    return this._guard(async () => {
      const blob = await p.fs.read(SAVE_PATH);
      const text = typeof blob === 'string' ? blob : await blob.text();
      const doc = readCloudFile(text);
      return { doc, remote: { ...summarize(doc), uploadedAt: meta.uploadedAt, full: summarizeFull(doc) } };
    });
  }
  /** After a restore: this device now holds exactly the cloud save, so the next upload is not a conflict. */
  async adopt(doc) { const user = await this._signedInUser().catch(() => this.link?.user || ''); if (user) this._write({ user, at: doc.savedAt || 0, t: Date.now() }); }

  async remove() {
    const p = await this.ready(); await this._signedInUser();
    await this._guard(async () => {
      try { await p.fs.delete(SAVE_PATH); } catch (e) { if (!missingError(e)) throw e; }
      await p.kv.del(META_KEY);
    });
    this._write(null);
    return { ok: true };
  }
  forget() { this._write(null); }
}

/** The message plus what actually went wrong underneath, so a problem can be reported instead of guessed at. */
export function cloudErrorText(e) {
  if (e && !e.reason) return `Something went wrong talking to Puter (${errorText(e) || 'unknown error'})`;       // not one of ours: say what it was
  const d = e && e.reason === 'verify' && e.detail && e.detail.wrote ? `wrote ${e.detail.wrote} bytes, got back ${e.detail.got}; quests ${e.detail.quests?.join(' vs ')}` : errorText(e && e.detail);
  return cloudMessage(e) + (d ? ` (${d})` : '');
}
export const cloudMessage = e => ({
  unavailable: 'Puter is not reachable right now. Check your connection and try again.',
  network: 'Could not reach Puter. Check your connection and try again.',
  cancelled: 'Sign-in was not completed.',
  signedout: 'You are not signed in to Puter.',
  missing: 'There is no cloud save in this Puter account yet.',
  corrupt: 'The cloud save could not be read.',
  verify: 'Puter did not keep the whole save, so nothing was marked as saved. Try again.'
})[e && e.reason] || 'Something went wrong talking to Puter.';

// Cloud copy of the save on jsonhosting.com (free, no account). The save is gzip-compressed and AES-GCM encrypted on the device, so the
// service only ever stores scrambled text. The "transfer code" holds the document id, its edit key and the encryption key: whoever has the
// code can read and replace the cloud copy, so it is the player's password. Nothing here touches the game state; callers get plain results.

const API = 'https://jsonhosting.com';
const LS_KEY = 'tropical-merge-cloud-v1';
const PREFIX = 'TM1~';

const enc = new TextEncoder(), dec = new TextDecoder();
const toB64 = u8 => btoa(Array.from(u8, c => String.fromCharCode(c)).join(''));
const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const gzip = async (u8, T) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new T('gzip'))).arrayBuffer());

/** Compress + encrypt a save document into the small JSON object that gets stored. Every field is always present, so a PATCH that merges instead of replaces still ends up identical. */
export async function seal(doc, keyB64) {
  const key = await crypto.subtle.importKey('raw', fromB64(keyB64), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const packed = await gzip(enc.encode(JSON.stringify(doc)), CompressionStream);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, packed));
  return { v: 1, at: doc.savedAt || 0, iv: toB64(iv), data: toB64(data) };
}
/** Reverse of seal. Throws when the key is wrong or the data was altered (AES-GCM authenticates it). */
export async function unseal(blob, keyB64) {
  if (!blob || blob.v !== 1 || typeof blob.data !== 'string' || typeof blob.iv !== 'string') throw new Error('format');
  const key = await crypto.subtle.importKey('raw', fromB64(keyB64), 'AES-GCM', false, ['decrypt']);
  const packed = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.iv) }, key, fromB64(blob.data)));
  return JSON.parse(dec.decode(await gzip(packed, DecompressionStream)));
}
export const newKey = () => toB64(crypto.getRandomValues(new Uint8Array(32)));

/** Short facts about a save, for the "which one do you keep?" prompt. */
export const summarize = doc => ({ savedAt: doc.savedAt || 0, level: doc.state?.player?.level ?? 1, playtime: doc.state?.playtime ?? 0 });

export class CloudError extends Error { constructor(reason, detail) { super(reason); this.reason = reason; this.detail = detail; } }

export class Cloud {
  constructor({ fetchFn, storage, base = API } = {}) {
    this.f = fetchFn || ((...a) => globalThis.fetch(...a));
    this.store = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
    this.base = base;
    this.link = this._read();
  }
  _read() { try { const o = JSON.parse(this.store?.getItem(LS_KEY) || 'null'); return o && o.id && o.editKey && o.key ? o : null; } catch (e) { return null; } }
  _write(link) { this.link = link; try { if (link) this.store?.setItem(LS_KEY, JSON.stringify(link)); else this.store?.removeItem(LS_KEY); } catch (e) { /* private mode */ } }

  get linked() { return !!this.link; }
  /** The transfer code to show the player. */
  get code() { const l = this.link; return l ? `${PREFIX}${l.id}~${l.editKey}~${l.key}` : ''; }
  static parse(code) {
    const p = String(code || '').trim().split('~');
    if (p.length !== 4 || p[0] + '~' !== PREFIX || !p[1] || !p[2] || !/^[A-Za-z0-9+/=]{40,48}$/.test(p[3])) return null;
    return { id: p[1], editKey: p[2], key: p[3] };
  }

  async _call(path, init = {}) {
    let res;
    try { res = await this.f(this.base + path, { ...init, cache: 'no-store' }); } catch (e) { throw new CloudError('network', e); }
    if (res.status === 404) throw new CloudError('missing');
    if (res.status === 429) throw new CloudError('rate');
    if (!res.ok) throw new CloudError('server', res.status);
    try { return await res.json(); } catch (e) { throw new CloudError('server', 'json'); }
  }
  // GET responses are cached for a day by the service, so every read carries a unique query string and asks the browser not to cache it
  async _fetch(link) {
    const blob = await this._call(`/api/json/${encodeURIComponent(link.id)}?_=${Date.now()}`);
    try { return { blob, doc: await unseal(blob, link.key) }; } catch (e) { throw new CloudError('badcode', e); }
  }

  /**
   * Upload the save. First call creates the cloud document. Later calls update it, unless another device changed it since this one last
   * synced (then { ok:false, reason:'conflict', remote } and the caller decides; pass force:true to overwrite).
   */
  async push(doc, { force = false } = {}) {
    const sealedWith = key => seal(doc, key);
    if (this.link && !force) {
      let remote = null;
      try { remote = (await this._fetch(this.link)).doc; } catch (e) { if (!(e instanceof CloudError) || e.reason !== 'missing') throw e; this._write(null); } // expired or deleted: start a new one
      if (remote && remote.savedAt !== this.link.at) return { ok: false, reason: 'conflict', remote: summarize(remote), local: summarize(doc) };
    }
    if (!this.link) {
      const key = newKey();
      const r = await this._call('/api/json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await sealedWith(key)) });
      if (!r.id || !r.editKey) throw new CloudError('server', 'create');
      this._write({ id: r.id, editKey: r.editKey, key, at: doc.savedAt || 0, t: Date.now() });
      return { ok: true, created: true };
    }
    await this._call(`/api/json/${encodeURIComponent(this.link.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Edit-Key': this.link.editKey }, body: JSON.stringify(await sealedWith(this.link.key)) });
    this._write({ ...this.link, at: doc.savedAt || 0, t: Date.now() });
    return { ok: true, created: false };
  }

  /** Download and decrypt the cloud save using a transfer code (or the linked one). Nothing is changed until adopt() is called. */
  async pull(code) {
    const link = code ? Cloud.parse(code) : this.link;
    if (!link) throw new CloudError('badcode');
    const { doc } = await this._fetch(link);
    return { doc, link, remote: summarize(doc) };
  }
  /** Make this device a peer of the cloud document after its save has been restored. */
  adopt(link, doc) { this._write({ ...link, at: doc.savedAt || 0, t: Date.now() }); }

  /** Delete the cloud copy (when we hold the edit key) and forget the link. */
  async remove() {
    const l = this.link; if (!l) return { ok: true };
    try { await this._call(`/api/json/${encodeURIComponent(l.id)}`, { method: 'DELETE', headers: { 'X-Edit-Key': l.editKey } }); } catch (e) { if (!(e instanceof CloudError) || e.reason !== 'missing') throw e; }
    this._write(null);
    return { ok: true };
  }
  forget() { this._write(null); }
}

export const cloudMessage = e => ({
  network: 'Could not reach the cloud service. Check your connection and try again.',
  rate: 'The cloud service is busy right now. Try again in a little while.',
  missing: 'That cloud save was not found. It may have expired or been deleted.',
  badcode: 'That code does not match a cloud save. Check it and try again.',
  server: 'The cloud service returned an error. Try again later.'
})[e && e.reason] || 'Something went wrong talking to the cloud service.';

// Small shared helpers: seeded RNG (serialisable), checksum, id helpers.

export class RNG {
  constructor(seed = 1) { this.s = seed >>> 0; }
  next() {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n) { return Math.floor(this.next() * n); }
  range(a, b) { return a + this.int(b - a + 1); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[this.int(arr.length)]; }
  weighted(entries, key = 'weight') {
    let total = 0;
    for (const e of entries) total += e[key];
    if (total <= 0) return entries[0];
    let r = this.next() * total;
    for (const e of entries) { r -= e[key]; if (r < 0) return e; }
    return entries[entries.length - 1];
  }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = this.int(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
}

export function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export function checksum(str) { return hashStr(str).toString(16).padStart(8, '0'); }

export const pad2 = n => String(n).padStart(2, '0');
export const itemId = (chain, level) => `${chain}_${pad2(level)}`;
export const parseItemId = id => { const m = /^(.*)_(\d\d)$/.exec(id); return m ? { chain: m[1], level: parseInt(m[2], 10) } : null; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const deepClone = o => JSON.parse(JSON.stringify(o));

export function dayKey(ms, offsetMin = 0) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function dayNumber(ms) { const d = new Date(ms); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000); }
export function weekKey(ms) {
  const d = new Date(ms); const day = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return dayKey(monday.getTime());
}

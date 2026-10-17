// The magnet: pay coins, tap one item, and every identical item on the board is pulled in and merged at once (n items -> n-2 of the next
// level, the same rule as a normal merge). It then recharges. The cooldown is stored as a timestamp (`magnetAt`), so it keeps running
// while the game is closed and is shifted with the other timers if the device clock jumps.
import { planFromCells } from './merge.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export function installMagnetCommands(Game) {
  const P = Game.prototype;

  P.magnetInfo = function () {
    const eco = this.data.economy.magnet, wait = Math.max(0, Math.ceil(((this.s.magnetAt || 0) - this.now()) / 1000));
    return { cost: eco.cost, cooldownSec: eco.cooldownSec, wait, ready: wait === 0, canAfford: this.s.player.coins >= eco.cost };
  };

  /** Cells of every usable copy of the item at `idx` (same id, on an open cell, not frozen). */
  P.magnetCells = function (idx, board = this.ctx.board) {
    const it = board.items[idx];
    if (!it || it.f) return [];
    const out = [];
    for (let i = 0; i < board.n; i++) { const o = board.items[i]; if (o && o.id === it.id && !o.f && board.isOpen(i)) out.push(i); }
    return out;
  };

  /** Cells (on this board) whose item the magnet could use right now: 3+ identical copies and not at max level. */
  P.magnetTargets = function () {
    const b = this.ctx.board, byId = new Map();
    for (let i = 0; i < b.n; i++) { const o = b.items[i]; if (o && !o.f && b.isOpen(i) && !this.data.isMax(o.id)) { if (!byId.has(o.id)) byId.set(o.id, []); byId.get(o.id).push(i); } }
    const out = [];
    for (const cells of byId.values()) if (cells.length >= 3) out.push(...cells);
    return out;
  };

  /** Use the magnet on the item at board cell `idx`. Nothing is charged unless it works. */
  P.useMagnet = function (idx) {
    this.cascadeDepth = 0;
    const ctx = this.ctx, b = ctx.board, info = this.magnetInfo();
    const it = b.items[idx];
    if (!it) return fail('empty');
    if (it.f) return fail('frozen');
    if (this.data.isMax(it.id)) return fail('maxLevel');
    if (!info.ready) return fail('cooldown', { wait: info.wait });
    const cells = this.magnetCells(idx);
    if (cells.length < 3) return fail('tooFew', { count: cells.length });
    if (!info.canAfford) return fail('noCoins', { cost: info.cost });
    // Every pulled-in cell is freed before the n-2 results are placed, so they always fit on the board.
    const plan = planFromCells(b, cells, idx, this.data);
    if (!plan) return fail('tooFew', { count: cells.length });
    plan.magnet = true;
    this.spendCoins(info.cost);
    this.s.magnetAt = this.now() + info.cooldownSec * 1000;
    this.s.stats.magnets = (this.s.stats.magnets || 0) + 1;
    const res = this.execMerge(ctx, plan, idx, null);
    return { ...res, magnet: true, cost: info.cost };
  };
}

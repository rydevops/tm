// Balloon gift drops: every few minutes 1-3 balloons float down near the player's view, pop on landing and leave a gift on the ground.
// Each drop is a plain record in the save ({id, cell, startAt, landAt, ph}); its cell is reserved by a 'gift' structure so nothing else lands there.
// Whether it is still falling is derived from the clock, so reloading mid-flight (or being away) just works.

const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export function installDropCommands(Game) {
  const P = Game.prototype;

  P.dropState = function () { return this.s.drops || (this.s.drops = { nextAt: 0, seq: 0, list: [] }); };
  P.dropDelay = function () { const e = this.data.economy.drops; return this.rng.range(e.minSec, e.maxSec) * 1000; };
  P.dropTier = function () {
    const tiers = this.data.economy.drops.tiers, lvl = this.s.player.level;
    let best = tiers[0];
    for (const t of tiers) if (lvl >= t.minLevel) best = t;
    return best;
  };

  /** The structure object that reserves a drop's cell (and makes it tappable). */
  P.giftStruct = function (dr) {
    const b = this.home.board;
    return { kind: 'gift', id: `gift_${dr.id}`, drop: dr, x: b.x(dr.cell), y: b.y(dr.cell), w: 1, h: 1, zone: this.data.cellZone[dr.cell] };
  };

  /** Drops that have reached the ground and can be opened. */
  P.landedGifts = function () { const now = this.now(); return this.dropState().list.filter(dr => now >= dr.landAt); };

  /** Distinct empty cells for a wave: random ones around the player's view, else the nearest free ones. */
  P.dropCells = function (count) {
    const b = this.home.board, e = this.data.economy.drops;
    const anchor = this.viewAnchor ?? this.anchorCell(this.home);
    const ax = b.x(anchor), ay = b.y(anchor), pool = [];
    for (let y = ay - e.radius; y <= ay + e.radius; y++) for (let x = ax - e.radius; x <= ax + e.radius; x++) {
      if (b.inBounds(x, y) && b.isEmpty(b.idx(x, y))) pool.push(b.idx(x, y));
    }
    if (pool.length >= count) return this.rng.shuffle(pool).slice(0, count);
    return b.nearestEmpty(anchor, count);
  };

  P.tickDrops = function () {
    if (this.ctx.kind !== 'home' || !this.s.tutorial.done) return;
    const st = this.dropState(), now = this.now(), e = this.data.economy.drops, b = this.home.board;
    if (!st.nextAt) { st.nextAt = now + this.dropDelay(); return; }
    if (now < st.nextAt) return;
    const want = Math.min(this.rng.range(e.minCount, e.maxCount), e.maxOnGround - st.list.length);
    // a crowded ground or a packed board skips this wave; a packed board is retried soon, a full ground waits for the next slot
    if (want <= 0) { st.nextAt = now + this.dropDelay(); return; }
    if (b.emptyCount() < e.minFreeCells) { st.nextAt = now + e.retrySec * 1000; return; }
    const cells = this.dropCells(want);
    let t = now;
    for (const cell of cells) {
      const dr = { id: ++st.seq, cell, startAt: t, landAt: t + e.fallSec * 1000, ph: this.rng.int(1000) };
      st.list.push(dr);
      this.fillStruct(b, this.giftStruct(dr));
      t += this.rng.range(e.staggerSec[0] * 10, e.staggerSec[1] * 10) * 100;
    }
    st.nextAt = now + this.dropDelay();
    if (cells.length) this.emit('giftDrop', { count: cells.length, cells });
  };

  /** Tap a gift: nothing while it is still floating down; once landed it opens like a small chest. */
  P.openGift = function (st) {
    const dr = st.drop, list = this.dropState().list, b = this.home.board;
    const i = list.indexOf(dr);
    if (i < 0) return fail('gone');
    if (this.now() < dr.landAt) return { ok: true, action: 'none' };
    list.splice(i, 1);
    b.struct[dr.cell] = null;
    this.s.stats.giftDrops = (this.s.stats.giftDrops || 0) + 1;
    const out = this.rollChest(this.dropTier().table, this.home);
    this.emit('chestOpened', { idx: dr.cell, chest: { id: 'gift' }, contents: out, ctx: this.home.id, gift: true });
    for (const id of out) this.addItem(this.makeItem(id), dr.cell, 'chest', this.home);
    this.checkAchievements?.();
    return { ok: true, action: 'gift', contents: out };
  };
}

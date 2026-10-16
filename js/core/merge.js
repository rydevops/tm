// Merge rules (spec section 5). Pure functions of board state; no side effects.
// A merge combines 3-5 identical, 8-connected items. 3 -> 1 next level; 4 -> 1 next + 1 same level; 5+ -> 2 next (exactly 5 consumed).

/**
 * Plan a merge.
 *  - carried != null, drop cell empty:      carried is placed at the drop cell and the group grows outward from it.
 *  - carried != null, drop cell identical:  the group grows outward from the target; the carried item joins it.
 *  - carried == null:                       cascade check for the item already sitting on the drop cell.
 * Returns null when nothing merges, otherwise a plan describing what is consumed and produced.
 */
export function planMerge(board, dropIdx, carried, data, opts = {}) {
  const maxGroup = opts.maxGroup || 5;
  const target = board.items[dropIdx];
  let seedId, entries; // entries: {idx, item, virtual}
  if (carried) {
    if (carried.f) return null;
    if (target) {
      if (target.id !== carried.id || target.f) return null;
      seedId = target.id;
      const cells = board.floodFill8(dropIdx, seedId);
      entries = cells.map(i => ({ idx: i, item: board.items[i], virtual: false }));
      entries.push({ idx: dropIdx, item: carried, virtual: true });
    } else {
      if (!board.isEmpty(dropIdx) && !opts.ignoreEmptyCheck) return null;
      seedId = carried.id;
      // place carried temporarily so flood fill sees it
      board.items[dropIdx] = carried;
      const cells = board.floodFill8(dropIdx, seedId);
      board.items[dropIdx] = null;
      entries = cells.map(i => ({ idx: i, item: i === dropIdx ? carried : board.items[i], virtual: i === dropIdx }));
      // the carried item sits in the drop cell: treated as a real cell occupant for distance purposes
      entries.forEach(e => { if (e.idx === dropIdx) e.virtual = false; });
      entries.find(e => e.idx === dropIdx).carried = true;
    }
  } else {
    if (!target || target.f) return null;
    seedId = target.id;
    const cells = board.floodFill8(dropIdx, seedId);
    entries = cells.map(i => ({ idx: i, item: board.items[i], virtual: false }));
  }
  if (data.isMax(seedId)) return null;
  if (entries.length < 3) return null;
  // pick the closest items to the drop cell. Carried item first, then distance, row, column.
  const rank = e => [e.virtual || e.carried ? 0 : 1, board.dist(e.idx, dropIdx), board.y(e.idx), board.x(e.idx)];
  entries.sort((a, b) => { const ra = rank(a), rb = rank(b); for (let k = 0; k < 4; k++) if (ra[k] !== rb[k]) return ra[k] - rb[k]; return 0; });
  const picked = entries.slice(0, Math.min(maxGroup, entries.length));
  const size = picked.length;
  const shimmerCount = picked.reduce((s, e) => s + (e.item.s ? 1 : 0), 0);
  const nextId = data.nextId(seedId);
  let resultId = nextId;
  if (shimmerCount >= 3 && !data.isMax(nextId)) resultId = data.nextId(nextId);
  const plan = {
    seedId, size, picked, shimmerCount, resultId,
    bonus: size === 4 ? [{ id: seedId }] : size >= 5 ? [{ id: resultId }] : [],
    pickedCells: picked.filter(e => !e.virtual).map(e => e.idx),
    carriedUsed: picked.some(e => e.virtual || e.carried),
    sp: (target && target.sp) || (carried && carried.sp) || undefined
  };
  return plan;
}

/** Preview for the drag UI: which cells would be outlined and which badge to show. */
export function previewMerge(board, dropIdx, carried, data) {
  const plan = planMerge(board, dropIdx, carried, data);
  if (!plan) return null;
  const badge = plan.size === 3 ? '×1' : plan.size === 4 ? '×1 +1' : '×2';
  return { cells: plan.pickedCells.concat([dropIdx]), badge, plan };
}

// Merge rules (spec section 5). Pure functions of board state; no side effects.
// A merge combines every identical, 8-connected item (3 or more, no upper limit). All n are consumed and n-2 items of the next level appear:
// 3 -> 1, 4 -> 2, 5 -> 3, 6 -> 4 ...

/**
 * Plan a merge.
 *  - carried != null, drop cell empty:      carried is placed at the drop cell and the group grows outward from it.
 *  - carried != null, drop cell identical:  the group grows outward from the target; the carried item joins it.
 *  - carried == null:                       cascade check for the item already sitting on the drop cell.
 * Returns null when nothing merges, otherwise a plan describing what is consumed and produced.
 */
export function planMerge(board, dropIdx, carried, data, opts = {}) {
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
  const picked = entries;
  const size = picked.length;
  const shimmerCount = picked.reduce((s, e) => s + (e.item.s ? 1 : 0), 0);
  const nextId = data.nextId(seedId);
  let resultId = nextId;
  if (shimmerCount >= 3 && !data.isMax(nextId)) resultId = data.nextId(nextId);
  const plan = {
    seedId, size, picked, shimmerCount, resultId,
    count: size - 2,                                                 // next-level items produced in total
    bonus: Array.from({ length: size - 3 }, () => ({ id: resultId })), // every one beyond the first (which sits on the drop cell)
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
  const badge = `×${plan.count}`;
  return { cells: plan.pickedCells.concat([dropIdx]), badge, plan };
}

/** Plan a merge of an explicit set of identical cells (the magnet): every cell is consumed, `dropIdx` (one of them) gets the first result. */
export function planFromCells(board, cells, dropIdx, data) {
  const first = board.items[cells[0]];
  if (!first || cells.length < 3 || data.isMax(first.id)) return null;
  const seedId = first.id;
  const picked = cells.map(idx => ({ idx, item: board.items[idx], virtual: false }));
  const shimmerCount = picked.reduce((n, e) => n + (e.item.s ? 1 : 0), 0);
  const nextId = data.nextId(seedId);
  const resultId = shimmerCount >= 3 && !data.isMax(nextId) ? data.nextId(nextId) : nextId;
  const size = cells.length;
  return {
    seedId, size, picked, shimmerCount, resultId, count: size - 2,
    bonus: Array.from({ length: size - 3 }, () => ({ id: resultId })),
    pickedCells: cells.slice(), carriedUsed: false, sp: first.sp || picked.find(e => e.item.sp)?.item.sp || undefined
  };
}

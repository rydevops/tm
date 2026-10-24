"""Shared sprite cutting for the art sheet: panels, seam splitting of touching sprites, clean edges. Used by slice-art.py."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


class Sheet:
    def __init__(self, path):
        self.a = np.array(Image.open(path).convert('RGBA'))
        self.solid = self.a[..., 3] >= 200
        # nearest solid pixel: colour source for the faint edge pixels (sprite interiors are only ~80-95 % opaque in the sheet)
        _, (self.iy, self.ix) = ndi.distance_transform_edt(self.a[..., 3] < 200, return_indices=True)
        self.near = self.a[..., :3][self.iy, self.ix]

    def blob_at(self, x, y):
        """The mask of the sprite under (x, y), or just next to it."""
        if not hasattr(self, '_lab'):
            self._lab, _ = ndi.label(ndi.binary_dilation(self.solid, iterations=2))
        v = self._lab[y, x]
        for r in range(1, 8):
            if v:
                break
            win = self._lab[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1]
            vals = win[win > 0]
            v = np.bincount(vals).argmax() if vals.size else 0
        if not v:
            raise SystemExit(f'no sprite at {x},{y}')
        return self._lab == v

    def blobs(self, x0, x1, y0, y1, min_h=22, min_w=14):
        """Connected sprite blobs inside the rectangle, left to right: [(mask, (bx0, by0, bx1, by1))]."""
        m = np.zeros(self.solid.shape, bool)
        m[y0:y1, x0:x1] = self.solid[y0:y1, x0:x1]
        lab, n = ndi.label(ndi.binary_dilation(m, iterations=2))
        out = []
        for i, s in enumerate(ndi.find_objects(lab), 1):
            bx0, bx1, by0, by1 = s[1].start, s[1].stop, s[0].start, s[0].stop
            area = int((lab[s] == i).sum())
            if by1 - by0 < min_h or bx1 - bx0 < min_w or area < 250:
                continue
            out.append(((lab == i), (bx0, by0, bx1, by1)))
        out.sort(key=lambda b: b[1][0])
        return out

    def labels(self, x0, x1, y_top, y_bot):
        """Centres (x) of the small numbers printed under sprites, between y_top and y_bot, left to right."""
        m = np.zeros(self.solid.shape, bool)
        m[y_top:y_bot, x0:x1] = self.a[y_top:y_bot, x0:x1, 3] >= 120
        lab, _ = ndi.label(ndi.binary_dilation(m, iterations=1))
        cand = []
        for sl in ndi.find_objects(lab):
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if 7 <= h <= 24 and 2 <= w <= 24:
                cand.append(((sl[1].start + sl[1].stop) / 2, sl[0].start))
        if not cand:
            return []
        ys = sorted(c[1] for c in cand)
        mode = max(ys, key=lambda y: sum(abs(y - v) <= 2 for v in ys))       # the numbers of a row share one baseline
        xs = sorted(c[0] for c in cand if abs(c[1] - mode) <= 3)
        merged = []
        for x in xs:                                                         # a two-digit number is two blobs: keep one centre
            if merged and x - merged[-1][-1] < 9:
                merged[-1].append(x)
            else:
                merged.append([x])
        return [sum(g) / len(g) for g in merged]

    def split(self, mask, box, k, cuts_abs=None):
        """Cut one blob holding k touching sprites into k masks. Cut positions come from the numbers printed under the sprites
        (midway between neighbouring numbers) when exactly k of them sit under the blob; otherwise from the emptiest columns."""
        bx0, by0, bx1, by1 = box
        col = (mask & self.solid)[by0:by1, bx0:bx1].sum(0).astype(float)
        w = bx1 - bx0
        if cuts_abs is None:
            lab = [x for x in self.labels(bx0 - 14, bx1 + 14, by1 - 4, by1 + 42) if bx0 <= x <= bx1]
            cuts_abs = [(lab[j] + lab[j + 1]) / 2 for j in range(len(lab) - 1)] if len(lab) == k else None
        if cuts_abs is not None:
            cuts = [0] + [int(round(c - bx0)) for c in cuts_abs] + [w]
        else:
            cuts = [0]
            for j in range(1, k):
                c = w * j / k
                lo, hi = int(max(cuts[-1] + 6, c - w / k * 0.28)), int(min(w - 6, c + w / k * 0.28))
                seg = col[lo:hi + 1]
                cuts.append(lo + int(np.argmin(seg + 0.002 * np.abs(np.arange(lo, hi + 1) - c))))
            cuts.append(w)
        out = []
        for j in range(k):
            part = np.zeros_like(mask)
            part[by0:by1, bx0 + cuts[j]:bx0 + cuts[j + 1]] = mask[by0:by1, bx0 + cuts[j]:bx0 + cuts[j + 1]]
            out.append(part)
        return out

    def split_seeds(self, mask, seeds):
        """Cut one blob into one mask per seed. A seed is [x, y] (absolute) or a list of such points that belong to one sprite.
        Every pixel joins the seed it can reach most cheaply; walking through the thin parts of the blob costs more than through
        its fat middles, so touching sprites part at their narrow necks (diagonals and overlaps included)."""
        groups = [sd if isinstance(sd[0], (list, tuple)) else [sd] for sd in seeds]
        ys, xs = np.where(mask)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        m = mask[y0:y1, x0:x1]
        dist = ndi.distance_transform_edt(np.pad(m, 1))[1:-1, 1:-1]
        cost = 1 + 14 * (1 - dist / dist.max()) ** 2
        idx = -np.ones(m.shape, np.int64)
        idx[m] = np.arange(m.sum())
        H, W = m.shape
        rows, cols, w = [], [], []
        for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
            sa = (slice(0, H - dy), slice(0, W - dx) if dx >= 0 else slice(-dx, W))
            sb = (slice(dy, H), slice(dx, W) if dx >= 0 else slice(0, W + dx))
            ok = (idx[sa] >= 0) & (idx[sb] >= 0)
            rows.append(idx[sa][ok]); cols.append(idx[sb][ok]); w.append(np.hypot(dy, dx) * (cost[sa][ok] + cost[sb][ok]) / 2)
        from scipy.sparse import coo_matrix
        from scipy.sparse.csgraph import dijkstra
        r, c, ww = np.concatenate(rows), np.concatenate(cols), np.concatenate(w)
        g = coo_matrix((np.concatenate([ww, ww]), (np.concatenate([r, c]), np.concatenate([c, r]))), shape=(m.sum(), m.sum())).tocsr()
        src, owner = [], []
        for gi, pts in enumerate(groups):
            for x, y in pts:
                node = idx[int(y) - y0, int(x) - x0]
                if node < 0:                                        # nudge a seed that missed the blob to its nearest pixel
                    _, (iy, ix) = ndi.distance_transform_edt(~m, return_indices=True)
                    node = idx[iy[int(y) - y0, int(x) - x0], ix[int(y) - y0, int(x) - x0]]
                src.append(node); owner.append(gi)
        _, _, srcs = dijkstra(g, directed=False, indices=src, min_only=True, return_predecessors=True)
        owner_of = {n: o for n, o in zip(src, owner)}
        lab = np.array([owner_of.get(v, -1) for v in srcs])
        out = []
        for gi in range(len(groups)):
            part = np.zeros_like(mask)
            sub = np.zeros(m.shape, bool)
            sub[m] = lab == gi
            part[y0:y1, x0:x1] = sub
            out.append(part)
        return out

    def row(self, x0, x1, y0, y1, n, splits=None, merge=None):
        """The n sprites of one numbered row, left to right. splits={blob_index: parts}; merge=[[i, j], ...] joins pieces of one sprite."""
        bl = self.blobs(x0, x1, y0, y1)
        masks = []
        for i, (m, box) in enumerate(bl):
            k = (splits or {}).get(i, 1)
            if isinstance(k, (list, tuple)) and k and isinstance(k[0], (list, tuple)):   # one [x, y] seed per sprite
                masks += self.split_seeds(m, k)
            elif isinstance(k, (list, tuple)):             # explicit cut positions (absolute x) for a hard blob
                masks += self.split(m, box, len(k) + 1, list(k))
            else:
                masks += self.split(m, box, k) if k > 1 else [m]
        for grp in sorted(merge or [], key=lambda g: -g[0]):
            joined = np.logical_or.reduce([masks[i] for i in grp])
            for i in sorted(grp, reverse=True)[:-1]:
                masks.pop(i)
            masks[grp[0]] = joined
        masks.sort(key=lambda m: np.where(m.any(0))[0][0])
        if len(masks) != n:
            raise SystemExit(f'row {x0},{y0}: found {len(masks)} sprites, expected {n} (blobs: {[(b[1][0], b[1][2] - b[1][0]) for b in bl]})')
        return masks

    def cut(self, mask, opaque=False, pad=1):
        ys, xs = np.where(mask)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgb = np.where((self.a[..., 3] >= 150)[..., None], self.a[..., :3], self.near)
        al = np.clip((self.a[..., 3].astype(np.float32) - 40) / (215 - 40), 0, 1) * 255
        al = np.where(mask, 255 if opaque else al, 0)
        im = Image.fromarray(np.dstack([rgb, al]).astype(np.uint8)[y0:y1, x0:x1], 'RGBA')
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())      # trim to the visible pixels
        out = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
        out.paste(im, (pad, pad))
        return out


def frame(images, pad=2):
    """One shared frame (largest width and height); sprites centred and sitting on the bottom edge, so size differences are kept."""
    w = max(i.width for i in images) + 2 * pad
    h = max(i.height for i in images) + 2 * pad
    res = []
    for im in images:
        f = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        f.paste(im, ((w - im.width) // 2, h - pad - im.height))
        res.append(f)
    return res

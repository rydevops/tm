// The painted art from the art team's sheet (see art/README.md). It replaces the code-drawn vector art wherever the sheet has a
// sound counterpart; anything not listed here, or whose file fails to load, keeps its vector painter, so the game never shows a hole.
// The files are cut from docs/art/new-art-sheet.png by tools/slice-art.py.

const ITEM_FAMILIES = { chest: 5, amulet: 5 };            // whole families only: a ladder is never half new art and half vector

export const NEW_ART = {
  items: Object.fromEntries(Object.entries(ITEM_FAMILIES).flatMap(([fam, n]) => Array.from({ length: n }, (_, i) => { const id = `${fam}_${String(i + 1).padStart(2, '0')}`; return [id, `art/items/${id}.png`]; }))),
  icons: {
    gear: 'art/icons/gear.png', quest: 'art/icons/quest.png', map: 'art/icons/map.png', energy: 'art/icons/energy.png', heart: 'art/icons/heart.png', shop: 'art/icons/shop.png',
    coin: 'art/icons/coin.png', pearl: 'art/icons/pearl.png', chest: 'art/items/chest_03.png', amulet: 'art/items/amulet_03.png'
  },
  // scenery in the default palette only; the pink, snow, night and ash palettes keep their vector versions
  decor: { palm: ['art/decor/palm_b.png', 'art/decor/palm_a.png', 'art/decor/palm_b.png'], tree: ['art/decor/tree.png'], bush: ['art/decor/bush.png'], rock: ['art/decor/rock.png'] },
  decorFlip: { palm: [true, false, false] },               // the palm's three variants lean left, upright and right; the sheet has two palms, one is mirrored
  banner: 'art/splash-banner.png'
};

const images = new Map();                                   // path -> HTMLImageElement | null (failed)

function load(path) {
  if (images.has(path)) return Promise.resolve(images.get(path));
  return new Promise(resolve => {
    if (typeof Image === 'undefined') { images.set(path, null); resolve(null); return; }
    const im = new Image();
    im.onload = () => { images.set(path, im); resolve(im); };
    im.onerror = () => { console.warn('art missing, using vector art:', path); images.set(path, null); resolve(null); };
    im.src = path;
  });
}

/** Preload everything the game may draw. Never rejects; a file that fails to load just falls back to its vector painter. */
export async function loadNewArt() {
  const paths = new Set([...Object.values(NEW_ART.items), ...Object.values(NEW_ART.icons), ...Object.values(NEW_ART.decor).flat()]);
  await Promise.all([...paths].map(load));
}

const get = path => (path ? images.get(path) || null : null);
export const itemArt = id => get(NEW_ART.items[id]);
export const iconArt = name => get(NEW_ART.icons[name]);
export const decorArt = (kind, v = 0) => { const list = NEW_ART.decor[kind]; return list ? { img: get(list[v % list.length]), flip: !!NEW_ART.decorFlip[kind]?.[v % list.length] } : null; };

/**
 * Draw `img` as large as fits inside the box (bx, by, bw, bh) without distorting it, centred horizontally and sitting on the box's
 * bottom edge (or centred vertically with `middle`). The sheet's sprites are small, so smoothing is set to high-quality.
 */
export function drawFit(ctx, img, bx, by, bw, bh, { middle = false, flip = false } = {}) {
  const k = Math.min(bw / img.width, bh / img.height), w = img.width * k, h = img.height * k, x = bx + (bw - w) / 2, y = middle ? by + (bh - h) / 2 : by + bh - h;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); } else ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

#!/usr/bin/env python3
"""Cuts the new-art sprite sheet into the individual PNGs the game loads.

    python3 tools/slice-art.py            (needs: pillow, numpy, scipy)

Input : docs/art/new-art-sheet.png   (the art team's sheet, 1536 x 1024, RGBA)
Output: art/items/*.png, art/icons/*.png, art/decor/*.png, art/splash-banner.png and the five app icons in icons/.

Each sprite is picked by a seed point (x, y) inside it on the sheet. Its pixels are the connected blob of opaque pixels under
that point, so neighbouring sprites, the row labels and the faint haze around everything never come along. Edges are cleaned
(haze alpha removed, colour fringes replaced by the nearest solid colour) and the result is trimmed to the sprite.

Sprites of one family (a chest ladder, an amulet ladder) share one frame size and sit on its bottom edge, so a bigger sprite
stays bigger in the game. js/view/new-art.js lists what the game loads.
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SHEET = os.path.join(ROOT, 'docs/art/new-art-sheet.png')

# name -> (seed x, seed y) on the sheet. Families map in sheet order to levels 1..5.
ITEMS = {
    'chest': [(34, 357), (81, 354), (135, 353), (194, 348), (249, 347)],
    'amulet': [(804, 357), (855, 356), (904, 356), (949, 356), (991, 355)],
}
ICONS = {
    'gear': (40, 976), 'quest': (167, 976), 'map': (227, 976), 'energy': (363, 977), 'heart': (429, 976), 'shop': (498, 978),
    'coin': (1068, 248), 'pearl': (1350, 251),
}
DECOR = {'tree': (147, 577), 'bush': (724, 828), 'palm_a': (589, 822), 'palm_b': (666, 819), 'rock': (788, 822)}
BANNER = (1227, 954)
APP_ICON = (831, 983)


def load():
    a = np.array(Image.open(SHEET).convert('RGBA'))
    solid = a[..., 3] >= 200
    lab, _ = ndi.label(ndi.binary_dilation(solid, iterations=2))   # sprites are separated by gaps wider than 4 px
    # nearest solid pixel, used to repaint the colour of the faint edge pixels (sprite interiors are only ~80-95 % opaque in the sheet)
    _, (iy, ix) = ndi.distance_transform_edt(a[..., 3] < 200, return_indices=True)
    return a, lab, iy, ix


def blob_at(lab, x, y):
    v = lab[y, x]
    if v:
        return v
    for r in range(1, 8):                                          # a seed that landed on a gap: look nearby
        win = lab[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1]
        vals = win[win > 0]
        if vals.size:
            return np.bincount(vals).argmax()
    raise SystemExit(f'no sprite at {x},{y}')


def cut(sheet, seed, opaque=False):
    a, lab, iy, ix = sheet
    region = lab == blob_at(lab, *seed)
    ys, xs = np.where(region)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    near = a[..., :3][iy, ix]                                      # colour of the nearest solid pixel
    solid_rgb = np.where((a[..., 3] >= 150)[..., None], a[..., :3], near)  # only the faint edge pixels (alpha < 150) take it
    al = a[..., 3].astype(np.float32)
    al = np.clip((al - 40) / (215 - 40), 0, 1) * 255               # drops the faint haze, keeps a soft antialiased edge
    al = np.where(region, al, 0)
    if opaque:
        al = np.where(region, 255, 0)
    out = np.dstack([solid_rgb, al]).astype(np.uint8)[y0:y1, x0:x1]
    im = Image.fromarray(out, 'RGBA')
    return trim(im)


def trim(im, pad=1):
    bbox = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bbox)
    out = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    out.paste(im, (pad, pad))
    return out


def frame(images, pad=2):
    """Put every sprite in one frame (the largest width and height), centred and sitting on the bottom edge."""
    w = max(i.width for i in images) + 2 * pad
    h = max(i.height for i in images) + 2 * pad
    res = []
    for im in images:
        f = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        f.paste(im, ((w - im.width) // 2, h - pad - im.height))
        res.append(f)
    return res


def save(im, rel):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)
    print(f'{rel:36s} {im.width}x{im.height}')


def app_icons(sheet):
    """The sheet's app icon is 74 px, so the big sizes are upscaled (soft). Corners are filled for the iOS and maskable variants."""
    a, lab, iy, ix = sheet
    ic = cut(sheet, APP_ICON)
    for size, name in ((512, 'icon-512.png'), (192, 'icon-192.png'), (32, 'favicon-32.png')):
        save(ic.resize((size, size), Image.LANCZOS), f'icons/{name}')
    bleed = Image.new('RGBA', ic.size, (0, 0, 0, 255))              # full-bleed copy: transparent corners take the nearest edge colour
    arr = np.array(ic)
    solid = arr[..., 3] >= 200
    _, (yy, xx) = ndi.distance_transform_edt(~solid, return_indices=True)
    arr[..., :3] = arr[..., :3][yy, xx]
    arr[..., 3] = 255
    bleed = Image.fromarray(arr, 'RGBA')
    save(bleed.resize((180, 180), Image.LANCZOS), 'icons/apple-touch-icon.png')
    wash = bleed.resize((512, 512), Image.LANCZOS).filter(ImageFilter.GaussianBlur(40))
    inner = ic.resize((400, 400), Image.LANCZOS)                    # artwork inside the central 80 % safe zone
    wash.alpha_composite(inner, (56, 56))
    save(wash, 'icons/icon-maskable-512.png')


def main():
    sheet = load()
    for fam, seeds in ITEMS.items():
        for n, im in enumerate(frame([cut(sheet, s) for s in seeds]), 1):
            save(im, f'art/items/{fam}_{n:02d}.png')
    for name, seed in ICONS.items():
        save(cut(sheet, seed), f'art/icons/{name}.png')
    for name, seed in DECOR.items():
        save(cut(sheet, seed), f'art/decor/{name}.png')
    save(cut(sheet, BANNER, opaque=False), 'art/splash-banner.png')
    app_icons(sheet)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Cuts the art sheets into the individual PNGs the game loads, and writes art/manifest.json.

    python3 tools/slice-art.py            (needs: pillow, numpy, scipy)

Inputs : docs/art/new-art-sheet.png      first sheet: chests, amulets, UI icons, scenery, title banner, app icon (picked by seed point)
         docs/art/new-art-sheet-v3.png   latest sheet: the item ladders described in tools/art-ladders.json (picked by row)
Outputs: art/items/<item id>.png, art/icons/*.png, art/decor/*.png, art/splash-banner.png, the five app icons in icons/,
         art/manifest.json (item id -> file; the game preloads exactly these)

Edges are cleaned (haze alpha removed, colour fringes repainted) and each sprite is trimmed. Sprites of one family share a frame
and sit on its bottom edge, so a bigger sprite stays bigger in the game. Touching sprites are split using the numbers printed
under them (see tools/artcut.py).
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
from artcut import Sheet, frame  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SHEET1 = os.path.join(ROOT, 'docs/art/new-art-sheet.png')
SHEET3 = os.path.join(ROOT, 'docs/art/new-art-sheet-v3.png')
LADDERS = os.path.join(ROOT, 'tools/art-ladders.json')

# sheet 1: name -> (seed x, seed y). Families map in sheet order to levels 1..5.
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


def save(im, rel):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)
    print(f'{rel:36s} {im.width}x{im.height}')


def app_icons(sheet):
    """The sheet's app icon is 74 px, so the big sizes are upscaled (soft). Corners are filled for the iOS and maskable variants."""
    ic = sheet.cut(sheet.blob_at(*APP_ICON))
    for size, name in ((512, 'icon-512.png'), (192, 'icon-192.png'), (32, 'favicon-32.png')):
        save(ic.resize((size, size), Image.LANCZOS), f'icons/{name}')
    arr = np.array(ic)
    _, (yy, xx) = ndi.distance_transform_edt(~(arr[..., 3] >= 200), return_indices=True)
    arr[..., :3] = arr[..., :3][yy, xx]
    arr[..., 3] = 255
    bleed = Image.fromarray(arr, 'RGBA')                           # full-bleed copy: transparent corners take the nearest edge colour
    save(bleed.resize((180, 180), Image.LANCZOS), 'icons/apple-touch-icon.png')
    wash = bleed.resize((512, 512), Image.LANCZOS).filter(ImageFilter.GaussianBlur(40))
    wash.alpha_composite(ic.resize((400, 400), Image.LANCZOS), (56, 56))   # artwork inside the central 80 % safe zone
    save(wash, 'icons/icon-maskable-512.png')


def main():
    manifest = {}
    s1 = Sheet(SHEET1)
    for fam, seeds in ITEMS.items():
        for n, im in enumerate(frame([s1.cut(s1.blob_at(*sd)) for sd in seeds]), 1):
            save(im, f'art/items/{fam}_{n:02d}.png')
            manifest[f'{fam}_{n:02d}'] = f'art/items/{fam}_{n:02d}.png'
    for name, seed in ICONS.items():
        save(s1.cut(s1.blob_at(*seed)), f'art/icons/{name}.png')
    for name, seed in DECOR.items():
        save(s1.cut(s1.blob_at(*seed)), f'art/decor/{name}.png')
    save(s1.cut(s1.blob_at(*BANNER)), 'art/splash-banner.png')
    app_icons(s1)

    # latest sheet: the item ladders. The level names, order and old-to-new level maps live in tools/art-ladders.json.
    s3 = Sheet(SHEET3)
    for fam, spec in json.load(open(LADDERS)).items():
        a = spec['art']
        x0, x1, y0, y1 = a['rect']
        masks = s3.row(x0, x1, y0, y1, a['n'], {int(k): v for k, v in (a.get('splits') or {}).items()}, a.get('merge'))
        assert len(masks) == len(spec['levels']), fam
        for n, im in enumerate(frame([s3.cut(m) for m in masks]), 1):
            save(im, f'art/items/{fam}_{n:02d}.png')
            manifest[f'{fam}_{n:02d}'] = f'art/items/{fam}_{n:02d}.png'
    with open(os.path.join(ROOT, 'art/manifest.json'), 'w') as f:
        json.dump({'items': manifest}, f, indent=0, sort_keys=True)
        f.write('\n')
    print(f'art/manifest.json: {len(manifest)} items')


if __name__ == '__main__':
    main()

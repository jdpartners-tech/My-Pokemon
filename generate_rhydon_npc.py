"""Generate Rhydon overworld NPC sprites (front/back/left/right) at 20x20px."""
from PIL import Image
import os, struct

BASE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(BASE, 'public', 'sprites', 'pokemon-npc', 'rhydon')
os.makedirs(OUT, exist_ok=True)

# Colours  (R, G, B, A)
T  = (  0,   0,   0,   0)   # transparent
BK = ( 40,  32,  28, 255)   # outline / dark
BG = (112, 104,  96, 255)   # body grey (main)
MG = (144, 136, 128, 255)   # mid grey (lighter)
LG = (176, 168, 160, 255)   # light grey (belly / highlight)
HN = (208, 192, 152, 255)   # horn / cream
EY = ( 30,  22,  18, 255)   # eye dark

W = 20
H = 20

def make(grid):
    img = Image.new('RGBA', (W, H), T)
    pix = img.load()
    for y, row in enumerate(grid):
        for x, c in enumerate(row):
            pix[x, y] = c
    return img

# ── FRONT ──────────────────────────────────────────────────────────────────
front = [
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  HN, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  HN, HN, HN, T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  BK, BG, HN, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BG, EY, BG, BG, EY, BG, BK, T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BG, BG, LG, LG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, MG, BG, BG, BG, BG, BG, BG, MG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  BK, MG, BG, LG, LG, LG, LG, LG, BG, BG, MG, BK, T,  T,  T,  T,  T],
    [T,  T,  T,  BK, MG, BG, LG, LG, LG, LG, LG, BG, BG, MG, BK, T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BK, BG, BG, BG, BG, BK, BK, T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, T,  BK, T,  T,  BK, T,  BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, T,  T,  T,  T,  T,  T,  BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BK, T,  T,  T,  T,  BK, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BK, T,  T,  T,  T,  BK, BK, T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

# ── BACK ───────────────────────────────────────────────────────────────────
back = [
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  BK, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, LG, LG, LG, LG, BG, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, MG, MG, MG, MG, MG, MG, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T],
    [T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T],
    [T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, BG, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BK, MG, MG, MG, MG, BK, BK, T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, T,  BK, T,  T,  BK, T,  BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, T,  T,  T,  T,  T,  T,  BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BK, T,  T,  T,  T,  BK, BG, BK, T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BK, T,  T,  T,  T,  BK, BK, T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

# ── LEFT ───────────────────────────────────────────────────────────────────
left = [
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  HN, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  HN, HN, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  BK, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, EY, BG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, LG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  BK, MG, BG, BG, BG, BG, MG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  BK, BG, BG, LG, LG, LG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  BK, BG, BG, LG, LG, LG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  BK, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  BK, BG, BG, BG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BG, BG, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  BK, BG, BK, T,  BK, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  BK, BG, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  BK, BG, BK, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  BK, BK, T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

# ── RIGHT (mirror of left) ──────────────────────────────────────────────────
def mirror_h(grid):
    return [list(reversed(row)) for row in grid]

right = mirror_h(left)

# Save all four
for name, grid in [('front', front), ('back', back), ('left', left), ('right', right)]:
    img = make(grid)
    path = os.path.join(OUT, f'{name}.png')
    img.save(path)
    print(f'  Saved {path}')

print('Done. Preview:')
# Quick terminal preview of front
for row in front:
    print(''.join('██' if c != T else '  ' for c in row))

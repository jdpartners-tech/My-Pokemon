"""
Remove white/near-white backgrounds from NPC portrait PNGs using flood-fill from corners.
Run once; saves PNGs in-place with alpha transparency.
"""
from PIL import Image
import os

BASE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(BASE, 'public')

PORTRAITS = [
    'npc/haunter-full.png',
    'npc/youngster-full.png',
    'npc/grimer-full.png',
    'npc/pichu-full.png',
    'npc/npc-male-full.png',
    'npc/monk-full.png',
    'npc/team-rocket-1-full.png',
    'npc/team-rocket-2-full.png',
    'npc/cap-full.png',
    'npc/black-rocket-full.png',
    'npc/dark-trainer-full.png',
]

def remove_bg(path, threshold=40):
    img = Image.open(path).convert('RGBA')
    data = img.load()
    W, H = img.size

    # Collect seed pixels from all four corners (3x3 region each)
    seeds = []
    for cy, cx in [(0,0),(0,W-1),(H-1,0),(H-1,W-1)]:
        for dy in range(min(3, H)):
            for dx in range(min(3, W)):
                r, g, b, a = data[cx + (dx if cx==0 else -dx), cy + (dy if cy==0 else -dy)]
                if a > 10:  # not already transparent
                    seeds.append((cx + (dx if cx==0 else -dx), cy + (dy if cy==0 else -dy)))

    if not seeds:
        print(f'  SKIP (already transparent): {os.path.basename(path)}')
        return

    # Pick reference color from top-left corner
    ref = data[0, 0]
    ref_r, ref_g, ref_b = ref[0], ref[1], ref[2]

    visited = set()
    queue = list(set(seeds))

    while queue:
        x, y = queue.pop()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        r, g, b, a = data[x, y]
        if a == 0:
            continue
        diff = abs(int(r) - ref_r) + abs(int(g) - ref_g) + abs(int(b) - ref_b)
        if diff > threshold:
            continue
        data[x, y] = (r, g, b, 0)
        for nx, ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in visited:
                queue.append((nx, ny))

    img.save(path)
    print(f'  OK: {os.path.basename(path)}')

print('Removing white backgrounds from NPC portraits...')
for rel in PORTRAITS:
    p = os.path.join(PUBLIC, rel)
    if os.path.exists(p):
        remove_bg(p)
    else:
        print(f'  MISSING: {rel}')
print('Done!')

"""
Generate bike rider sprites.
- Canvas = original character size + 1px height (barely any extension)
- Side view:  V-frame, radius-2 wheels moved up into the leg area
- Front/back: ONE centred wheel (head-on, slightly oval), handlebars, stem
"""
from PIL import Image
import os, math

BASE = os.path.dirname(os.path.abspath(__file__))

TIRE   = (20,  20,  20,  255)
FRAME  = (200, 40,  40,  255)
SEAT_C = (55,  35,  10,  255)
HANDLE = (80,  80,  80,  255)
SPOKE  = (140, 110, 60,  255)

def bresenham(pix, W, H, x0, y0, x1, y1, color):
    dx = abs(x1-x0); dy = abs(y1-y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    while True:
        if 0 <= x0 < W and 0 <= y0 < H:
            pix[x0, y0] = color
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy: err -= dy; x0 += sx
        if e2 <  dx: err += dx; y0 += sy

def filled_oval(pix, W, H, cx, cy, rx, ry, color, hub_color=None, x_min=1, x_max=None):
    if x_max is None:
        x_max = W - 2
    for dx in range(-rx - 1, rx + 2):
        for dy in range(-ry - 1, ry + 2):
            d = math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
            x, y = cx + dx, cy + dy
            if x_min <= x <= x_max and 0 <= y < H:
                if d <= 1.05:
                    c = hub_color if (hub_color and d < 0.35) else color
                    pix[x, y] = c

def circle_outline(pix, W, H, cx, cy, r, color, x_min=1, x_max=None):
    if x_max is None:
        x_max = W - 2
    for dx in range(-r - 1, r + 2):
        for dy in range(-r - 1, r + 2):
            d = math.sqrt(dx * dx + dy * dy)
            if r - 0.8 < d < r + 0.6:
                x, y = cx + dx, cy + dy
                if x_min <= x <= x_max and 0 <= y < H:
                    pix[x, y] = color

def make_bike_sprite(char_path, out_path, direction):
    char = Image.open(char_path).convert('RGBA')
    cw, ch = char.size

    W = cw
    H = ch + 2     # small extension so the r=3 wheel bottom is visible

    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.paste(char, (0, 0), char)          # character first
    pix = canvas.load()

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            pix[x, y] = c

    def line(x0, y0, x1, y1, c):
        bresenham(pix, W, H, x0, y0, x1, y1, c)

    # Wheels sit inside the character's lower leg/feet zone (3 px above original bottom)
    wy     = ch - 3    # wheel centre y  (inside leg area)
    wr     = 2         # wheel radius for side view
    seat_y = ch - 9    # hip/waist level

    if direction in ('left', 'right'):
        # ── Side view: V-frame, two small wheels ─────────────────────────────
        # margin=3 keeps radius-3 wheels clear of the canvas edge (x_min=1 clip)
        margin = 3
        wr     = 3   # r=3 → 7×7 wheel, large enough to look visibly round
        if direction == 'left':
            fw_x = margin
            bw_x = W - margin - 1
        else:
            fw_x = W - margin - 1
            bw_x = margin

        # Wheel = circular rim + 2-px cross spokes + hub
        for cx_, cy_ in [(fw_x, wy), (bw_x, wy)]:
            circle_outline(pix, W, H, cx_, cy_, wr, TIRE)   # rim
            for i in range(1, wr):                           # spokes
                put(cx_,     cy_ - i, SPOKE)
                put(cx_,     cy_ + i, SPOKE)
                put(cx_ - i, cy_,     SPOKE)
                put(cx_ + i, cy_,     SPOKE)
            put(cx_, cy_, SPOKE)                             # hub

        # V-frame: each wheel up to a central apex, then seat stay
        apex_x = (fw_x + bw_x) // 2
        apex_y = seat_y + 4

        line(bw_x, wy, apex_x, apex_y, FRAME)
        line(fw_x, wy, apex_x, apex_y, FRAME)
        line(apex_x, apex_y, bw_x, seat_y + 1, FRAME)   # seat stay

        # Seat bar (brown, 3 px wide)
        for sx in range(bw_x - 1, bw_x + 2):
            put(sx, seat_y,     SEAT_C)
            put(sx, seat_y + 1, SEAT_C)

        # Handlebars
        ht_y = seat_y + 2
        for hx in range(fw_x - 1, fw_x + 2):
            put(hx, ht_y, HANDLE)

    else:
        # ── Front / back view: ONE centred wheel, head-on ────────────────────
        # rx=2 → wheel only 5 px wide; a 1-px centering error is imperceptible
        cx  = W // 2
        wcy = wy

        # Filled circle + rim outline so it still looks like a wheel
        filled_oval(pix, W, H, cx, wcy, 2, 2, TIRE, SPOKE)
        circle_outline(pix, W, H, cx, wcy, 2, TIRE)

        # Fork/stem
        line(cx, wcy - 2, cx, seat_y + 3, FRAME)

        # Handlebars — tight to match wheel width
        for hx in range(cx - 2, cx + 3):
            put(hx, seat_y + 1, HANDLE)
        put(cx - 2, seat_y + 2, HANDLE)
        put(cx + 2, seat_y + 2, HANDLE)

        # Seat
        for sx in range(cx - 1, cx + 2):
            put(sx, seat_y, SEAT_C)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path)
    print(f"  {os.path.basename(out_path)}")


def generate(gender, src_dir, src_files, dst_dir):
    print(f"\n{gender} biker sprites -> {dst_dir}")
    for src_name, dst_name, direction in src_files:
        src = os.path.join(BASE, src_dir, src_name)
        dst = os.path.join(BASE, "NPC Characters", dst_dir, dst_name)
        make_bike_sprite(src, dst, direction)


generate("Male", "Male Characters", [
    ("Male Character - Look at the front.png", "Male_Biker - Look at the front.png", "front"),
    ("Male Character - Look at the back.png",  "Male_Biker - Look at the back.png",  "back"),
    ("Male Character - Look at the left.png",  "Male_Biker - Look at the left.png",  "left"),
    ("Male Character - Look at the right.png", "Male_Biker - Look at the right.png", "right"),
], "Male_Biker")

generate("Female", "Female Characters", [
    ("Female Character - Look at the front.png", "Female_Biker - Look at the front.png", "front"),
    ("Female Character - Look at the back.png",  "Female_Biker - Look at the back.png",  "back"),
    ("Female Character - Look at the left.png",  "Female_Biker - Look at the left.png",  "left"),
    ("Female Character - Look at the right.png", "Female_Biker - Look at the right.png", "right"),
], "Female_Biker")

print("\nDone!")

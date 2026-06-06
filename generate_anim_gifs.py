"""
Generate animated GIF previews of the 3 battle move animation styles.
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "anim_previews")
os.makedirs(OUT, exist_ok=True)

W, H = 320, 180
SKY_H = 120   # battlefield height
GROUND_H = H - SKY_H

# ── colours ──────────────────────────────────────────────────────────────────
SKY_TOP   = (100, 160, 230)
SKY_BOT   = (160, 210, 255)
GRASS_TOP = (60,  120,  60)
GRASS_BOT = (40,   90,  40)
HUD_BG    = (240, 235, 225)
HUD_LINE  = (40,   40,  30)

# Pokémon placeholder colours
PLAYER_COL = (200, 80, 40)   # Charmeleon-ish orange
OPP_COL    = (60, 100, 180)  # opponent blue

# Move type colour
FIRE_COL = (255, 100, 0)

# ── sprite positions ──────────────────────────────────────────────────────────
# Player: bottom-left area
PX, PY = 55, 60   # centre of player sprite
# Opponent: upper-right area
OX, OY = 230, 38  # centre of opponent sprite
SPR = 28           # sprite half-size

def draw_base(draw):
    """Draw the static battle background + HUD."""
    # Sky gradient (approximated with bands)
    for y in range(SKY_H):
        t = y / SKY_H
        r = int(SKY_TOP[0] + t*(SKY_BOT[0]-SKY_TOP[0]))
        g = int(SKY_TOP[1] + t*(SKY_BOT[1]-SKY_TOP[1]))
        b = int(SKY_TOP[2] + t*(SKY_BOT[2]-SKY_TOP[2]))
        draw.line([(0,y),(W,y)], fill=(r,g,b))
    # Ground
    for y in range(SKY_H, H):
        t = (y - SKY_H) / GROUND_H
        r = int(GRASS_TOP[0] + t*(GRASS_BOT[0]-GRASS_TOP[0]))
        g_c = int(GRASS_TOP[1] + t*(GRASS_BOT[1]-GRASS_TOP[1]))
        b = int(GRASS_TOP[2] + t*(GRASS_BOT[2]-GRASS_TOP[2]))
        draw.line([(0,y),(W,y)], fill=(r,g_c,b))
    # Platform under opponent (upper right)
    draw.ellipse([OX-32, OY+SPR-8, OX+32, OY+SPR+8], fill=(80,140,80))
    # Platform under player (lower left)
    draw.ellipse([PX-38, PY+SPR-8, PX+38, PY+SPR+10], fill=(60,110,60))

def draw_pokemon(draw, cx, cy, col, size=SPR, alive=True):
    """Draw a simple Pokemon-ish blob."""
    alpha = 255 if alive else 80
    c = col + (alpha,)
    # Body
    draw.ellipse([cx-size, cy-size, cx+size, cy+size], fill=col)
    # Eyes
    ew = max(2, size//5)
    draw.ellipse([cx-size//3-ew, cy-size//3-ew, cx-size//3+ew, cy-size//3+ew], fill=(255,255,255))
    draw.ellipse([cx+size//3-ew, cy-size//3-ew, cx+size//3+ew, cy-size//3+ew], fill=(255,255,255))
    draw.ellipse([cx-size//3, cy-size//3, cx-size//3+ew, cy-size//3+ew], fill=(30,30,30))
    draw.ellipse([cx+size//3, cy-size//3, cx+size//3+ew, cy-size//3+ew], fill=(30,30,30))

def draw_hud(draw, move_name):
    """Draw minimal HP bars + move label."""
    # Opponent HP bar (top-right)
    draw.rectangle([W-110, 5, W-10, 22], fill=HUD_BG, outline=HUD_LINE)
    draw.text((W-108, 6), "Foe HP", fill=HUD_LINE)
    draw.rectangle([W-80, 13, W-14, 18], fill=(220,80,80))
    draw.rectangle([W-80, 13, W-14-(W-80-W+14)//3, 18], fill=(80,200,80))
    # Player HP bar (bottom-left)
    draw.rectangle([10, H-30, 130, H-8], fill=HUD_BG, outline=HUD_LINE)
    draw.text((12, H-29), "HP", fill=HUD_LINE)
    draw.rectangle([35, H-22, 126, H-14], fill=(80,200,80))
    # Move name
    draw.rectangle([W//2-60, H-28, W//2+60, H-8], fill=HUD_BG, outline=HUD_LINE)
    draw.text((W//2-55, H-26), move_name, fill=FIRE_COL)

def lerp(a, b, t):
    return a + (b-a)*t

# ════════════════════════════════════════════════════════════════════════════
# OPTION A — Projectile Travel
# ════════════════════════════════════════════════════════════════════════════
def make_option_a():
    frames = []
    fps_ms = 60  # ms per frame

    # Phase 1: static (3 frames)
    for _ in range(3):
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 80))

    # Phase 2: player lurches forward (3 frames)
    for i in range(3):
        lurch = int(20 * (i/2))
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX+lurch, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 50))

    # Phase 3: fireball travels (10 frames)
    TRAIL_LEN = 4
    positions = []
    for i in range(10):
        t = i / 9
        # Arc trajectory: slight upward curve
        bx = lerp(PX+20, OX, t)
        by = lerp(PY-10, OY, t) - 18 * math.sin(t * math.pi)
        positions.append((bx, by))

    for i, (bx, by) in enumerate(positions):
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        # Draw trail
        for j in range(max(0, i-TRAIL_LEN), i):
            tx, ty = positions[j]
            alpha_f = (j - (i-TRAIL_LEN)) / TRAIL_LEN
            r_size = max(1, int(5 * alpha_f))
            bright = int(80 + 175*alpha_f)
            d.ellipse([tx-r_size, ty-r_size, tx+r_size, ty+r_size],
                      fill=(bright, int(bright*0.35), 0))
        # Draw fireball
        ball_r = 7
        d.ellipse([bx-ball_r, by-ball_r, bx+ball_r, by+ball_r], fill=(255,80,0))
        d.ellipse([bx-4, by-4, bx+4, by+4], fill=(255,220,0))
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 55))

    # Phase 4: lurch back + impact burst (6 frames)
    for i in range(6):
        p = i / 5
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        # Opponent flashes
        opp_col = (255,255,255) if i % 2 == 0 else OPP_COL
        draw_pokemon(d, OX, OY, opp_col)
        # Impact rings
        for ring in range(3):
            ring_r = int((12 + ring*14) * p)
            alpha = int(255 * (1-p) * (0.9 - ring*0.25))
            if ring_r > 0:
                d.ellipse([OX-ring_r, OY-ring_r, OX+ring_r, OY+ring_r],
                          outline=(255, int(80+ring*50), 0), width=2)
        # Spark particles
        for sp in range(8):
            angle = (sp/8)*2*math.pi
            dist = int(30*p)
            sx = int(OX + math.cos(angle)*dist)
            sy = int(OY + math.sin(angle)*dist)
            sz = max(1, int(3*(1-p)))
            d.ellipse([sx-sz, sy-sz, sx+sz, sy+sz], fill=(255,200,0))
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 65))

    # Phase 5: hold result (4 frames)
    for _ in range(4):
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 80))

    imgs = [f[0] for f in frames]
    durations = [f[1] for f in frames]
    imgs[0].save(os.path.join(OUT, "option_a_projectile.gif"),
                 save_all=True, append_images=imgs[1:],
                 duration=durations, loop=0)
    print("  option_a_projectile.gif")


# ════════════════════════════════════════════════════════════════════════════
# OPTION B — Full-Screen Flash
# ════════════════════════════════════════════════════════════════════════════
def make_option_b():
    frames = []

    # Phase 1: static
    for _ in range(3):
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 80))

    # Phase 2: flash intensifies (5 frames)
    for i in range(5):
        t = i / 4
        alpha = int(180 * t)
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        # Overlay fire tint
        overlay = Image.new("RGBA", (W, SKY_H), (255, 60, 0, alpha))
        img.paste(Image.new("RGB", (W, SKY_H), (255, 60, 0)),
                  (0, 0),
                  overlay)
        d2 = ImageDraw.Draw(img)
        # Big fire icon text in centre
        icon_alpha = int(255 * t)
        icon_size = int(20 + 20*t)
        cx, cy = W//2, SKY_H//2
        for ring_r in [icon_size+5, icon_size+2, icon_size]:
            d2.ellipse([cx-ring_r, cy-ring_r, cx+ring_r, cy+ring_r],
                       fill=(255, 80, 0))
        d2.ellipse([cx-icon_size+5, cy-icon_size+5, cx+icon_size-5, cy+icon_size-5],
                   fill=(255, 200, 0))
        draw_hud(d2, "FIRE: Ember")
        frames.append((img, 50))

    # Phase 3: peak flash (2 frames)
    for _ in range(2):
        img = Image.new("RGB", (W, H), (255, 100, 0))
        d = ImageDraw.Draw(img)
        cx, cy = W//2, SKY_H//2
        d.ellipse([cx-30, cy-30, cx+30, cy+30], fill=(255, 240, 0))
        d.text((10, H-26), "FIRE: Ember", fill=(255,200,0))
        frames.append((img, 70))

    # Phase 4: fade out (6 frames)
    for i in range(6):
        t = 1 - i/5
        alpha = int(180 * t)
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        # Opponent flashes white on hit
        opp_col = (255,255,255) if i < 2 else OPP_COL
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, opp_col)
        if alpha > 0:
            overlay = Image.new("RGBA", (W, SKY_H), (255, 60, 0, alpha))
            img.paste(Image.new("RGB", (W, SKY_H), (255, 60, 0)),
                      (0, 0), overlay)
        d2 = ImageDraw.Draw(img)
        draw_hud(d2, "FIRE: Ember")
        frames.append((img, 55))

    # Phase 5: static
    for _ in range(3):
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 80))

    imgs = [f[0] for f in frames]
    durations = [f[1] for f in frames]
    imgs[0].save(os.path.join(OUT, "option_b_screenflash.gif"),
                 save_all=True, append_images=imgs[1:],
                 duration=durations, loop=0)
    print("  option_b_screenflash.gif")


# ════════════════════════════════════════════════════════════════════════════
# OPTION C — Projectile + Arena Tint
# ════════════════════════════════════════════════════════════════════════════
def make_option_c():
    frames = []

    # Phase 1: static
    for _ in range(3):
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 80))

    # Phase 2: player lurches
    for i in range(3):
        lurch = int(20 * (i/2))
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX+lurch, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 50))

    # Phase 3: projectile + building tint
    TRAIL_LEN = 4
    positions = []
    for i in range(10):
        t = i / 9
        bx = lerp(PX+20, OX, t)
        by = lerp(PY-10, OY, t) - 18 * math.sin(t * math.pi)
        positions.append((bx, by))

    for i, (bx, by) in enumerate(positions):
        tint_alpha = int(60 * (i/9))
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        # Subtle fire tint over arena
        if tint_alpha > 0:
            overlay = Image.new("RGBA", (W, SKY_H), (255, 80, 0, tint_alpha))
            img.paste(Image.new("RGB", (W, SKY_H), (255, 80, 0)), (0, 0), overlay)
        d2 = ImageDraw.Draw(img)
        draw_pokemon(d2, PX, PY, PLAYER_COL)
        draw_pokemon(d2, OX, OY, OPP_COL)
        # Trail
        for j in range(max(0, i-TRAIL_LEN), i):
            tx, ty = positions[j]
            alpha_f = (j - (i-TRAIL_LEN)) / TRAIL_LEN
            r_size = max(1, int(5 * alpha_f))
            bright = int(80 + 175*alpha_f)
            d2.ellipse([tx-r_size, ty-r_size, tx+r_size, ty+r_size],
                       fill=(bright, int(bright*0.35), 0))
        # Fireball
        ball_r = 7
        d2.ellipse([bx-ball_r, by-ball_r, bx+ball_r, by+ball_r], fill=(255,80,0))
        d2.ellipse([bx-4, by-4, bx+4, by+4], fill=(255,220,0))
        draw_hud(d2, "FIRE: Ember")
        frames.append((img, 55))

    # Phase 4: impact + tint fades
    for i in range(6):
        p = i / 5
        tint_alpha = int(60 * (1 - p))
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        if tint_alpha > 0:
            overlay = Image.new("RGBA", (W, SKY_H), (255, 80, 0, tint_alpha))
            img.paste(Image.new("RGB", (W, SKY_H), (255, 80, 0)), (0, 0), overlay)
        d2 = ImageDraw.Draw(img)
        draw_pokemon(d2, PX, PY, PLAYER_COL)
        opp_col = (255,255,255) if i % 2 == 0 else OPP_COL
        draw_pokemon(d2, OX, OY, opp_col)
        for ring in range(3):
            ring_r = int((12 + ring*14) * p)
            if ring_r > 0:
                d2.ellipse([OX-ring_r, OY-ring_r, OX+ring_r, OY+ring_r],
                           outline=(255, int(80+ring*50), 0), width=2)
        for sp in range(8):
            angle = (sp/8)*2*math.pi
            dist = int(30*p)
            sx = int(OX + math.cos(angle)*dist)
            sy = int(OY + math.sin(angle)*dist)
            sz = max(1, int(3*(1-p)))
            d2.ellipse([sx-sz, sy-sz, sx+sz, sy+sz], fill=(255,200,0))
        draw_hud(d2, "FIRE: Ember")
        frames.append((img, 65))

    # Phase 5: static
    for _ in range(4):
        img = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(img)
        draw_base(d)
        draw_pokemon(d, PX, PY, PLAYER_COL)
        draw_pokemon(d, OX, OY, OPP_COL)
        draw_hud(d, "FIRE: Ember")
        frames.append((img, 80))

    imgs = [f[0] for f in frames]
    durations = [f[1] for f in frames]
    imgs[0].save(os.path.join(OUT, "option_c_projectile_tint.gif"),
                 save_all=True, append_images=imgs[1:],
                 duration=durations, loop=0)
    print("  option_c_projectile_tint.gif")


print("Generating animation previews...")
make_option_a()
make_option_b()
make_option_c()
print(f"\nSaved to: {OUT}")

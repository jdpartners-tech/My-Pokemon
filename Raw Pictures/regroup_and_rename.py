"""
Phase 1 + 2: Regroup and rename cropped character sprites.

Sprite sheet: undefined - Imgur.png  (164×925, 10 cols × 57 rows of 16×16 tiles)
Layout:  4 rows per "batch" × 10 cols per batch = 10 characters per batch.
         Row 0 of batch = facing viewer (front)
         Row 1 of batch = facing away  (back)
         Row 2 of batch = facing left
         Row 3 of batch = facing right

Current folders: Character_001 .. Character_094  (4 poses each, sequential)
Issues the user flagged:
  - Some characters have only 2 unique poses (front+back), left+right tiles
    belong to a neighbouring character → these batches need splitting.
  - Some characters have 8 poses (span 2 consecutive batches) → those
    pair of folders need merging.

This script:
  1.  Crops every individual tile from the source sheet.
  2.  Applies the MERGE / SPLIT rules below.
  3.  Saves each character into  Regrouped Characters/<name>/
      with pose files named: front.png  back.png  left.png  right.png
      (extra walk-frames named  front_walk.png  etc.)
"""

import os, shutil
from PIL import Image

SRC   = r"C:\Users\derek\Documents\Project\My Pokemon\Raw Pictures\undefined - Imgur.png"
OLD   = r"C:\Users\derek\Documents\Project\My Pokemon\Cropped Characters"
OUT   = r"C:\Users\derek\Documents\Project\My Pokemon\Regrouped Characters"
TILE  = 16
COLS  = 10   # tiles per row in sheet

# ── Character name map ──────────────────────────────────────────────────────
# Keys are ORIGINAL Character_NNN numbers (1-based).
# Values are the friendly output folder names.
# Characters whose tiles form 8-pose pairs are listed under MERGES below.
CHARACTER_NAMES = {
    # Batch 0  (sheet rows 0-3)
    1:  "Scientist",
    2:  "Dark_Trainer_M",
    3:  "Youngster_Blonde",
    4:  "Lass",                     # game: row2/col3 → char4 left pose
    5:  "Fat_Trainer_M",
    6:  "Default_NPC",              # game: row1/col5 → char6 back pose
    7:  "Old_Man",
    8:  "Swimmer_Male_Teal",
    9:  "Camper_Kid",
    10: "Female_NPC_1",
    # Batch 1  (sheet rows 4-7)
    11: "Cool_Trainer_F_Orange",
    12: "Biker_Heavy",
    13: "Team_Rocket_Male",
    14: "Cooltrainer_Male_Visor",
    15: "Team_Rocket_Male_2",
    16: "Biker",                    # game: row4/col5 → char16 front pose
    17: "Sailor",
    18: "Dark_NPC_M",
    19: "Ghost_Blob_NPC",
    20: "Fat_NPC_Yellow",
    # Batch 2  (sheet rows 8-11)
    21: "Swimmer_Blue_M",
    22: "Pink_Female_NPC",
    23: "Psychic_Female",
    24: "Psychic_Purple_F",
    25: "Cool_Trainer_F_Brown",
    26: "Cool_Trainer_F_Checkered",
    27: "Psychic_Female_2",
    28: "Ghost_White_NPC",
    29: "Lass_Red",
    30: "Cool_Trainer_F_Red",
    # Batch 3  (sheet rows 12-15)
    31: "_merge_31",   # merged with 32 → Ash_Protagonist (see MERGES)
    32: "_merge_32",   # merged with 31 → Ash_Protagonist (see MERGES)
    33: "Fighter_Heavy_M",
    34: "Lass_Thin",
    35: "Nurse_Joy_or_Fat_F",
    36: "Fat_Brown_M",
    37: "Dog_NPC",
    38: "Lass_2",
    39: "Sumo_NPC",
    40: "Pale_NPC",
    # Batch 4  (sheet rows 16-19)
    41: "Cool_Trainer_Dark_M",
    42: "Dark_Trainer_M_2",
    43: "Bird_Pokemon",
    44: "Swimmer_Teal_M",
    45: "Biker_Dark",
    46: "Old_Man_Round",
    47: "Hiker_Tan_M",
    48: "Dark_Trainer_M_3",
    49: "Lass_Brown",
    50: "Sailor_Striped",
    # Batch 5  (sheet rows 20-23)
    51: "Dark_Trainer_M_4",
    52: "Cool_Trainer_F_Pink",
    53: "Old_Man_Fedora",
    54: "Old_Man_Dark_Hat",
    55: "Lass_Blonde",
    56: "Youngster_2",
    57: "Dark_Hair_Trainer_M",
    58: "Youngster_Cap",
    59: "White_Dress_F_NPC",
    60: "Gray_NPC",
    # Batch 6  (sheet rows 24-27)
    61: "Dark_Trainer_M_5",
    62: "Heavy_Pale_NPC",
    63: "Trainer_Brown_M",
    64: "Cool_Trainer_F_Auburn",
    65: "Team_Rocket_Male_3",
    66: "Cool_Trainer_F_PinkHair",
    67: "Cool_Trainer_F_PinkHair_2",
    68: "Police_Officer",
    69: "Team_Rocket_Male_4",
    70: "Dark_Hair_Trainer_M_2",
    # Batch 7  (sheet rows 28-31)
    71: "Youngster_Cap_2",
    72: "Lass_Orange",
    73: "Dark_Trainer_M_6",
    74: "Trainer_M",
    75: "Heavy_Black_Trainer",
    76: "Slim_Trainer_M",
    77: "Police_Officer_2",
    78: "Swimmer_Cyan_M",
    79: "Pikachu",
    80: "Raichu",
    # Batch 8  (sheet rows 32-35)
    81: "Grass_Pokemon",
    82: "Green_Lizard_Pokemon",
    83: "Clefairy",
    84: "Jigglypuff",
    85: "Cosplay_Pikachu",
    86: "Misty",
    87: "_split_87",   # handled by SPLITS rule above
    88: "Blue_Hair_Female",
    89: "Dog_Pokemon",
    90: "Bug_Pokemon",
    # Batch 9  (sheet rows 36-39, partial)
    91: "Purple_Pokemon",
    92: "Font_Tile_1",
    93: "Font_Tile_2",
    94: "Font_Tile_3",
}

# ── Merge rules (8-pose characters) ─────────────────────────────────────────
# Each entry: (primary_char_num, secondary_char_num, merged_name)
# All 8 tiles go into one folder; first-4 get pose names 0-3, next-4 get 4-7.
# (Leave empty if no confirmed merges yet — add after visual review.)
MERGES: list[tuple[int, int, str]] = [
    (31, 32, "Ash_Protagonist"),   # same red-cap character, idle + walk = 8 poses
]

# ── Split rules (2-pose characters sharing a 4-tile group) ──────────────────
# Each entry: (char_num, "A_name", "B_name")
# Tiles 0-1 → A_name,  tiles 2-3 → B_name
SPLITS: list[tuple[int, str, str]] = [
    (87, "Misty_Walk", "Blue_Round_Pokemon"),  # front+back = Misty walk; left+right = blue sphere Pokemon
]

POSE_NAMES_4 = ["Look at the front", "Look at the back", "Look at the left", "Look at the right"]
POSE_NAMES_8 = ["Look at the front", "Look at the back", "Look at the left", "Look at the right",
                "Look at the front (walk)", "Look at the back (walk)", "Look at the left (walk)", "Look at the right (walk)"]
SKIP_FONT    = {92, 93, 94}   # font tiles — not real characters

# ── Helpers ──────────────────────────────────────────────────────────────────
def char_folder(n: int) -> str:
    return os.path.join(OLD, f"Character_{n:03d}")

def get_tiles(char_num: int) -> list[Image.Image]:
    """Return the 4 pose images for an existing Character_NNN folder."""
    folder = char_folder(char_num)
    poses = ["Look at the front", "Look at the back", "Look at the left", "Look at the right"]
    tiles = []
    for p in poses:
        path = os.path.join(folder, f"Character_{char_num:03d} - {p}.png")
        if os.path.exists(path):
            tiles.append(Image.open(path).copy())
        else:
            tiles.append(Image.new("RGBA", (TILE, TILE), (0,0,0,0)))
    return tiles

def save_char(name: str, tiles: list[Image.Image], pose_names: list[str]) -> None:
    dest = os.path.join(OUT, name)
    os.makedirs(dest, exist_ok=True)
    for tile, pose in zip(tiles, pose_names):
        tile.save(os.path.join(dest, f"{name} - {pose}.png"))
    print(f"  OK  {name}  ({len(tiles)} poses)")

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    os.makedirs(OUT, exist_ok=True)

    merged_primary   = {m[0] for m in MERGES}
    merged_secondary = {m[1] for m in MERGES}
    split_nums       = {s[0] for s in SPLITS}

    # Process merges first
    for (primary, secondary, merged_name) in MERGES:
        tiles = get_tiles(primary) + get_tiles(secondary)
        save_char(merged_name, tiles, POSE_NAMES_8)

    # Process splits
    for (char_num, name_a, name_b) in SPLITS:
        tiles = get_tiles(char_num)
        save_char(name_a, tiles[:2], POSE_NAMES_4[:2])
        save_char(name_b, tiles[2:], POSE_NAMES_4[2:])

    # Process all remaining characters (4-pose, default grouping)
    for n in range(1, 95):
        if n in merged_primary or n in merged_secondary or n in split_nums:
            continue
        if n in SKIP_FONT:
            print(f"  –  Character_{n:03d} skipped (font tile)")
            continue
        name = CHARACTER_NAMES.get(n, f"Unknown_{n:03d}")
        if name.startswith("_"):
            continue
        if not os.path.isdir(char_folder(n)):
            print(f"  !  Character_{n:03d} folder missing — skipping")
            continue
        tiles = get_tiles(n)
        save_char(name, tiles, POSE_NAMES_4)

    print(f"\nDone -> {OUT}")
    print("Review MERGES and SPLITS lists for characters that may need further fixes.")

if __name__ == "__main__":
    main()

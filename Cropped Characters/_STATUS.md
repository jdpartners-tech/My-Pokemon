# Cropped Characters — WORK IN PROGRESS (do not trust groupings yet)

Source: `Raw Pictures/undefined - Imgur.png` (164x925 sprite sheet).

## Known issue
Each ROW of the sheet contains MULTIPLE characters, not one. The current
`Character_001..094` folders were split as blind groups-of-4 poses
(front/back/left/right). This is NOT verified — characters may have 4, 6, or 8
poses, and some folders may still merge two characters or split one.

## Correct approach (to finish later)
1. Generate per-row montages (script: see job tmp `montage.py`), each image < 2000px.
2. View montages one at a time; group adjacent cells into characters BY APPEARANCE
   (same hair/clothing colour across poses = same character).
3. Re-crop into named folders, pose names matching `Male Characters/` /
   `Female Characters/` convention (Look at the front/back/left/right [+ Running to ...]).

Palette-based auto-grouping was tried and FAILS: a character's back view has a
different visible colour palette than its front, so it over-splits.

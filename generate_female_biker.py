"""
Generate female biker sprites by diffing male biker vs base male character
and applying the bike-specific pixels onto the female character.
"""
from PIL import Image
import os

BASE = os.path.dirname(os.path.abspath(__file__))

# (direction, male_char_file, male_biker_file, female_char_file, female_biker_out)
DIRS = [
    ('front (idle)',
     'Male Characters/Male Character - Look at the front.png',
     'Male Characters/Male Character with Bicycle/Biker - Face to the front.png',
     'Female Characters/Female Character - Look at the front.png',
     'public/characters/Female Biker - Look at the front.png'),
    ('back (idle)',
     'Male Characters/Male Character - Look at the back.png',
     'Male Characters/Male Character with Bicycle/Biker - Face to the back.png',
     'Female Characters/Female Character - Look at the back.png',
     'public/characters/Female Biker - Look at the back.png'),
    ('left (idle)',
     'Male Characters/Male Character - Look at the left.png',
     'Male Characters/Male Character with Bicycle/Bike - Face to the left.png',
     'Female Characters/Female Character - Look at the left.png',
     'public/characters/Female Biker - Look at the left.png'),
    ('right (idle)',
     'Male Characters/Male Character - Look at the right.png',
     'Male Characters/Male Character with Bicycle/Bike - Face to the right.png',
     'Female Characters/Female Character - Look at the right.png',
     'public/characters/Female Biker - Look at the right.png'),
    ('front (riding)',
     'Male Characters/Male Character - Running to the front.png',
     'Male Characters/Male Character with Bicycle/Bike - Riding to the front.png',
     'Female Characters/Female Character - Run to the front.png',
     'public/characters/Female Biker - Riding to the front.png'),
    ('back (riding)',
     'Male Characters/Male Character - Running to the back.png',
     'Male Characters/Male Character with Bicycle/Bike - Riding to the back.png',
     'Female Characters/Female Character - Run to the back.png',
     'public/characters/Female Biker - Riding to the back.png'),
    ('left (riding)',
     'Male Characters/Male Character - Running to the left.png',
     'Male Characters/Male Character with Bicycle/Bike - Riding to the left.png',
     'Female Characters/Female Character - Run to the left.png',
     'public/characters/Female Biker - Riding to the left.png'),
    ('right (riding)',
     'Male Characters/Male Character - Running to the right.png',
     'Male Characters/Male Character with Bicycle/Bike - Riding to the right.png',
     'Female Characters/Female Character - Run to the right.png',
     'public/characters/Female Biker - Riding to the right.png'),
]

def generate(direction, male_char_path, male_biker_path, female_char_path, female_biker_out):
    male_char   = Image.open(os.path.join(BASE, male_char_path)).convert('RGBA')
    male_biker  = Image.open(os.path.join(BASE, male_biker_path)).convert('RGBA')
    female_char = Image.open(os.path.join(BASE, female_char_path)).convert('RGBA')

    cw, ch = male_char.size
    bw, bh = male_biker.size

    # Pad female char to match biker height if needed
    if bh > ch or bw > cw:
        padded = Image.new('RGBA', (max(cw, bw), max(ch, bh)), (0, 0, 0, 0))
        padded.paste(female_char, (0, 0))
        female_char = padded

    out = female_char.copy()
    out_pix = out.load()
    mc_pix  = male_char.load()
    mb_pix  = male_biker.load()

    W, H = out.size

    for x in range(min(bw, W)):
        for y in range(min(bh, H)):
            mb = mb_pix[x, y]
            mc = mc_pix[x, y] if x < cw and y < ch else (0, 0, 0, 0)

            # Pixels that differ meaningfully between male biker and male base = bike pixels
            diff = sum(abs(int(mb[i]) - int(mc[i])) for i in range(4))
            if diff > 30:
                out_pix[x, y] = mb

    out_path = os.path.join(BASE, female_biker_out)
    out.save(out_path)
    print(f"  {direction} -> {os.path.basename(female_biker_out)}")

print("Generating female biker sprites...")
for args in DIRS:
    generate(*args)
print("Done!")

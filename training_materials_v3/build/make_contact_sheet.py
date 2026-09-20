from pathlib import Path
from PIL import Image, ImageDraw
import math
import sys

source = Path(sys.argv[1])
output = Path(sys.argv[2])
files = sorted(source.glob("*.png"))
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
thumb_w, thumb_h = 360, 230
tiles = []
for path in files:
    image = Image.open(path).convert("RGB")
    image.thumbnail((thumb_w - 24, thumb_h - 42))
    tile = Image.new("RGB", (thumb_w, thumb_h), "white")
    tile.paste(image, ((thumb_w - image.width) // 2, 10))
    ImageDraw.Draw(tile).text((12, thumb_h - 24), path.stem, fill="#333333")
    tiles.append(tile)

rows = math.ceil(len(tiles) / cols)
sheet = Image.new("RGB", (cols * thumb_w, rows * thumb_h), "#D8D8D8")
for index, tile in enumerate(tiles):
    sheet.paste(tile, ((index % cols) * thumb_w, (index // cols) * thumb_h))
sheet.save(output)

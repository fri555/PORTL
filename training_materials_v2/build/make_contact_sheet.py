from PIL import Image, ImageOps, ImageDraw
from pathlib import Path
import sys, math

src=Path(sys.argv[1]); out=Path(sys.argv[2]); cols=int(sys.argv[3]) if len(sys.argv)>3 else 4
files=sorted(src.glob('page-*.png')) or sorted(src.glob('slide-*.png'))
thumbs=[]
for i,f in enumerate(files,1):
    im=Image.open(f).convert('RGB'); im.thumbnail((300,390))
    canvas=Image.new('RGB',(320,430),'white'); canvas.paste(im,((320-im.width)//2,20))
    ImageDraw.Draw(canvas).text((12,405),f'Page {i}',fill='black')
    thumbs.append(canvas)
rows=math.ceil(len(thumbs)/cols)
sheet=Image.new('RGB',(cols*320,rows*430),'#d9dde3')
for i,im in enumerate(thumbs): sheet.paste(im,((i%cols)*320,(i//cols)*430))
sheet.save(out)

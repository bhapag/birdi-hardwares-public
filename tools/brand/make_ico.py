"""favicon.ico (16, 32, 48) from the Chrome-rendered favicon PNGs, plus the root-level copies browsers ask for."""
import shutil
from PIL import Image

B = 'public/brand'
sizes = [16, 32, 48]
imgs = [Image.open(f'{B}/favicon-{s}.png').convert('RGBA') for s in sizes]
imgs[-1].save('public/favicon.ico', sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
shutil.copy(f'{B}/favicon.svg', 'public/favicon.svg')
for s in (48, 96, 192, 512):
    shutil.copy(f'{B}/favicon-{s}.png', f'public/favicon-{s}.png')
print('favicon.ico', Image.open('public/favicon.ico').info.get('sizes'))

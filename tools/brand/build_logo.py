"""Build the Birdi Hardwares identity as real vector paths, then the PNG/ICO exports.

Symbol: a door escutcheon plate with a lever and a keyhole, rebuilt as exact geometry from the selected Higgsfield
artwork (Recraft V4.1 vector, job bb69975f; concept GPT Image 2.5 job abae400f). Wordmark: Jost (SIL OFL, already the
site font) outlined to paths with fontTools, so the SVGs contain no text or embedded raster.

Usage: python tools/brand/build_logo.py   (writes public/brand/*.svg; then node tools/brand/export.mjs for PNGs)
"""
import io
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = os.path.join('public', 'brand')
os.makedirs(OUT, exist_ok=True)
ESPRESSO, BRASS, IVORY = '#2A1A10', '#A98550', '#EEE7DA'
FONT = os.path.join('node_modules', '@fontsource-variable', 'jost', 'files', 'jost-latin-wght-normal.woff2')

# ---------- symbol geometry (units from the selected artwork, 600 px render) ----------
X0, X1, Y0, Y1 = 233.0, 349.0, 72.0, 482.0          # plate
R = (X1 - X0) / 2                                      # fully rounded ends
CX = (X0 + X1) / 2
ROSE = (CX, 178.0, 23.0)                               # lever rose
KEY = (CX, 333.0, 21.0)                                # keyhole circle
SLOT = (11.5, 402.0)                                   # keyhole slot half-width, bottom (rounded)
LEVER = dict(x0=CX + 8, top0=170.5, bot0=185.5, x1=458.0, top1=163.0, bot1=195.0)  # widens toward the grip


def f(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.')


def plate_path():
    # rounded plate (outer, clockwise) + keyhole (inner): even-odd fill cuts the keyhole out
    outer = (f'M{f(X0)} {f(Y0 + R)}A{f(R)} {f(R)} 0 0 1 {f(X1)} {f(Y0 + R)}V{f(Y1 - R)}'
             f'A{f(R)} {f(R)} 0 0 1 {f(X0)} {f(Y1 - R)}Z')
    kx, ky, kr = KEY
    hw, bottom = SLOT
    # keyhole: circle on top of a slot with a round foot, as one outline
    import math
    a = math.asin(hw / kr)
    sx = kx - hw
    sy = ky + kr * math.cos(a)
    inner = (f'M{f(sx)} {f(sy)}A{f(kr)} {f(kr)} 0 1 1 {f(kx + hw)} {f(sy)}V{f(bottom - hw)}'
             f'A{f(hw)} {f(hw)} 0 0 1 {f(sx)} {f(bottom - hw)}Z')
    return outer + inner


def lever_path():
    L = LEVER
    rx, ry, rr = ROSE
    end_r = (L['bot1'] - L['top1']) / 2
    cy = (L['bot1'] + L['top1']) / 2
    # arm: from the rose to a rounded grip end
    arm = (f'M{f(L["x0"])} {f(L["top0"])}L{f(L["x1"])} {f(L["top1"])}'
           f'A{f(end_r)} {f(end_r)} 0 0 1 {f(L["x1"])} {f(L["bot1"])}L{f(L["x0"])} {f(L["bot0"])}Z')
    rose = f'M{f(rx - rr)} {f(ry)}A{f(rr)} {f(rr)} 0 1 1 {f(rx + rr)} {f(ry)}A{f(rr)} {f(rr)} 0 1 1 {f(rx - rr)} {f(ry)}Z'
    return arm + rose, end_r


LEVER_D, END_R = lever_path()
SX0, SY0 = X0, Y0
SW, SH = LEVER['x1'] + END_R - X0, Y1 - Y0             # symbol bounding box


def symbol_group(plate, lever, dx=0.0, dy=0.0, s=1.0):
    return (f'<g transform="translate({f(dx)} {f(dy)}) scale({f(s)}) translate({f(-SX0)} {f(-SY0)})">'
            f'<path fill="{plate}" fill-rule="evenodd" d="{plate_path()}"/>'
            f'<path fill="{lever}" fill-rule="nonzero" d="{LEVER_D}"/></g>')


# ---------- wordmark: Jost outlined ----------
def instance(weight):
    font = TTFont(FONT)
    return instantiateVariableFont(font, {'wght': weight}, inplace=False)


def text_path(text, weight, size, tracking_em, x, baseline):
    """Outline `text` at `size` px with letter spacing `tracking_em`; returns (path d, advance width)."""
    font = instance(weight)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upem = font['head'].unitsPerEm
    sc = size / upem
    pen = SVGPathPen(gs)
    cx = x
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (sc, 0, 0, -sc, cx, baseline))
        gs[g].draw(tp)
        cx += gs[g].width * sc + (tracking_em * size if i < len(text) - 1 else 0)
    return pen.getCommands(), cx - x


def cap_height(weight):
    return instance(weight)['OS/2'].sCapHeight / 1000


# Lockup: BIRDI over HARDWARES, both set to the same width; symbol as tall as the two lines.
TOP_W, BOT_W = 580, 360
top_size = 100.0
d_top, w_top = text_path('BIRDI', TOP_W, top_size, 0.11, 0, 0)
bot_size = 100.0
d_bot, w_bot = text_path('HARDWARES', BOT_W, bot_size, 0.22, 0, 0)
bot_size *= w_top / w_bot                               # match widths exactly
cap_top = cap_height(TOP_W) * top_size
cap_bot = cap_height(BOT_W) * bot_size
GAP = cap_top * 0.42
block_h = cap_top + GAP + cap_bot
SYM_H = block_h * 1.32                                 # mark a little taller than the text block
sym_s = SYM_H / SH
sym_w = SW * sym_s
PAD = 4
TX = PAD + sym_w + SYM_H * 0.16                        # text starts after the mark
text_top = PAD + (SYM_H - block_h) / 2


def wordmark(color, x=TX, y=text_top):
    d1, _ = text_path('BIRDI', TOP_W, top_size, 0.11, x, y + cap_top)
    d2, _ = text_path('HARDWARES', BOT_W, bot_size, 0.22, x, y + cap_top + GAP + cap_bot)
    return f'<path fill="{color}" d="{d1}"/><path fill="{color}" d="{d2}"/>'


LOGO_W = TX + w_top + PAD
LOGO_H = SYM_H + 2 * PAD


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{round(w)}" height="{round(h)}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')


def write(name, content):
    open(os.path.join(OUT, name), 'w', encoding='utf-8').write(content)


NAME = 'Birdi Hardwares'
sym = lambda plate, lever: symbol_group(plate, lever, PAD, PAD, sym_s)
write('birdi-logo-stacked.svg', svg(LOGO_W, LOGO_H, sym(ESPRESSO, BRASS) + wordmark(ESPRESSO), NAME))
write('birdi-logo-stacked-on-dark.svg', svg(LOGO_W, LOGO_H, sym(IVORY, BRASS) + wordmark(IVORY), NAME))
write('birdi-logo-stacked-mono.svg', svg(LOGO_W, LOGO_H, sym(ESPRESSO, ESPRESSO) + wordmark(ESPRESSO), NAME))
write('birdi-logo-stacked-mono-white.svg', svg(LOGO_W, LOGO_H, sym('#FFFFFF', '#FFFFFF') + wordmark('#FFFFFF'), NAME))

# one-line lockup (main horizontal logo, used in the header): mark, then BIRDI (semibold) HARDWARES (regular)
L_SIZE = 100.0
L_CAP = cap_height(560) * L_SIZE
L_SYM_H = L_CAP * 2.75
l_s = L_SYM_H / SH
L_TX = PAD + SW * l_s + L_SYM_H * 0.17
L_BASE = PAD + (L_SYM_H + L_CAP) / 2
d_a, w_a = text_path('BIRDI', 560, L_SIZE, 0.12, L_TX, L_BASE)
SPACE = L_SIZE * 0.42
d_b, w_b = text_path('HARDWARES', 400, L_SIZE, 0.12, L_TX + w_a + SPACE, L_BASE)
LINE_W = L_TX + w_a + SPACE + w_b + PAD
LINE_H = L_SYM_H + 2 * PAD
line = lambda plate, lever, ink: (symbol_group(plate, lever, PAD, PAD, l_s)
                                  + f'<path fill="{ink}" d="{d_a}"/><path fill="{ink}" d="{d_b}"/>')
write('birdi-logo-line.svg', svg(LINE_W, LINE_H, line(ESPRESSO, BRASS, ESPRESSO), NAME))
write('birdi-logo-line-on-dark.svg', svg(LINE_W, LINE_H, line(IVORY, BRASS, IVORY), NAME))
write('birdi-logo-line-mono.svg', svg(LINE_W, LINE_H, line(ESPRESSO, ESPRESSO, ESPRESSO), NAME))
print('line logo', round(LINE_W), 'x', round(LINE_H))

# compact symbol on a square canvas
SQ = max(SW, SH) * 1.1
sym_sq = lambda plate, lever: symbol_group(plate, lever, (SQ - SW) / 2, (SQ - SH) / 2, 1)
write('birdi-symbol.svg', svg(SQ, SQ, sym_sq(ESPRESSO, BRASS), NAME))
write('birdi-symbol-on-dark.svg', svg(SQ, SQ, sym_sq(IVORY, BRASS), NAME))
write('birdi-symbol-mono.svg', svg(SQ, SQ, sym_sq(ESPRESSO, ESPRESSO), NAME))

# favicon: its own bolder drawing of the same mark (plate, lever, keyhole) on an espresso tile. At 16 px the logo's
# slender plate would be under 4 px wide, so the plate is wider and the lever thicker; the tile keeps it visible on
# light and dark browser tabs.
T = 64
fav_plate = ('M11 20A12 12 0 0 1 35 20V44A12 12 0 0 1 11 44Z'          # plate 24 x 48, rounded ends
             'M21 37.4A3.6 3.6 0 1 1 25 37.4V43A2 2 0 0 1 21 43Z')  # small keyhole (even-odd cut)
fav_lever = ('M23 17.2L52.5 14.6A5 5 0 0 1 52.5 24.6L23 22.8Z'           # arm widening to a round grip
             'M17.2 20A5.8 5.8 0 1 1 28.8 20A5.8 5.8 0 1 1 17.2 20Z')  # rose
fav_body = (f'<rect width="{T}" height="{T}" rx="14" fill="{ESPRESSO}"/>'
            f'<path fill="{IVORY}" fill-rule="evenodd" d="{fav_plate}"/><path fill="{BRASS}" d="{fav_lever}"/>')
write('favicon.svg', svg(T, T, fav_body, NAME))
# the same drawing without the tile, for touch icons and the manifest's maskable icon backgrounds
write('birdi-favicon-mark.svg', svg(T, T, f'<path fill="{ESPRESSO}" fill-rule="evenodd" d="{fav_plate}"/><path fill="{BRASS}" d="{fav_lever}"/>', NAME))
print('logo', round(LOGO_W), 'x', round(LOGO_H), '| symbol', round(SW), 'x', round(SH))

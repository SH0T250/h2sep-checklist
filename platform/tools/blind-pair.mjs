// Build a genuine blind A/B comparison for the render-versus-photograph loop.
//
// Takes a render and a photograph of the same view, normalises them to the same
// size, and writes ONE composite image with the two panels labelled only A and B.
// Which panel holds the render is decided by a hash of the view name and the
// round number, so it is reproducible for us and not guessable by the critic.
// The answer key is written to a separate file that the critic never sees.
//
// The critic is then asked one question: which panel is the render, A or B?
// If it picks correctly, it can tell. If it cannot, the render passes.
//
// Usage:
//   node platform/tools/blind-pair.mjs --view=bed --render=/tmp/king/bed.png \
//        --photo=/tmp/demo-room/photo-09-f1f494cdf0.jpg --round=1 --out=/tmp/blind
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));

const view = args.view || 'view';
const round = String(args.round || '1');
const outDir = args.out || '/tmp/blind';
const render = args.render;
const photo = args.photo;

if (!render || !photo) { console.error('need --render and --photo'); process.exit(2); }
for (const [name, p] of [['render', render], ['photo', photo]]) {
  if (!existsSync(p)) { console.error(`${name} not found: ${p}`); process.exit(2); }
}
mkdirSync(outDir, { recursive: true });

// Hidden but reproducible: the render lands in panel A when this hash is even.
const h = createHash('sha256').update(`h2sep|${view}|${round}`).digest();
const renderIsA = (h[0] % 2) === 0;
const panelA = renderIsA ? render : photo;
const panelB = renderIsA ? photo : render;

const composite = `${outDir}/${view}-r${round}.png`;
const keyFile = `${outDir}/${view}-r${round}.key.json`;

// Both panels are letterboxed onto the same canvas so neither aspect ratio nor
// pixel size can give the answer away. Labels are drawn in a neutral band.
execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw, ImageFont
import sys
A, B, OUT = ${JSON.stringify(panelA)}, ${JSON.stringify(panelB)}, ${JSON.stringify(composite)}
PW, PH = 1000, 750           # panel box
BAND, GAP, PAD = 46, 16, 16  # label band, gap between panels, outer padding
BG = (24, 24, 26)

def fit(path):
    im = Image.open(path).convert('RGB')
    im.thumbnail((PW, PH), Image.LANCZOS)
    canvas = Image.new('RGB', (PW, PH), BG)
    canvas.paste(im, ((PW - im.width)//2, (PH - im.height)//2))
    return canvas

a, b = fit(A), fit(B)
W = PAD*2 + PW*2 + GAP
H = PAD*2 + BAND + PH
out = Image.new('RGB', (W, H), BG)
out.paste(a, (PAD, PAD + BAND))
out.paste(b, (PAD + PW + GAP, PAD + BAND))

d = ImageDraw.Draw(out)
try:
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
except Exception:
    f = ImageFont.load_default()
d.text((PAD + PW//2 - 14, PAD + 6), 'A', fill=(235,235,238), font=f)
d.text((PAD + PW + GAP + PW//2 - 14, PAD + 6), 'B', fill=(235,235,238), font=f)
out.save(OUT, 'PNG', optimize=True)
print(f'{W}x{H}')
`], { stdio: ['ignore', 'inherit', 'inherit'] });

writeFileSync(keyFile, JSON.stringify({
  view, round, renderPanel: renderIsA ? 'A' : 'B', photoPanel: renderIsA ? 'B' : 'A',
  render, photo, composite,
}, null, 1));

console.log(JSON.stringify({ composite, keyFile, view, round }));

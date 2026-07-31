#!/usr/bin/env python3
"""Inline the Vite dist into one self-contained HTML for the Claude artifact.

- CSS: inlined, with woff2 url(...) refs replaced by data: URIs
- JS: inlined as a module script
- Logos: every public/logos/*.png|svg exposed via window.__NEVIS_LOGOS__,
  and fetch of '/logos/x.png' is unnecessary because <img src> values are
  rewritten at runtime by a tiny shim that maps /logos/... -> data URI.
- Poster: nevis-waves.jpg -> window.__NEVIS_POSTER__ data URI.
"""
import base64, glob, json, os, re

ROOT = '/Users/bsabii/Documents/nevis-cif-prototype'
DIST = os.path.join(ROOT, 'dist')
OUT = '/private/tmp/claude-502/-Users-bsabii/389a1255-690b-4c0d-b1e7-cfd9b8271e8a/scratchpad/nevis-prototype.html'

def b64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()

css_path = glob.glob(os.path.join(DIST, 'assets', '*.css'))[0]
js_path = glob.glob(os.path.join(DIST, 'assets', '*.js'))[0]

css = open(css_path, encoding='utf-8').read()
# Inline woff2 fonts referenced from the css
for woff in glob.glob(os.path.join(DIST, 'assets', '*.woff2')):
    name = os.path.basename(woff)
    css = css.replace('/assets/' + name, 'data:font/woff2;base64,' + b64(woff))
    css = css.replace('./' + name, 'data:font/woff2;base64,' + b64(woff))

js = open(js_path, encoding='utf-8').read()

# model.js resolves logos via globalThis.__NEVIS_LOGOS__[slug] (slug = basename sans ext)
logos = {}
for p in sorted(glob.glob(os.path.join(ROOT, 'public', 'logos', '*'))):
    name = os.path.basename(p)
    slug = os.path.splitext(name)[0]
    mime = 'image/png' if name.endswith('.png') else 'image/svg+xml'
    logos[slug] = f'data:{mime};base64,' + b64(p)

poster_path = os.path.join(ROOT, 'public', 'nevis-waves.jpg')
poster = 'data:image/jpeg;base64,' + b64(poster_path) if os.path.exists(poster_path) else ''

shim = (
    'window.__NEVIS_LOGOS__ = ' + json.dumps(logos) + ';\n'
    'window.__NEVIS_POSTER__ = ' + json.dumps(poster) + ';\n'
)

html = f"""<title>Nevis — Your financial profile</title>
<style>{css}</style>
<div id="root"></div>
<script>{shim}</script>
<script type="module">{js}</script>
"""

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(OUT, len(html), 'bytes')

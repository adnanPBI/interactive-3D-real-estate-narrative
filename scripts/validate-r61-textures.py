#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MAGIC=b'\xABKTX 20\xBB\r\n\x1A\n'
parser=argparse.ArgumentParser(); parser.add_argument('--require-basis',action='store_true'); args=parser.parse_args()
p=ROOT/'public/textures/r6/manufacturing-line/materials/encoding-manifest.json'; m=json.loads(p.read_text())
errors=[]
if len(m.get('records',[]))!=24: errors.append('expected 24 encoded material maps')
for r in m.get('records',[]):
    f=ROOT/'public'/r['path'].lstrip('/'); data=f.read_bytes() if f.exists() else b''
    if data[:12]!=MAGIC: errors.append(f'{r["path"]}: not KTX2'); continue
    vk,_,w,h,_,_,_,levels,supercomp=struct.unpack_from('<9I',data,12)
    if levels<2: errors.append(f'{r["path"]}: missing offline mip chain')
    if args.require_basis and vk!=0: errors.append(f'{r["path"]}: release requires Basis Universal vkFormat=0')
    if args.require_basis and r.get('kind') in ('normal','orm') and '--assign_oetf linear' not in str(r.get('command','')): errors.append(f'{r["path"]}: data-map encoder command must explicitly assign linear transfer')
if args.require_basis and not m.get('releaseReadyBasis'): errors.append('encoding manifest is not Basis release-ready')

# Release mode also covers every legacy runtime texture, not only Manufacturing material maps.
if args.require_basis:
    runtime_root=ROOT/'public/textures/r6'
    all_ktx=sorted(runtime_root.rglob('*.ktx2'))
    if len(all_ktx)!=39: errors.append(f'release expects exactly 39 runtime KTX2 maps (24 Manufacturing material + 15 legacy), found {len(all_ktx)}')
    for f in all_ktx:
        data=f.read_bytes()
        if data[:12]!=MAGIC: errors.append(f'{f.relative_to(ROOT)}: not KTX2'); continue
        vk,_,_,_,_,_,_,levels,_=struct.unpack_from('<9I',data,12)
        if vk!=0: errors.append(f'{f.relative_to(ROOT)}: packaged runtime texture is not Basis Universal')
        if levels<2: errors.append(f'{f.relative_to(ROOT)}: packaged runtime texture lacks offline mip chain')

if errors: raise SystemExit('R6.1 texture FAIL:\n- '+'\n- '.join(errors))
mode='Basis release-ready' if m.get('releaseReadyBasis') else 'development RGBA8 mip fallback (release gate intentionally open)'
print(f'R6.1 texture PASS: 24 KTX2 maps, >=2 mip levels; mode={mode}')

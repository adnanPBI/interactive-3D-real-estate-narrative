#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,math,os,shutil,struct,subprocess
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets-source'/'r6'/'heroes'/'manufacturing-line'
OUT=ROOT/'public'/'textures'/'r6'/'manufacturing-line'/'materials'
KTX2_ID=b'\xABKTX 20\xBB\r\n\x1A\n'; VK_FORMAT_R8G8B8A8_UNORM=37; VK_FORMAT_R8G8B8A8_SRGB=43

def _dfd_rgba8(srgb: bool)->bytes:
    samples=[]
    for bit_offset,channel in [(0,0),(8,1),(16,2),(24,15)]: samples.append(struct.pack('<HBB4BII',bit_offset,7,channel,0,0,0,0,0,255))
    descriptor_block_size=24+len(samples)*16; total_size=4+descriptor_block_size
    header=struct.pack('<IHHHH8B8B',total_size,0,0,2,descriptor_block_size,1,1,2 if srgb else 1,0,0,0,0,0,4,0,0,0,0,0,0,0)
    return header+b''.join(samples)

def mip_chain(path: Path)->list[np.ndarray]:
    image=Image.open(path).convert('RGBA'); result=[np.asarray(image,dtype=np.uint8)]
    while image.width>1 or image.height>1:
        image=image.resize((max(1,image.width//2),max(1,image.height//2)),Image.Resampling.LANCZOS); result.append(np.asarray(image,dtype=np.uint8))
    return result

def write_development_ktx2(path: Path, source: Path, srgb: bool):
    levels=mip_chain(source); height,width,channels=levels[0].shape
    if channels!=4: raise RuntimeError(f'{source}: RGBA source expected')
    dfd=_dfd_rgba8(srgb); header_len=68; level_index_len=24*len(levels); dfd_offset=len(KTX2_ID)+header_len+level_index_len; kvd_offset=dfd_offset+len(dfd); cursor=(kvd_offset+3)//4*4; indices=[]; payload=bytearray()
    for level in levels:
        raw=level.tobytes(order='C'); absolute=cursor+len(payload); aligned=(absolute+3)//4*4
        if aligned>absolute: payload.extend(b'\x00'*(aligned-absolute))
        indices.append((aligned,len(raw),len(raw))); payload.extend(raw)
    header=struct.pack('<9I4I2Q',VK_FORMAT_R8G8B8A8_SRGB if srgb else VK_FORMAT_R8G8B8A8_UNORM,1,width,height,0,0,1,len(levels),0,dfd_offset,len(dfd),kvd_offset,0,0,0)
    index=b''.join(struct.pack('<3Q',*entry) for entry in indices); prefix=KTX2_ID+header+index+dfd; prefix+=b'\x00'*(cursor-len(prefix)); path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(prefix+payload)

def inspect(path: Path)->dict[str,int|bool]:
    data=path.read_bytes()
    if data[:12]!=KTX2_ID or len(data)<80: raise RuntimeError(f'{path}: not KTX2')
    vk_format,_type_size,width,height,_depth,_layers,_faces,levels,supercompression=struct.unpack_from('<9I',data,12)
    return {'vkFormat':vk_format,'width':width,'height':height,'levels':levels,'supercompressionScheme':supercompression,'basisUniversal':vk_format==0}

def encode_toktx(toktx: str, source: Path, target: Path, mode: str, kind: str):
    target.parent.mkdir(parents=True,exist_ok=True)
    common=[toktx,"--t2","--genmipmap","--threads","1"]
    color_space=["--assign_oetf", "srgb", "--assign_primaries", "bt709"] if kind=='basecolor' else ["--assign_oetf", "linear", "--assign_primaries", "bt709"]
    common+=color_space
    if mode=='ETC1S': args=common+['--bcmp','--clevel','5','--qlevel','192']
    elif mode=='UASTC':
        args=common+['--uastc','2','--zcmp','10']
        if kind=='normal': args+=['--normal_mode']
    else: raise ValueError(mode)
    args+=[str(target),str(source)]; result=subprocess.run(args,cwd=ROOT,text=True,capture_output=True)
    if result.returncode!=0: raise RuntimeError(f'toktx failed for {source}:\n{result.stdout}\n{result.stderr}')
    return ' '.join(args[:-2]+['<target>','<source>'])

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--require-basis',action='store_true'); args=parser.parse_args(); source_manifest=json.loads((SOURCE/'source-manifest.json').read_text(encoding='utf8')); toktx=os.environ.get('TOKTX') or shutil.which('toktx')
    if args.require_basis and not toktx: raise SystemExit('R6.1 release texture gate: `toktx` is required. Run scripts/install-ktx-tools.sh or set TOKTX.')
    records=[]
    for record in source_manifest['sourceTextures']:
        src=ROOT/record['path']; material=record['material']; kind=record['kind']; slug=record['slug']; requested=record['encoding']; target=OUT/slug/f'{kind}.ktx2'
        if toktx: command=encode_toktx(toktx,src,target,requested,kind); mode=requested
        else: write_development_ktx2(target,src,srgb=kind=='basecolor'); command='offline RGBA8 KTX2 development fallback'; mode='RGBA8_MIP_FALLBACK'
        info=inspect(target); records.append({'material':material,'slug':slug,'kind':kind,'source':record['path'],'path':f'/textures/r6/manufacturing-line/materials/{slug}/{kind}.ktx2','requestedEncoding':requested,'actualEncoding':mode,'bytes':target.stat().st_size,'command':command,**info})
        if args.require_basis and (not info['basisUniversal'] or info['levels']<2): raise SystemExit(f'{target}: release KTX2 must be Basis Universal with an offline mip chain')
    release_ready=bool(records) and all(r['basisUniversal'] and r['levels']>=2 for r in records); output={'schema':1,'hero':'manufacturing-line','encoder':'Khronos toktx' if toktx else 'development RGBA8 fallback writer','releaseReadyBasis':release_ready,'mipPolicy':'offline full mip chain','records':records}; OUT.mkdir(parents=True,exist_ok=True); (OUT/'encoding-manifest.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf8'); print(f"R6.1 textures: {len(records)} maps, basisReleaseReady={release_ready}, encoder={output['encoder']}")
if __name__=='__main__': main()

#!/usr/bin/env python3
from __future__ import annotations
from hashlib import sha256
import json
from pathlib import Path
import shutil,struct,sys
ROOT=Path(__file__).resolve().parents[1]; SOURCE=ROOT/'assets-source'/'approved'; TARGET=ROOT/'public'/'models'/'approved'; BRAND=ROOT/'public'/'brand'; MANIFEST=SOURCE/'manifest.json'
REQUIRED=('hero-campus','manufacturing','power-generation','data-centers','recycling','closing-platform')
R6_ALIASES={'hero-campus':'integrated-campus','manufacturing':'manufacturing-line','power-generation':'substation-bess','data-centers':'data-center-cooling','recycling':'recycling-intake','closing-platform':'connected-campus'}
def parse_glb(path:Path)->dict:
 data=path.read_bytes();
 if len(data)<20 or data[:4]!=b'glTF': raise ValueError(f'{path.name}: not a GLB file')
 version,declared=struct.unpack_from('<II',data,4)
 if version!=2 or declared!=len(data): raise ValueError(f'{path.name}: invalid GLB')
 json_len,json_type=struct.unpack_from('<II',data,12)
 if json_type!=0x4E4F534A: raise ValueError(f'{path.name}: first GLB chunk is not JSON')
 return json.loads(data[20:20+json_len].decode('utf-8').rstrip(' \t\r\n\0'))
def gltf_metrics(gltf:dict)->tuple[int,int]:
 accessors=gltf.get('accessors') or []; triangles=0; primitives=0
 for mesh in gltf.get('meshes') or []:
  for primitive in mesh.get('primitives') or []:
   primitives+=1
   if int(primitive.get('mode',4))!=4: continue
   index=primitive.get('indices')
   if isinstance(index,int) and 0<=index<len(accessors): triangles+=int(accessors[index].get('count',0))//3
   else:
    position=(primitive.get('attributes') or {}).get('POSITION')
    if isinstance(position,int) and 0<=position<len(accessors): triangles+=int(accessors[position].get('count',0))//3
 return triangles,primitives
def main()->int:
 if not MANIFEST.exists(): print('Missing assets-source/approved/manifest.json.',file=sys.stderr); return 2
 manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
 if manifest.get('approved') is not True: print('Refusing promotion: manifest approved=true is required.',file=sys.stderr); return 3
 if not str(manifest.get('approvedBy','')).strip() or not str(manifest.get('approvedAt','')).strip(): return 4
 assets=manifest.get('assets') or {}; missing=[name for name in REQUIRED if name not in assets and R6_ALIASES[name] not in assets]
 if missing: print(f"Missing asset entries: {', '.join(missing)}",file=sys.stderr); return 5
 TARGET.mkdir(parents=True,exist_ok=True); BRAND.mkdir(parents=True,exist_ok=True); output=[]; require_ktx2=bool(manifest.get('requireKtx2',True)); require_geometry_compression=bool(manifest.get('requireGeometryCompression',True)); budgets=manifest.get('assetBudgets') or {}; max_triangles=int(budgets.get('maxTrianglesPerScene',180000)); max_primitives=int(budgets.get('maxPrimitivesPerScene',60)); max_bytes=int(budgets.get('maxBytesPerScene',8000000)); max_total_bytes=int(budgets.get('maxTotalBytes',32000000)); total_bytes=0
 for name in REQUIRED:
  source_key=name if name in assets else R6_ALIASES[name]; src=SOURCE/str(assets[source_key])
  if not src.exists(): return 6
  gltf=parse_glb(src); extensions=set(gltf.get('extensionsUsed',[]))
  if require_ktx2 and 'KHR_texture_basisu' not in extensions: return 7
  if require_geometry_compression and not ({'EXT_meshopt_compression','KHR_draco_mesh_compression'} & extensions): return 9
  triangles,primitives=gltf_metrics(gltf)
  if triangles>max_triangles:return 10
  if primitives>max_primitives:return 11
  if src.stat().st_size>max_bytes:return 12
  total_bytes+=src.stat().st_size
  if total_bytes>max_total_bytes:return 13
  dst=TARGET/f'{name}.glb'; shutil.copy2(src,dst); output.append({'id':name,'file':dst.name,'bytes':dst.stat().st_size,'sha256':sha256(dst.read_bytes()).hexdigest(),'extensionsUsed':sorted(extensions),'triangles':triangles,'primitives':primitives})
 logo_name=str(manifest.get('brandLogo','')).strip(); logo_output=None
 if logo_name:
  logo_src=SOURCE/logo_name
  if logo_src.exists():
   if logo_src.suffix.lower()!='.svg': return 8
   logo_dst=BRAND/'convalt-logo.svg'; shutil.copy2(logo_src,logo_dst); logo_output={'file':logo_dst.name,'sha256':sha256(logo_dst.read_bytes()).hexdigest()}
 promoted={'assetSet':'approved','approvedBy':manifest['approvedBy'],'approvedAt':manifest['approvedAt'],'sourceNotes':manifest.get('sourceNotes',''),'requireKtx2':require_ktx2,'requireGeometryCompression':require_geometry_compression,'assetBudgets':{'maxTrianglesPerScene':max_triangles,'maxPrimitivesPerScene':max_primitives,'maxBytesPerScene':max_bytes,'maxTotalBytes':max_total_bytes},'assets':output,'brandLogo':logo_output}
 (TARGET/'manifest.json').write_text(json.dumps(promoted,indent=2)+'\n',encoding='utf-8'); print(f'Promoted {len(output)} approved GLBs to {TARGET}'); return 0
if __name__=='__main__': raise SystemExit(main())

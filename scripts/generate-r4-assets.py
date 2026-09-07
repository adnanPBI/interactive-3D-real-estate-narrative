#!/usr/bin/env python3
"""Generate the R4 cinematic visual-fidelity GLB pack.

R4 is a deliberately richer, still performance-governed art pass.  The goal is
near-realistic architectural readability on mid-range integrated graphics, not
CAD-for-CAD's-sake density.  Geometry is aggressively consolidated by material
so detailed scenes remain draw-call efficient.

The six scenes follow the approved R4 art-direction boards:
  01 integrated energy campus
  02 solar manufacturing
  03 power generation
  04 data centers
  05 recycling
  06 connected ecosystem

The generator is deterministic.  It produces embedded PBR textures, GLBs, low-
power fallback SVGs, and a manifest with hashes / budgets.
"""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import trimesh

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "models" / "r4"
FALLBACK = ROOT / "public" / "fallback" / "r4"
SOURCE_TEX = ROOT / "assets-source" / "r4" / "textures"
OUT.mkdir(parents=True, exist_ok=True)
FALLBACK.mkdir(parents=True, exist_ok=True)
SOURCE_TEX.mkdir(parents=True, exist_ok=True)

RNG = np.random.default_rng(260906)


def clamp8(a: np.ndarray) -> np.ndarray:
    return np.clip(a, 0, 255).astype(np.uint8)


def noise_texture(base: tuple[int, int, int], strength: int = 10, size: int = 512, blur: float = 0.0) -> Image.Image:
    noise = RNG.normal(0, strength, (size, size, 1))
    rgb = np.array(base, dtype=float)[None, None, :] + noise
    img = Image.fromarray(clamp8(rgb), mode="RGB")
    return img.filter(ImageFilter.GaussianBlur(blur)) if blur else img


def directional_texture(base: tuple[int, int, int], axis: str = "x", size: int = 512, contrast: int = 13) -> Image.Image:
    arr = np.zeros((size, size, 3), dtype=float)
    arr[:] = base
    if axis == "x":
        streak = RNG.normal(0, contrast, (1, size, 1))
    else:
        streak = RNG.normal(0, contrast, (size, 1, 1))
    arr += streak
    for n in range(0, size, 19):
        if axis == "x": arr[:, n:n + 1] += 10
        else: arr[n:n + 1, :] += 10
    return Image.fromarray(clamp8(arr), mode="RGB")


def concrete_texture(size=512) -> Image.Image:
    img = noise_texture((190, 188, 181), 8, size, 0.35)
    draw = ImageDraw.Draw(img)
    for _ in range(450):
        x = int(RNG.integers(0, size)); y = int(RNG.integers(0, size))
        r = int(RNG.integers(1, 4)); c = int(RNG.integers(145, 205))
        draw.ellipse((x-r,y-r,x+r,y+r), fill=(c,c,c))
    return img.filter(ImageFilter.GaussianBlur(0.18))


def asphalt_texture(size=512) -> Image.Image:
    img = noise_texture((72, 74, 71), 18, size, 0.2)
    draw = ImageDraw.Draw(img)
    for _ in range(1200):
        x = int(RNG.integers(0, size)); y = int(RNG.integers(0, size)); v = int(RNG.integers(75, 135))
        draw.point((x,y), fill=(v,v,v))
    return img


def solar_texture(size=512) -> Image.Image:
    img = Image.new("RGB", (size,size), (27, 52, 66)); d = ImageDraw.Draw(img)
    cols, rows = 12, 8
    cw, rh = size/cols, size/rows
    for x in range(cols+1): d.line((int(x*cw),0,int(x*cw),size), fill=(82,117,129), width=1)
    for y in range(rows+1): d.line((0,int(y*rh),size,int(y*rh)), fill=(82,117,129), width=1)
    for x in range(cols):
        for y in range(rows):
            if (x+y)%3==0:
                xx=int((x+.5)*cw); yy=int((y+.5)*rh)
                d.ellipse((xx-2,yy-2,xx+2,yy+2), fill=(118,142,151))
    return img


def facade_texture(size=512) -> Image.Image:
    img = directional_texture((178, 181, 178), "x", size, 7); d = ImageDraw.Draw(img)
    for x in range(0,size,32): d.line((x,0,x,size), fill=(154,158,157), width=1)
    return img


def server_texture(size=512) -> Image.Image:
    img = Image.new("RGB", (size,size), (20,25,25)); d=ImageDraw.Draw(img)
    for y in range(12,size,22):
        d.rounded_rectangle((12,y,size-12,y+12), radius=2, fill=(42,48,47), outline=(65,72,70))
        for x,c in [(24,(196,150,69)),(35,(73,137,96)),(46,(67,93,126))]: d.ellipse((x,y+4,x+4,y+8), fill=c)
        d.rectangle((size-90,y+4,size-24,y+8), fill=(25,30,30))
    return img


def vegetation_texture(size=512) -> Image.Image:
    img = noise_texture((83, 100, 77), 22, size, 0.4); d=ImageDraw.Draw(img)
    for _ in range(700):
        x=int(RNG.integers(0,size)); y=int(RNG.integers(0,size)); r=int(RNG.integers(1,4))
        d.ellipse((x-r,y-r,x+r,y+r), fill=(int(RNG.integers(55,105)), int(RNG.integers(82,125)), int(RNG.integers(49,87))))
    return img


def recycled_texture(size=512) -> Image.Image:
    arr=np.zeros((size,size,3),dtype=np.uint8); arr[:]=(112,112,104)
    colors=np.array([(132,139,131),(116,91,67),(87,105,111),(153,147,128),(76,89,70),(106,111,112)],dtype=np.uint8)
    for _ in range(6000):
        y=int(RNG.integers(0,size)); x=int(RNG.integers(0,size)); arr[y,x]=colors[int(RNG.integers(0,len(colors)))]
    return Image.fromarray(arr,"RGB").filter(ImageFilter.GaussianBlur(0.25))


def normal_texture(size=512, grain=3.0) -> Image.Image:
    h=RNG.normal(0,grain,(size,size)); gy,gx=np.gradient(h); nx=-gx*.022; ny=-gy*.022; nz=np.ones_like(nx)
    norm=np.sqrt(nx*nx+ny*ny+nz*nz)
    rgb=np.stack([(nx/norm*.5+.5)*255,(ny/norm*.5+.5)*255,(nz/norm*.5+.5)*255],axis=2)
    return Image.fromarray(clamp8(rgb),"RGB")


def ao_texture(size=512) -> Image.Image:
    y,x=np.mgrid[0:size,0:size]; edge=np.minimum.reduce([x,y,size-1-x,size-1-y]).astype(float); edge/=max(1.,edge.max())
    v=150+edge*105; return Image.fromarray(clamp8(v[...,None].repeat(3,axis=2)),"RGB")


def emissive_texture(size=512) -> Image.Image:
    img=Image.new("RGB",(size,size),(0,0,0)); d=ImageDraw.Draw(img)
    for y in range(12,size,22):
        d.ellipse((26,y+4,31,y+9), fill=(210,157,73)); d.ellipse((39,y+4,44,y+9), fill=(61,128,91)); d.ellipse((52,y+4,57,y+9), fill=(68,96,137))
    return img


TEXTURES = {
    "concrete": concrete_texture(),
    "facade": facade_texture(),
    "asphalt": asphalt_texture(),
    "ground": noise_texture((139,140,132),12,512,.25),
    "steel": directional_texture((133,139,137),"y",512,8),
    "roof": directional_texture((74, 78, 77),"x",512,5),
    "bronze": directional_texture((150,122,82),"x",512,8),
    "solar": solar_texture(),
    "server": server_texture(),
    "vegetation": vegetation_texture(),
    "recycled": recycled_texture(),
    "normal": normal_texture(),
    "ao": ao_texture(),
    "emissive": emissive_texture(),
}
for name,img in TEXTURES.items(): img.save(SOURCE_TEX/f"{name}.png", optimize=True)


@dataclass(frozen=True)
class MaterialSpec:
    name: str
    base: tuple[int,int,int,int]
    texture: str | None
    metallic: float
    roughness: float
    emissive: tuple[float,float,float] | None = None
    emissive_texture: str | None = None
    normal: bool = True
    ao: bool = True
    alpha_mode: str | None = None
    double_sided: bool = False


SPECS = {
    "Ground": MaterialSpec("Ground", (150,150,141,255), "ground", .02, .94),
    "Asphalt": MaterialSpec("Asphalt", (74,76,74,255), "asphalt", .02, .92),
    "Concrete": MaterialSpec("Concrete", (199,197,190,255), "concrete", .02, .84),
    "Facade": MaterialSpec("Facade", (185,188,185,255), "facade", .42, .42),
    "Graphite": MaterialSpec("Graphite", (49,52,52,255), None, .35, .52, normal=False),
    "Steel": MaterialSpec("Steel", (142,148,146,255), "steel", .75, .32),
    "Aluminum": MaterialSpec("Aluminum", (182,188,186,255), "steel", .82, .26),
    "Roof": MaterialSpec("Roof", (72,76,75,255), "roof", .18, .73),
    "Bronze": MaterialSpec("Bronze", (168,137,91,255), "bronze", .54, .38, emissive=(.018,.012,.006)),
    "SolarGlass": MaterialSpec("SolarGlass", (45,76,93,255), "solar", .48, .20, normal=False),
    "BlackGlass": MaterialSpec("BlackGlass", (30,37,38,255), None, .52, .14, normal=False),
    "VisionGlass": MaterialSpec("VisionGlass", (83,106,117,176), None, .18, .10, normal=False, ao=False, alpha_mode="BLEND", double_sided=True),
    "ServerFace": MaterialSpec("ServerFace", (28,34,34,255), "server", .30, .40, emissive=(.06,.045,.022), emissive_texture="emissive", normal=False),
    "Vegetation": MaterialSpec("Vegetation", (78,97,72,255), "vegetation", .02, .88),
    "VegetationDark": MaterialSpec("VegetationDark", (56,75,54,255), "vegetation", .01, .91),
    "Recycled": MaterialSpec("Recycled", (112,114,105,255), "recycled", .08, .76),
    "White": MaterialSpec("White", (229,228,222,255), None, .08, .72, normal=False),
    "RoadMark": MaterialSpec("RoadMark", (224,214,189,255), None, .0, .82, normal=False),
    "Warning": MaterialSpec("Warning", (213,164,62,255), None, .04, .58, normal=False),
    "Rubber": MaterialSpec("Rubber", (25,28,29,255), None, .02, .92, normal=False),
    "Shadow": MaterialSpec("Shadow", (54,55,53,112), None, .0, 1.0, normal=False, ao=False, alpha_mode="BLEND", double_sided=True),
    "WarmGlow": MaterialSpec("WarmGlow", (176,136,77,255), None, .04, .45, emissive=(.14,.08,.026), normal=False),
    "CoolGlow": MaterialSpec("CoolGlow", (79,108,137,255), None, .08, .42, emissive=(.04,.075,.13), normal=False),
    "Water": MaterialSpec("Water", (71,92,98,255), None, .45, .18, normal=False),
}


def make_material(spec: MaterialSpec) -> trimesh.visual.material.PBRMaterial:
    return trimesh.visual.material.PBRMaterial(
        name=spec.name,
        baseColorFactor=np.array(spec.base,dtype=np.uint8),
        baseColorTexture=TEXTURES[spec.texture] if spec.texture else None,
        normalTexture=TEXTURES["normal"] if spec.normal else None,
        occlusionTexture=TEXTURES["ao"] if spec.ao else None,
        emissiveFactor=np.array(spec.emissive,dtype=float) if spec.emissive else None,
        emissiveTexture=TEXTURES[spec.emissive_texture] if spec.emissive_texture else None,
        metallicFactor=spec.metallic,
        roughnessFactor=spec.roughness,
        alphaMode=spec.alpha_mode,
        doubleSided=spec.double_sided,
    )

MATERIALS={k:make_material(v) for k,v in SPECS.items()}


def T(x=0.,y=0.,z=0.): return trimesh.transformations.translation_matrix([x,y,z])
def R(angle,axis=(0,1,0)): return trimesh.transformations.rotation_matrix(angle,axis)


def uv_project(mesh: trimesh.Trimesh, axes=(0,2), repeat=(1.,1.)) -> np.ndarray:
    v=mesh.vertices; out=np.zeros((len(v),2),float)
    for i,axis in enumerate(axes):
        vals=v[:,axis]; span=max(float(np.ptp(vals)),1e-6); out[:,i]=((vals-vals.min())/span)*repeat[i]
    return out


class Builder:
    def __init__(self,name:str):
        self.name=name; self.meshes={k:[] for k in MATERIALS}
    def add(self,mesh:trimesh.Trimesh,material:str,matrix=None,repeat=(1.,1.),axes=(0,2)):
        mesh=mesh.copy()
        if matrix is not None: mesh.apply_transform(matrix)
        spec=SPECS[material]
        mesh.visual=trimesh.visual.TextureVisuals(uv=uv_project(mesh,axes,repeat) if (spec.texture or spec.normal or spec.ao or spec.emissive_texture) else None, material=MATERIALS[material])
        self.meshes[material].append(mesh)
    def box(self,ext,pos,mat,rot_y=0.,repeat=(1.,1.)):
        self.add(trimesh.creation.box(extents=ext),mat,T(*pos)@R(rot_y),repeat)
    def cyl(self,r,h,pos,mat,axis="y",sections=16):
        mesh=trimesh.creation.cylinder(radius=r,height=h,sections=sections); m=np.eye(4)
        if axis=="y": m=R(math.pi/2,(1,0,0))
        elif axis=="x": m=R(math.pi/2,(0,1,0))
        self.add(mesh,mat,T(*pos)@m)
    def sphere(self,r,pos,mat,sub=1): self.add(trimesh.creation.icosphere(subdivisions=sub,radius=r),mat,T(*pos))
    def torus(self,major,minor,pos,mat,rot=(0,0,0)):
        mesh=trimesh.creation.torus(major_radius=major,minor_radius=minor,major_sections=36,minor_sections=8); m=T(*pos)
        for a,axis in zip(rot,((1,0,0),(0,1,0),(0,0,1))):
            if a: m=m@R(a,axis)
        self.add(mesh,mat,m)
    def cyl_between(self,p1,p2,r,mat,sections=12):
        p1=np.array(p1,float); p2=np.array(p2,float); d=p2-p1; length=float(np.linalg.norm(d))
        if length<1e-6: return
        mesh=trimesh.creation.cylinder(radius=r,height=length,sections=sections)
        align=trimesh.geometry.align_vectors([0,0,1],d/length)
        m=T(*((p1+p2)/2))@align
        self.add(mesh,mat,m)
    def scene(self):
        scene=trimesh.Scene()
        for mat,meshes in self.meshes.items():
            if not meshes: continue
            merged=trimesh.util.concatenate(meshes); merged.visual.material=MATERIALS[mat]
            scene.add_geometry(merged,node_name=f"{self.name}_{mat}",geom_name=f"{self.name}_{mat}")
        return scene


def wedge(length=1.0,width_root=.22,width_tip=.06,thickness=.035) -> trimesh.Trimesh:
    # tapered blade/fin centered along +Y before placement
    wr=width_root/2; wt=width_tip/2; t=thickness/2
    verts=np.array([[-wr,0,-t],[wr,0,-t],[-wt,length,-t],[wt,length,-t],[-wr,0,t],[wr,0,t],[-wt,length,t],[wt,length,t]],float)
    faces=np.array([[0,1,3],[0,3,2],[4,6,7],[4,7,5],[0,4,5],[0,5,1],[2,3,7],[2,7,6],[0,2,6],[0,6,4],[1,5,7],[1,7,3]])
    return trimesh.Trimesh(vertices=verts,faces=faces,process=False)


def mountain_ridge(b:Builder,z=-7.8,width=18.,height=3.,segments=44,mat="Ground",seed=0):
    rng=np.random.default_rng(1000+seed); xs=np.linspace(-width/2,width/2,segments)
    peaks=(np.sin(xs*.55+seed)*.45+np.sin(xs*1.15+1.4)*.2+1.0)*height*.45+rng.uniform(-.12,.12,segments)
    verts=[]
    for x,y in zip(xs,peaks): verts.extend([[x,-.15,z],[x,y,z-.8]])
    faces=[]
    for i in range(segments-1):
        a=2*i; faces += [[a,a+1,a+3],[a,a+3,a+2]]
    mesh=trimesh.Trimesh(vertices=np.array(verts),faces=np.array(faces),process=False); b.add(mesh,mat)


def frustum_y(radius_bottom=.1, radius_top=.07, height=1.0, sections=20) -> trimesh.Trimesh:
    """Low-poly tapered cylinder aligned to Y, capped at both ends."""
    verts=[]; faces=[]
    for i in range(sections):
        a=2*math.pi*i/sections; ca=math.cos(a); sa=math.sin(a)
        verts.append([radius_bottom*ca,-height/2,radius_bottom*sa])
        verts.append([radius_top*ca,height/2,radius_top*sa])
    bottom=len(verts); verts.append([0,-height/2,0])
    top=len(verts); verts.append([0,height/2,0])
    for i in range(sections):
        j=(i+1)%sections; bi=2*i; ti=bi+1; bj=2*j; tj=bj+1
        faces += [[bi,bj,tj],[bi,tj,ti],[bottom,bj,bi],[top,ti,tj]]
    return trimesh.Trimesh(vertices=np.array(verts,float),faces=np.array(faces,int),process=False)


def shadow_pad(b:Builder,center,size,rot_y=0.):
    x,z=center; sx,sz=size
    b.box((sx,.012,sz),(x,.008,z),"Shadow",rot_y=rot_y)


def street_light(b:Builder,pos,scale=1.,yaw=0.,double=False):
    x,y,z=pos
    b.cyl(.035*scale,1.7*scale,(x,y+.85*scale,z),"Graphite",sections=9)
    arm=1.0 if double else .55
    b.cyl_between((x,y+1.65*scale,z),(x+math.cos(yaw)*arm*scale,y+1.65*scale,z+math.sin(yaw)*arm*scale),.026*scale,"Graphite",8)
    for sign in ((-1,1) if double else (1,)):
        px=x+math.cos(yaw)*arm*scale*sign; pz=z+math.sin(yaw)*arm*scale*sign
        b.box((.22*scale,.055*scale,.11*scale),(px,y+1.62*scale,pz),"WarmGlow",rot_y=-yaw)


def bollard_row(b:Builder,x0,x1,z,spacing=.42,scale=1.):
    for x in np.arange(x0,x1+1e-5,spacing):
        b.cyl(.032*scale,.42*scale,(float(x),.21*scale,z),"Warning",sections=8)


def fence_line(b:Builder,start,end,height=.95,spacing=.78):
    p1=np.array(start,float); p2=np.array(end,float); v=p2-p1; length=float(np.linalg.norm(v))
    if length<1e-6: return
    count=max(2,int(length/spacing)+1)
    for t in np.linspace(0,1,count):
        p=p1*(1-t)+p2*t; b.box((.035,height,.035),(p[0],height/2,p[2]),"Steel")
    for y in (.18,height*.55,height-.07):
        b.cyl_between((p1[0],y,p1[2]),(p2[0],y,p2[2]),.018,"Steel",6)


def parking_car(b:Builder,pos,scale=.55,rot_y=0.,body="Facade"):
    x,y,z=pos; base=T(x,y,z)@R(rot_y)
    b.add(trimesh.creation.box(extents=[1.9*scale,.34*scale,.82*scale]),body,base@T(0,.34*scale,0))
    b.add(trimesh.creation.box(extents=[.94*scale,.34*scale,.72*scale]),"VisionGlass",base@T(-.05*scale,.63*scale,0))
    b.add(trimesh.creation.box(extents=[.45*scale,.05*scale,.70*scale]),body,base@T(.62*scale,.83*scale,0))
    for xx in (-.62,.58):
        for zz in (-.43,.43):
            b.add(trimesh.creation.cylinder(radius=.16*scale,height=.09*scale,sections=12),"Rubber",base@T(xx*scale,.20*scale,zz*scale)@R(math.pi/2,(1,0,0)))
            b.add(trimesh.creation.cylinder(radius=.075*scale,height=.095*scale,sections=10),"Aluminum",base@T(xx*scale,.20*scale,zz*scale)@R(math.pi/2,(1,0,0)))
    b.add(trimesh.creation.box(extents=[.025*scale,.09*scale,.28*scale]),"WarmGlow",base@T(.96*scale,.39*scale,0))


def tree(b:Builder,pos,scale=1.):
    b.cyl(.052*scale,.62*scale,(pos[0],pos[1]+.31*scale,pos[2]),"Bronze",sections=8)
    b.sphere(.31*scale,(pos[0]-.13*scale,pos[1]+.74*scale,pos[2]),"Vegetation",sub=1)
    b.sphere(.29*scale,(pos[0]+.15*scale,pos[1]+.78*scale,pos[2]+.04*scale),"VegetationDark",sub=1)
    b.sphere(.24*scale,(pos[0],pos[1]+.96*scale,pos[2]-.06*scale),"Vegetation",sub=1)


def landscaping_band(b:Builder,x0,x1,z,spacing=.85,scale=.72):
    for i,x in enumerate(np.arange(x0,x1+1e-5,spacing)):
        tree(b,(float(x),0,z+math.sin(i*.8)*.09),scale*(.85+((i%3)*.08)))


def road(b:Builder,pos,length,width,axis="x",lane_marks=True):
    ext=(length,.08,width) if axis=="x" else (width,.08,length)
    b.box(ext,(pos[0],.02,pos[2]),"Asphalt",repeat=(length/2,width/2))
    # curbs
    if axis=="x":
        b.box((length,.12,.10),(pos[0],.08,pos[2]-width/2),"Concrete"); b.box((length,.12,.10),(pos[0],.08,pos[2]+width/2),"Concrete")
        b.box((length,.018,.045),(pos[0],.071,pos[2]-width*.42),"RoadMark"); b.box((length,.018,.045),(pos[0],.071,pos[2]+width*.42),"RoadMark")
        if lane_marks:
            for x in np.arange(pos[0]-length/2+.7,pos[0]+length/2-.5,1.4): b.box((.62,.012,.04),(float(x),.07,pos[2]),"RoadMark")
    else:
        b.box((.10,.12,length),(pos[0]-width/2,.08,pos[2]),"Concrete"); b.box((.10,.12,length),(pos[0]+width/2,.08,pos[2]),"Concrete")
        b.box((.045,.018,length),(pos[0]-width*.42,.071,pos[2]),"RoadMark"); b.box((.045,.018,length),(pos[0]+width*.42,.071,pos[2]),"RoadMark")
        if lane_marks:
            for z in np.arange(pos[2]-length/2+.7,pos[2]+length/2-.5,1.4): b.box((.04,.012,.62),(pos[0],.07,float(z)),"RoadMark")


def solar_table(b:Builder,pos,scale=1.,rot_y=0.,cols=2,rows=1):
    for row in range(rows):
        for col in range(cols):
            dx=(col-(cols-1)/2)*1.55*scale; dz=(row-(rows-1)/2)*.95*scale
            m=T(pos[0]+dx,pos[1],pos[2]+dz)@R(rot_y)@R(-.23,(1,0,0))
            b.add(trimesh.creation.box(extents=[1.42*scale,.045*scale,.82*scale]),"SolarGlass",m,repeat=(1,1))
            b.add(trimesh.creation.box(extents=[1.47*scale,.025*scale,.025*scale]),"Aluminum",m@T(0,-.035,.405*scale))
            b.add(trimesh.creation.box(extents=[1.47*scale,.025*scale,.025*scale]),"Aluminum",m@T(0,-.035,-.405*scale))
            for fx in (-.71,.71): b.add(trimesh.creation.box(extents=[.025*scale,.025*scale,.83*scale]),"Aluminum",m@T(fx*scale,-.035,0))
            b.add(trimesh.creation.box(extents=[1.5*scale,.04*scale,.035*scale]),"Steel",m@T(0,-.045,.42*scale))
            b.add(trimesh.creation.box(extents=[1.5*scale,.04*scale,.035*scale]),"Steel",m@T(0,-.045,-.42*scale))
    for sx in (-.58,.58):
        b.box((.05*scale,.62*scale,.05*scale),(pos[0]+sx*scale,pos[1]-.34*scale,pos[2]),"Steel",rot_y=rot_y)
        b.cyl_between((pos[0]+sx*scale,pos[1]-.58*scale,pos[2]),(pos[0],pos[1]-.05*scale,pos[2]),.024*scale,"Steel",7)


def turbine(b:Builder,pos,scale=1.,yaw=0.):
    tower_y=3.0*scale; b.add(frustum_y(.12*scale,.065*scale,6*scale,24),"White",T(pos[0],tower_y,pos[2]))
    b.cyl(.20*scale,.10*scale,(pos[0],.05*scale,pos[2]),"Concrete",sections=20)
    hub=(pos[0],6.05*scale,pos[2]); b.sphere(.18*scale,hub,"White",sub=1)
    nacelle=trimesh.creation.box(extents=[.62*scale,.25*scale,.27*scale]); b.add(nacelle,"White",T(*hub)@R(yaw)@T(-.12*scale,0,0))
    b.add(trimesh.creation.box(extents=[.24*scale,.05*scale,.18*scale]),"Graphite",T(*hub)@R(yaw)@T(-.20*scale,.14*scale,0))
    for a in (0,2*math.pi/3,4*math.pi/3):
        blade=wedge(2.35*scale,.24*scale,.07*scale,.04*scale)
        b.add(blade,"White",T(*hub)@R(yaw)@R(a,(0,0,1)))


def rooftop_unit(b:Builder,pos,scale=1.):
    b.box((1.05*scale,.42*scale,.78*scale),(pos[0],pos[1]+.21*scale,pos[2]),"Graphite")
    b.cyl(.24*scale,.035*scale,(pos[0],pos[1]+.445*scale,pos[2]),"Steel",sections=16)
    for z in (-.24,.0,.24): b.box((.72*scale,.018*scale,.025*scale),(pos[0],pos[1]+.30*scale,pos[2]+z*scale),"Aluminum")
    b.box((.16*scale,.24*scale,.16*scale),(pos[0]+.43*scale,pos[1]+.54*scale,pos[2]),"Steel")


def truck(b:Builder,pos,scale=.75,rot_y=0.):
    # Readable fleet truck with cab glazing, chassis, trailer trim and wheel hubs.
    parts=[((1.1,.85,.9),(0,.55,0),"White"),((2.55,1.2,.9),(-1.62,.72,0),"Facade"),((.86,.34,.025),(.12,.66,.46),"VisionGlass"),((.86,.34,.025),(.12,.66,-.46),"VisionGlass"),((3.1,.10,.72),(-1.05,.25,0),"Graphite")]
    for ext,p,mat in parts:
        b.add(trimesh.creation.box(extents=np.array(ext)*scale),mat,T(*pos)@R(rot_y)@T(*(np.array(p)*scale)))
    base=T(*pos)@R(rot_y)
    b.add(trimesh.creation.box(extents=np.array([.72,.20,.94])*scale),"Graphite",base@T(.48*scale,.34*scale,0))
    b.add(trimesh.creation.box(extents=np.array([.035,.16,.46])*scale),"WarmGlow",base@T(.56*scale,.50*scale,0))
    b.add(trimesh.creation.box(extents=np.array([2.15,.035,.94])*scale),"Aluminum",base@T(-1.62*scale,.55*scale,0))
    for x in (.35,-.35,-1.25,-2.0,-2.45):
        for z in (-.48,.48):
            b.add(trimesh.creation.cylinder(radius=.19*scale,height=.11*scale,sections=16),"Rubber",base@T(x*scale,.24*scale,z*scale)@R(math.pi/2,(1,0,0)))
            b.add(trimesh.creation.cylinder(radius=.085*scale,height=.12*scale,sections=12),"Aluminum",base@T(x*scale,.24*scale,z*scale)@R(math.pi/2,(1,0,0)))


def worker(b:Builder,pos,scale=.7):
    b.box((.30*scale,.58*scale,.18*scale),(pos[0],pos[1]+.52*scale,pos[2]),"Graphite")
    b.sphere(.14*scale,(pos[0],pos[1]+.85*scale,pos[2]),"Bronze",sub=1)
    b.cyl(.045*scale,.55*scale,(pos[0]-.12*scale,pos[1]+.275*scale,pos[2]),"Graphite",sections=8)
    b.cyl(.045*scale,.55*scale,(pos[0]+.12*scale,pos[1]+.275*scale,pos[2]),"Graphite",sections=8)
    b.cyl_between((pos[0]-.15*scale,pos[1]+.68*scale,pos[2]),(pos[0]-.34*scale,pos[1]+.34*scale,pos[2]),.035*scale,"Graphite",7)
    b.cyl_between((pos[0]+.15*scale,pos[1]+.68*scale,pos[2]),(pos[0]+.34*scale,pos[1]+.38*scale,pos[2]),.035*scale,"Graphite",7)


def building_shell(b:Builder,center,size,material="Facade",glass=True,roof_units=0,loading_bays=0):
    """Detailed but consolidated corporate/industrial building shell.

    The structural mass stays simple for performance, while parapets, facade
    seams, mullions, glazing, entries and rooftop services create the scale cues
    that were missing from the early R4 block-out.
    """
    x,y,z=center; sx,sy,sz=size
    shadow_pad(b,(x,z),(sx*1.035,sz*1.04))
    b.box(size,(x,y+sy/2,z),material,repeat=(max(1,sx/1.4),max(1,sy/1.1)))
    # Plinth, roof membrane and parapet trim.
    b.box((sx+.10,.18,sz+.10),(x,y+.09,z),"Graphite")
    b.box((sx*.94,.055,sz*.92),(x,y+sy+.035,z),"Roof",repeat=(max(1,sx/2),max(1,sz/2)))
    for zz in (z-sz/2+.055,z+sz/2-.055): b.box((sx+.05,.16,.075),(x,y+sy+.09,zz),"Aluminum")
    for xx in (x-sx/2+.055,x+sx/2-.055): b.box((.075,.16,sz),(xx,y+sy+.09,z),"Aluminum")

    # Vertical panel language on the front and visible side faces.
    seam_count=max(4,int(sx/.72))
    for i in range(1,seam_count):
        xx=x-sx/2+i*sx/seam_count
        b.box((.018,sy*.92,.025),(xx,y+sy*.50,z+sz/2+.014),"Aluminum")
    side_count=max(3,int(sz/.78))
    for i in range(1,side_count):
        zz=z-sz/2+i*sz/side_count
        b.box((.025,sy*.86,.018),(x-sx/2-.014,y+sy*.48,zz),"Aluminum")

    if glass:
        # Two-tier camera-facing curtain-wall ribbon with clear mullion rhythm.
        glass_w=sx*.70; glass_h=max(.44,sy*.24); glass_y=y+sy*.47
        b.box((glass_w,glass_h,.034),(x,glass_y,z+sz/2+.024),"VisionGlass")
        count=max(4,int(glass_w/.68))
        for i in range(count+1):
            xx=x-glass_w/2+i*(glass_w/max(1,count))
            b.box((.026,glass_h+.05,.052),(xx,glass_y,z+sz/2+.043),"Aluminum")
        b.box((glass_w+.04,.028,.052),(x,glass_y+glass_h/2,z+sz/2+.043),"Aluminum")
        b.box((glass_w+.04,.028,.052),(x,glass_y-glass_h/2,z+sz/2+.043),"Aluminum")

        # Ground-level entry with canopy and warm interior reveal.
        entry_x=x+sx*.25
        b.box((min(1.05,sx*.19),min(1.10,sy*.42),.038),(entry_x,y+min(.58,sy*.23),z+sz/2+.035),"VisionGlass")
        b.box((min(1.35,sx*.24),.09,.62),(entry_x,y+min(1.18,sy*.48),z+sz/2+.30),"Graphite")
        b.box((min(.78,sx*.16),.035,.025),(entry_x,y+.16,z+sz/2+.065),"WarmGlow")

    if roof_units:
        cols=max(1,int(math.ceil(math.sqrt(roof_units))))
        rows=max(1,int(math.ceil(roof_units/cols)))
        for i in range(roof_units):
            row=i//cols; col=i%cols
            px=x-sx*.30+(col/(max(1,cols-1) or 1))*sx*.60 if cols>1 else x
            pz=z-sz*.26+(row/(max(1,rows-1) or 1))*sz*.52 if rows>1 else z
            rooftop_unit(b,(px,y+sy+.06,pz),.58)
        # Shared service spine reads as purposeful rooftop engineering.
        b.box((sx*.55,.11,.12),(x,y+sy+.20,z-sz*.12),"Steel")

    if loading_bays:
        for i in range(loading_bays):
            xx=x-sx*.32+i*(sx*.64/max(1,loading_bays-1))
            b.box((.72,1.04,.035),(xx,y+.56,z+sz/2+.042),"Graphite")
            b.box((.78,.08,.14),(xx,y+.08,z+sz/2+.105),"Concrete")
            b.box((.78,.055,.28),(xx,y+1.13,z+sz/2+.14),"Aluminum")
            b.box((.07,.82,.06),(xx-.40,y+.52,z+sz/2+.11),"Rubber")
            b.box((.07,.82,.06),(xx+.40,y+.52,z+sz/2+.11),"Rubber")


def battery_row(b:Builder,start,count,step,z,scale=.75):
    for i in range(count):
        x=start+i*step
        shadow_pad(b,(x,z),(1.18*scale,2.0*scale))
        b.box((1.1*scale,1.1*scale,1.9*scale),(x,.55*scale,z),"White")
        b.box((1.13*scale,.06*scale,1.94*scale),(x,1.09*scale,z),"Roof")
        b.box((.78*scale,.72*scale,.028*scale),(x,.55*scale,z+.956*scale),"Facade")
        for dx in (-.34,.34): b.box((.026*scale,.78*scale,.034*scale),(x+dx*scale,.55*scale,z+.975*scale),"Aluminum")
        for y in (.28,.52,.76): b.box((.65*scale,.025,.04),(x,y*scale,z+.96*scale),"CoolGlow")
        b.box((.09*scale,.28*scale,.04*scale),(x+.43*scale,.62*scale,z+.97*scale),"Warning")
        b.box((.45*scale,.035*scale,.45*scale),(x,1.145*scale,z),"Graphite")


def substation(b:Builder,center,scale=1.):
    x,_,z=center
    shadow_pad(b,(x,z),(4.8*scale,3.5*scale))
    b.box((4.6*scale,.08,3.3*scale),(x,.04,z),"Concrete")
    # bus frames + transformers
    for i in range(4):
        xx=x-1.5*scale+i*1.0*scale
        b.cyl(.045*scale,1.8*scale,(xx,.9*scale,z-.7*scale),"Steel",sections=8)
        b.cyl(.045*scale,1.8*scale,(xx,.9*scale,z+.7*scale),"Steel",sections=8)
        b.cyl_between((xx,1.75*scale,z-.7*scale),(xx,1.75*scale,z+.7*scale),.035*scale,"Steel",8)
    for xx in (x-1.0*scale,x+1.0*scale):
        b.box((.8*scale,.85*scale,1.0*scale),(xx,.45*scale,z),"Facade")
        b.box((.72*scale,.05*scale,.92*scale),(xx,.89*scale,z),"Roof")
        for dz in (-.35,0,.35): b.cyl(.09*scale,.45*scale,(xx,.98*scale,z+dz*scale),"Bronze",sections=10)
        for dz in (-.30,.30): b.cyl(.035*scale,.52*scale,(xx-.30*scale,.90*scale,z+dz*scale),"Steel",sections=8)
    # Perimeter rail and overhead busbars.
    fence_line(b,(x-2.15*scale,0,z-1.48*scale),(x+2.15*scale,0,z-1.48*scale),.72*scale,.65*scale)
    fence_line(b,(x-2.15*scale,0,z+1.48*scale),(x+2.15*scale,0,z+1.48*scale),.72*scale,.65*scale)
    b.cyl_between((x-1.8*scale,1.56*scale,z),(x+1.8*scale,1.56*scale,z),.026*scale,"Bronze",8)


def industrial_frame(b:Builder,x0,x1,z0,z1,height=3.3,bays=7):
    for x in np.linspace(x0,x1,bays+1):
        b.box((.12,height,.12),(float(x),height/2,z0),"Steel")
        b.box((.12,height,.12),(float(x),height/2,z1),"Steel")
        b.cyl_between((float(x),height,z0),(float(x),height,z1),.055,"Steel",8)
        # roof truss diagonal creates a much stronger high-bay silhouette
        b.cyl_between((float(x),height,z0),(float(x),height+.42,(z0+z1)/2),.035,"Aluminum",7)
        b.cyl_between((float(x),height+.42,(z0+z1)/2),(float(x),height,z1),.035,"Aluminum",7)
    b.cyl_between((x0,height,z0),(x1,height,z0),.06,"Steel",8); b.cyl_between((x0,height,z1),(x1,height,z1),.06,"Steel",8)
    b.cyl_between((x0,height+.42,(z0+z1)/2),(x1,height+.42,(z0+z1)/2),.045,"Aluminum",8)


def conveyor(b:Builder,start,end,width=.9,height=.55):
    p1=np.array(start,float); p2=np.array(end,float); v=p2-p1; length=float(np.linalg.norm(v[[0,2]])); yaw=math.atan2(v[0],v[2])
    mid=(p1+p2)/2; b.box((width,.12,length),(mid[0],height,mid[2]),"Graphite",rot_y=yaw)
    # side rails and legs
    for side in (-1,1):
        offset=np.array([math.cos(yaw)*width*.52,0,-math.sin(yaw)*width*.52])*side
        b.cyl_between((p1+offset+[0,height+.22,0]),(p2+offset+[0,height+.22,0]),.026,"Warning",7)
    for t in np.linspace(.05,.95,max(6,int(length/.45))):
        p=p1*(1-t)+p2*t; b.cyl(.055,width*1.04,(p[0],height+.065,p[2]),"Steel",axis="x",sections=10)
    for t in np.linspace(.08,.92,max(3,int(length/1.3))):
        p=p1*(1-t)+p2*t
        b.box((.055,height,.055),(p[0],height/2,p[2]),"Steel")


def robot_arm(b:Builder,base,scale=.8,angle=.2):
    x,y,z=base
    b.cyl(.18*scale,.18*scale,(x,y+.09*scale,z),"Graphite",sections=14)
    p0=(x,y+.18*scale,z); p1=(x+.32*scale*math.cos(angle),y+.75*scale,z+.20*scale); p2=(x+.85*scale,y+1.20*scale,z+.18*scale)
    b.cyl_between(p0,p1,.075*scale,"White",14); b.sphere(.11*scale,p1,"Warning",1)
    b.cyl_between(p1,p2,.065*scale,"White",14); b.sphere(.095*scale,p2,"Warning",1)
    b.box((.30*scale,.08*scale,.24*scale),(p2[0]+.12*scale,p2[1],p2[2]),"Graphite")
    b.cyl_between((x,y+.18*scale,z),(x-.18*scale,y+.42*scale,z-.12*scale),.025*scale,"Rubber",6)


def data_rack(b:Builder,pos,scale=.72):
    x,y,z=pos; shadow_pad(b,(x,z),(.76*scale,1.02*scale)); b.box((.70*scale,2.35*scale,.95*scale),(x,y+1.175*scale,z),"Graphite")
    b.box((.60*scale,2.12*scale,.03),(x,y+1.18*scale,z+.49*scale),"ServerFace",repeat=(1,4))
    b.box((.60*scale,2.12*scale,.03),(x,y+1.18*scale,z-.49*scale),"ServerFace",repeat=(1,4))
    for sx in (-.31,.31): b.box((.035*scale,2.22*scale,.05),(x+sx*scale,y+1.18*scale,z+.51*scale),"Steel")
    b.box((.58*scale,.05*scale,.08*scale),(x,y+.14*scale,z+.52*scale),"CoolGlow")


def bale(b:Builder,pos,scale=.55,mat="Recycled"):
    x,y,z=pos; b.box((1.1*scale,.75*scale,.75*scale),(x,y+.375*scale,z),mat,repeat=(2,2))
    for dx in (-.38,0,.38): b.box((.025,.78*scale,.78*scale),(x+dx*scale,y+.39*scale,z),"Steel")
    for yy in (.18,.54): b.box((1.14*scale,.022*scale,.78*scale),(x,y+yy*scale,z),"Steel")


def pile(b:Builder,center,scale=1.,count=30,mat="Recycled",seed=0):
    rng=np.random.default_rng(5000+seed)
    for _ in range(count):
        a=float(rng.uniform(0,2*math.pi)); r=float(rng.uniform(.05,1))*1.1*scale; s=float(rng.uniform(.10,.24))*scale
        x=center[0]+math.cos(a)*r; z=center[2]+math.sin(a)*r; y=center[1]+s*.45+max(0,1-r/(1.15*scale))*.35*scale
        if _ % 3 == 0:
            b.box((s*1.6,s*.55,s*1.1),(x,y,z),mat,rot_y=float(rng.uniform(0,math.pi)))
        else:
            b.sphere(s,(x,y,z),mat,sub=1)


def chiller_bank(b:Builder,start,count=4,step=1.05,scale=.72):
    x0,y,z=start
    for i in range(count):
        x=x0+i*step*scale
        shadow_pad(b,(x,z),(.95*scale,.78*scale))
        b.box((.88*scale,.72*scale,.70*scale),(x,y+.36*scale,z),"White")
        b.box((.76*scale,.05*scale,.58*scale),(x,y+.73*scale,z),"Roof")
        b.cyl(.20*scale,.035*scale,(x,y+.78*scale,z),"Graphite",sections=16)
        for dz in (-.25,0,.25): b.box((.62*scale,.018*scale,.025*scale),(x,y+.46*scale,z+dz*scale),"Aluminum")


def cooling_tower(b:Builder,pos,scale=1.):
    x,y,z=pos
    shadow_pad(b,(x,z),(1.35*scale,1.35*scale))
    lower=frustum_y(.55*scale,.68*scale,1.25*scale,24); b.add(lower,"Concrete",T(x,y+.625*scale,z))
    upper=frustum_y(.68*scale,.52*scale,.95*scale,24); b.add(upper,"Aluminum",T(x,y+1.72*scale,z))
    b.cyl(.38*scale,.06*scale,(x,y+2.23*scale,z),"Graphite",sections=20)
    for a in np.linspace(0,2*math.pi,8,endpoint=False):
        b.box((.03*scale,.78*scale,.12*scale),(x+math.cos(a)*.52*scale,y+1.75*scale,z+math.sin(a)*.52*scale),"Steel",rot_y=-a)


def pipe_rack(b:Builder,start,end,height=1.55,scale=1.,pipes=3):
    p1=np.array(start,float); p2=np.array(end,float); length=float(np.linalg.norm(p2-p1))
    count=max(2,int(length/(1.2*scale))+1)
    for t in np.linspace(0,1,count):
        p=p1*(1-t)+p2*t
        b.box((.05*scale,height,.05*scale),(p[0],height/2,p[2]),"Steel")
        b.box((.60*scale,.05*scale,.05*scale),(p[0],height,p[2]),"Steel")
    offsets=np.linspace(-.20,.20,pipes)
    for idx,off in enumerate(offsets):
        b.cyl_between((p1[0],height+.08+idx*.06,p1[2]+off),(p2[0],height+.08+idx*.06,p2[2]+off),.032*scale,"Bronze" if idx==0 else "Aluminum",8)


def transformer_pad(b:Builder,pos,scale=.8):
    x,y,z=pos; shadow_pad(b,(x,z),(1.4*scale,1.25*scale))
    b.box((1.35*scale,.08*scale,1.15*scale),(x,y+.04*scale,z),"Concrete")
    b.box((.92*scale,.82*scale,.76*scale),(x,y+.45*scale,z),"Facade")
    for dx in (-.30,0,.30):
        b.cyl(.055*scale,.38*scale,(x+dx*scale,y+1.01*scale,z),"Bronze",sections=9)
    for zz in (-.31,0,.31): b.box((.72*scale,.018*scale,.025*scale),(x,y+.49*scale,z+zz*scale),"Aluminum")


def pallet_stack(b:Builder,pos,rows=3,cols=4,scale=.38,mat="SolarGlass"):
    x,y,z=pos
    b.box((cols*.72*scale,.10*scale,rows*.52*scale),(x,y+.05*scale,z),"Bronze")
    for r in range(rows):
        for c in range(cols):
            xx=x+(c-(cols-1)/2)*.72*scale; zz=z+(r-(rows-1)/2)*.52*scale
            b.box((.66*scale,.055*scale,.46*scale),(xx,y+.14*scale+(r%2)*.012,zz),mat)


def forklift(b:Builder,pos,scale=.55,rot_y=0.):
    x,y,z=pos; base=T(x,y,z)@R(rot_y)
    b.add(trimesh.creation.box(extents=[1.1*scale,.36*scale,.72*scale]),"Warning",base@T(0,.34*scale,0))
    b.add(trimesh.creation.box(extents=[.52*scale,.62*scale,.68*scale]),"Graphite",base@T(-.25*scale,.68*scale,0))
    for xx in (-.36,.36):
        for zz in (-.38,.38): b.add(trimesh.creation.cylinder(radius=.14*scale,height=.09*scale,sections=12),"Rubber",base@T(xx*scale,.18*scale,zz*scale)@R(math.pi/2,(1,0,0)))
    for zz in (-.25,.25):
        b.add(trimesh.creation.box(extents=[.06*scale,1.25*scale,.06*scale]),"Steel",base@T(.48*scale,.86*scale,zz*scale))
    b.add(trimesh.creation.box(extents=[.82*scale,.05*scale,.05*scale]),"Steel",base@T(.78*scale,.28*scale,-.22*scale))
    b.add(trimesh.creation.box(extents=[.82*scale,.05*scale,.05*scale]),"Steel",base@T(.78*scale,.28*scale,.22*scale))


def recycling_hopper(b:Builder,pos,scale=.8):
    x,y,z=pos
    shadow_pad(b,(x,z),(1.2*scale,1.1*scale))
    b.box((1.12*scale,.72*scale,1.0*scale),(x,y+.45*scale,z),"Graphite")
    top=frustum_y(.68*scale,.44*scale,.70*scale,4); b.add(top,"Facade",T(x,y+1.16*scale,z)@R(math.pi/4,(0,1,0)))
    for sx in (-.45,.45): b.box((.07*scale,1.15*scale,.07*scale),(x+sx*scale,y+.58*scale,z),"Steel")


def service_lane_details(b:Builder,x0,x1,z,scale=1.):
    for i,x in enumerate(np.arange(x0,x1,.9*scale)):
        if i%2==0: street_light(b,(float(x),0,z),.72*scale,math.pi/2)


def hero_scene():
    b=Builder("r4_hero")
    b.box((20,.16,13),(0,-.08,0),"Ground",repeat=(10,7)); mountain_ridge(b,z=-7.0,width=22,height=3.4,seed=1); mountain_ridge(b,z=-8.0,width=25,height=2.2,seed=11)
    # lake / distant water strip
    b.box((21,.03,1.4),(0,.02,-5.7),"Water")
    road(b,(0,0,1.45),18,1.15,"x"); road(b,(-1.5,0,-.4),8.5,1.0,"z")
    building_shell(b,(-2.7,0,-1.4),(5.6,2.2,3.0),"Facade",True,6,3)
    building_shell(b,(3.4,0,-2.2),(4.1,2.0,2.5),"Graphite",True,6,0)
    building_shell(b,(4.9,0,2.35),(3.2,1.85,2.4),"Facade",True,3,2)
    building_shell(b,(-6.3,0,-3.15),(2.3,1.25,1.65),"White",True,1,0)
    chiller_bank(b,(1.9,0,-4.05),4,.95,.62)
    # solar foreground
    for r in range(4):
        for c in range(7): solar_table(b,(-7.2+c*1.55,.64,2.9+r*.92),.58)
    battery_row(b,-3.4,6,.92,3.85,.62); substation(b,(.4,0,3.8),.72)
    transformer_pad(b,(3.0,0,4.25),.72); transformer_pad(b,(4.25,0,4.25),.72)
    turbine(b,(7.0,0,-.7),.82,-.15); turbine(b,(8.0,0,-4.1),.62,.1)
    # roads/campus greenery
    landscaping_band(b,-8.4,8.4,1.95,.95,.68); landscaping_band(b,-8.0,7.4,-4.4,1.15,.58)
    service_lane_details(b,-7.2,6.7,1.98,.74)
    for i,x in enumerate(np.linspace(-5.6,-2.3,4)): parking_car(b,(float(x),0,.48),.45,math.pi/2,"White" if i%2 else "Facade")
    bollard_row(b,3.8,6.1,3.55,.42,.85)
    fence_line(b,(-1.5,0,2.7),(2.3,0,2.7),.70,.65)
    for x in (-5.7,6.2): truck(b,(x,0,1.4),.60,rot_y=math.pi/2)
    return b.scene()


def manufacturing_scene():
    b=Builder("r4_manufacturing")
    b.box((18,.14,11),(0,-.07,0),"Concrete",repeat=(9,6)); mountain_ridge(b,z=-6.2,width=20,height=2.8,seed=2); mountain_ridge(b,z=-7.0,width=21,height=1.8,seed=12)
    # exterior loading court to left / production hall to right, open camera-facing side
    building_shell(b,(-5.2,0,-2.4),(5.1,2.9,3.0),"Facade",True,4,4)
    for z in (-.5,2.7): road(b,(-4.9,0,z),5.6,1.0,"x")
    truck(b,(-6.1,0,-.45),.63,rot_y=math.pi/2); truck(b,(-4.5,0,-.45),.63,rot_y=math.pi/2)
    # primary high bay steel structure
    industrial_frame(b,-2.0,7.4,-3.65,3.65,3.8,8)
    # rear enclosure and technical spine leave the camera-facing side open.
    b.box((9.4,2.55,.16),(2.7,1.30,-3.55),"Facade",repeat=(7,2))
    for x in np.linspace(-1.5,6.9,10): b.box((.035,1.55,.05),(float(x),1.8,-3.44),"Aluminum")
    b.box((8.8,.62,.05),(2.8,2.45,-3.45),"VisionGlass")
    # partial roof strips / skylights
    for x in np.linspace(-1.5,6.9,7):
        b.box((.85,.08,7.2),(float(x),3.78,0),"White"); b.box((.32,.035,7.0),(float(x)+.18,3.83,0),"BlackGlass")
    # overhead gantry crane and service rails
    b.cyl_between((-1.3,3.18,-2.9),(6.6,3.18,-2.9),.055,"Warning",10)
    b.cyl_between((-1.3,3.18,2.9),(6.6,3.18,2.9),.055,"Warning",10)
    b.box((.18,.32,5.9),(2.4,3.02,0),"Aluminum")
    b.box((.46,.34,.46),(2.4,2.77,0),"Graphite")
    # module production cells / conveyors
    conveyor(b,(-1.7,0,1.65),(6.7,0,1.65),1.05,.55)
    conveyor(b,(-1.7,0,-.2),(6.2,0,-.2),.85,.62)
    for i,x in enumerate(np.linspace(-1.1,5.8,6)):
        solar_table(b,(float(x),1.06,1.65),.42,cols=1)
        robot_arm(b,(float(x)-.20,.04,.45),.72,angle=.25+i*.05)
    # inspection tunnels and material staging
    for x in (1.0,4.3):
        b.box((1.2,1.65,1.5),(x,.83,-1.65),"Graphite"); b.box((.86,.7,.03),(x,1.15,-.88),"BlackGlass")
    pallet_stack(b,(5.7,0,2.92),3,4,.42,"SolarGlass")
    pallet_stack(b,(3.65,0,3.05),2,3,.38,"White")
    forklift(b,(6.65,0,2.55),.54,-math.pi/2)
    forklift(b,(-.2,0,-2.75),.48,math.pi/2)
    # safety floor zoning and compact workstations
    for z in (-2.75,-1.05,.78,2.55): b.box((8.3,.014,.035),(2.7,.075,z),"Warning")
    for x in (-.65,1.8,4.1,6.2):
        b.box((.75,.68,.55),(x,.34,-2.72),"White"); b.box((.52,.30,.025),(x,.52,-2.43),"BlackGlass")
    pipe_rack(b,(-1.4,0,-3.10),(6.8,0,-3.10),1.85,.78,3)
    # lighting/service spines
    for z in (-2.8,-1.1,.7,2.5): b.box((8.7,.045,.045),(2.8,3.15,z),"WarmGlow")
    for p in [(-.7,0,2.75),(2.6,0,-2.7),(5.8,0,2.8)]: worker(b,p,.72)
    bollard_row(b,-6.9,-3.5,-.02,.48,.9)
    service_lane_details(b,-7.6,-2.6,4.15,.8)
    landscaping_band(b,-7.7,-3.0,4.35,.82,.55)
    return b.scene()


def generation_scene():
    b=Builder("r4_generation")
    b.box((22,.14,14),(0,-.07,0),"Ground",repeat=(12,8)); mountain_ridge(b,z=-7.4,width=24,height=3.8,seed=3); mountain_ridge(b,z=-8.4,width=27,height=2.4,seed=13); b.box((22,.025,1.5),(0,.01,-6.0),"Water")
    road(b,(0,0,1.0),20,1.0,"x"); road(b,(2.8,0,-1.8),9,1.0,"z")
    # dense but organized solar fields
    for r in range(6):
        for c in range(9): solar_table(b,(-8.0+c*1.75,.62,-2.8+r*.88),.55)
    turbine(b,(7.2,0,-3.7),.96,-.2); turbine(b,(4.9,0,-5.0),.70,.1); turbine(b,(9.2,0,-5.4),.60,-.1)
    substation(b,(4.1,0,3.7),.92); battery_row(b,6.9,5,.78,3.55,.56)
    # inverter/transformer pads sprinkled along field edge
    for x in (-6.6,-3.4,-.2,2.8):
        transformer_pad(b,(x,0,2.95),.68)
    # perimeter and collection infrastructure
    fence_line(b,(-9.4,0,-4.25),(3.7,0,-4.25),.62,.74)
    fence_line(b,(-9.4,0,1.95),(3.7,0,1.95),.62,.74)
    pipe_rack(b,(3.5,0,2.65),(7.8,0,2.65),1.22,.72,2)
    for x in (-7.2,-3.7,-.2,3.1,7.4): street_light(b,(x,0,1.6),.68,math.pi/2)
    parking_car(b,(2.0,0,1.52),.42,math.pi/2,"Facade")
    landscaping_band(b,-9.3,9.5,1.7,1.05,.58); landscaping_band(b,-8.8,7.2,-5.0,1.2,.50)
    truck(b,(1.3,0,1.0),.58,math.pi/2)
    return b.scene()


def datacenter_scene():
    b=Builder("r4_datacenters")
    b.box((20,.14,12),(0,-.07,0),"Ground",repeat=(10,6)); mountain_ridge(b,z=-6.6,width=22,height=3.0,seed=4); mountain_ridge(b,z=-7.4,width=24,height=1.9,seed=14); b.box((19,.025,1.25),(0,.01,-5.3),"Water")
    road(b,(0,0,2.7),18,1.05,"x"); road(b,(-5.0,0,-.2),7.0,1.0,"z")
    # campus halls
    building_shell(b,(-1.2,0,-1.4),(6.3,2.5,3.2),"Facade",True,12,0)
    building_shell(b,(5.4,0,-2.2),(4.4,2.25,2.7),"Facade",True,8,0)
    building_shell(b,(5.0,0,1.1),(3.6,1.8,2.0),"Graphite",True,4,0)
    # visible glass-front server gallery on main hall
    for row in range(2):
        for col in range(6): data_rack(b,(-3.55+col*.86,.15,-.15+row*.86),.48)
    # cooling plant / tanks / pipes
    cooling_tower(b,(-7.15,0,-2.9),.78); cooling_tower(b,(-5.85,0,-2.9),.78); cooling_tower(b,(-4.55,0,-2.9),.78)
    chiller_bank(b,(-7.2,0,-.55),4,.95,.72)
    pipe_rack(b,(-7.15,0,-1.65),(-2.5,0,-1.65),1.55,.82,4)
    substation(b,(-6.4,0,1.0),.75)
    transformer_pad(b,(-3.9,0,1.18),.72); transformer_pad(b,(-2.65,0,1.18),.72)
    battery_row(b,1.45,4,.78,3.75,.46)
    # perimeter/service
    fence_line(b,(-8.4,0,4.5),(8.4,0,4.5),.78,.72)
    for x in (-7.0,-3.6,.0,3.7,7.0): street_light(b,(x,0,3.55),.70,math.pi/2)
    for i,x in enumerate((-1.1,.1,1.3)): parking_car(b,(x,0,2.10),.42,math.pi/2,"White" if i==1 else "Facade")
    for x in (-6.8,6.6): truck(b,(x,0,2.7),.58,math.pi/2)
    landscaping_band(b,-8.8,8.8,3.7,.92,.60); landscaping_band(b,-8.2,7.8,-4.45,1.15,.52)
    return b.scene()


def recycling_scene():
    b=Builder("r4_recycling")
    b.box((20,.14,12),(0,-.07,0),"Ground",repeat=(10,6)); mountain_ridge(b,z=-6.5,width=22,height=3.2,seed=5); mountain_ridge(b,z=-7.4,width=24,height=1.8,seed=15)
    road(b,(-1.0,0,3.2),17.5,1.2,"x"); road(b,(-6.8,0,.4),6.4,1.0,"z")
    building_shell(b,(3.6,0,-1.5),(7.3,2.8,3.4),"Facade",True,5,2)
    # intake canopy
    b.box((4.4,.18,2.4),(-5.3,2.25,.5),"Facade")
    for x in np.linspace(-7.1,-3.5,5): b.box((.10,2.2,.10),(float(x),1.1,-.5),"Steel"); b.box((.10,2.2,.10),(float(x),1.1,1.5),"Steel")
    conveyor(b,(-5.9,0,-.55),(0.5,0,-.55),1.15,.70); conveyor(b,(-.1,0,-.55),(3.1,0,-2.2),.95,1.15)
    conveyor(b,(-.1,0,-.55),(3.1,0,.95),.95,1.15)
    recycling_hopper(b,(-6.4,0,-.55),.85); recycling_hopper(b,(-4.7,0,-.55),.70)
    # separator cells / optical sorters
    for x in (-2.0,-.4,1.2):
        b.box((1.15,1.5,1.4),(x,.75,-.55),"Graphite"); b.box((.65,.45,.03),(x,1.05,.17),"BlackGlass")
        b.box((1.19,.06,1.44),(x,1.53,-.55),"Warning")
    # piles and sorted bunkers
    for idx,(x,z,mat) in enumerate([(-5.8,-2.6,"Recycled"),(-3.7,-2.7,"Steel"),(-1.8,-2.7,"Recycled")]):
        b.box((1.75,.65,1.6),(x,.325,z),"Concrete"); pile(b,(x,.55,z),.66,30,mat,idx)
    # bales / storage
    for row in range(3):
        for col in range(5): bale(b,(4.4+col*.72,0,1.45+row*.58),.48,"Recycled" if (row+col)%2 else "Steel")
    # processing tanks / dust extraction
    b.cyl(.62,2.8,(7.1,1.4,-2.7),"Steel",sections=24); b.cyl(.22,2.1,(6.1,1.05,-2.6),"Graphite",sections=18)
    pipe_rack(b,(4.1,0,-2.9),(7.5,0,-2.9),1.65,.72,3)
    forklift(b,(2.5,0,1.9),.52,math.pi/2); forklift(b,(-5.0,0,2.35),.50,-math.pi/2)
    pallet_stack(b,(6.2,0,.95),2,3,.36,"Recycled")
    for x in (-7.0,-3.5,.2,4.0,7.2): street_light(b,(x,0,4.18),.68,math.pi/2)
    truck(b,(-5.9,0,3.2),.62,math.pi/2); truck(b,(6.6,0,3.2),.58,math.pi/2)
    landscaping_band(b,-8.8,8.3,4.35,1.0,.56)
    return b.scene()


def closing_scene():
    b=Builder("r4_close")
    b.box((24,.14,15),(0,-.07,0),"Ground",repeat=(12,8)); mountain_ridge(b,z=-7.9,width=26,height=4.0,seed=6); mountain_ridge(b,z=-9.0,width=28,height=2.5,seed=16); b.box((24,.025,1.7),(0,.01,-6.5),"Water")
    road(b,(0,0,1.65),21,1.05,"x"); road(b,(-1.0,0,-1.2),9.5,1.0,"z")
    # four zones with clearer spatial relationships
    building_shell(b,(-3.6,0,-1.7),(5.0,2.1,2.8),"Facade",True,5,2)
    building_shell(b,(3.4,0,-2.0),(4.2,1.9,2.5),"Graphite",True,6,0)
    building_shell(b,(6.4,0,2.4),(3.4,1.8,2.5),"Facade",True,3,1)
    building_shell(b,(-7.4,0,-3.7),(2.5,1.25,1.6),"White",True,1,0)
    for r in range(4):
        for c in range(7): solar_table(b,(-8.1+c*1.45,.58,2.9+r*.82),.50)
    battery_row(b,-3.7,6,.86,4.7,.56); substation(b,(.5,0,4.55),.72)
    chiller_bank(b,(1.8,0,-4.65),4,.9,.56); transformer_pad(b,(4.35,0,4.65),.68)
    turbine(b,(8.6,0,-2.4),.78,.0); turbine(b,(9.1,0,-5.0),.58,.2)
    # connected ecosystem light spine
    for x in np.linspace(-7.0,7.2,18): b.box((.46,.025,.035),(float(x),.10,1.65),"WarmGlow")
    for z in np.linspace(-3.8,4.8,12): b.box((.035,.025,.46),(-1.0,.10,float(z)),"CoolGlow")
    service_lane_details(b,-9.0,8.5,2.32,.74)
    for i,x in enumerate((-5.7,-4.5,-3.3,4.8,5.8)): parking_car(b,(x,0,.95),.40,math.pi/2,"White" if i%2 else "Facade")
    fence_line(b,(-1.9,0,3.55),(2.2,0,3.55),.68,.7)
    landscaping_band(b,-10.0,10.0,2.35,1.05,.58); landscaping_band(b,-9.2,8.3,-5.0,1.15,.52)
    truck(b,(-6.6,0,1.65),.56,math.pi/2); truck(b,(5.5,0,1.65),.56,math.pi/2)
    return b.scene()


SCENES={
    "hero-campus": hero_scene,
    "manufacturing": manufacturing_scene,
    "power-generation": generation_scene,
    "data-centers": datacenter_scene,
    "recycling": recycling_scene,
    "closing-platform": closing_scene,
}


def export_asset(name,factory):
    scene=factory(); path=OUT/f"{name}.glb"; path.write_bytes(scene.export(file_type="glb"))
    loaded=trimesh.load(path,force="scene")
    triangles=sum(len(g.faces) for g in loaded.geometry.values()); vertices=sum(len(g.vertices) for g in loaded.geometry.values())
    materials=sorted({getattr(g.visual.material,"name","unnamed") for g in loaded.geometry.values()}); digest=sha256(path.read_bytes()).hexdigest()
    item={"file":path.name,"bytes":path.stat().st_size,"triangles":triangles,"vertices":vertices,"meshGroups":len(loaded.geometry),"materials":materials,"sha256":digest}
    print(f"{name}: {item['bytes']:,} bytes | {triangles:,} tris | {len(materials)} mats | {item['meshGroups']} groups")
    return item


def fallback_svg(scene_id,index):
    labels={"hero-campus":"Integrated platform","manufacturing":"Solar manufacturing","power-generation":"Power generation","data-centers":"Data centers","recycling":"Recycling","closing-platform":"Connected ecosystem"}
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="{labels[scene_id]}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5f3ef"/><stop offset="1" stop-color="#e4e3de"/></linearGradient><linearGradient id="land" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#3d5a80"/><stop offset="1" stop-color="#b08d57"/></linearGradient></defs>
<rect width="1600" height="1000" fill="url(#bg)"/><path d="M0 610 Q250 500 430 570 T820 530 T1180 555 T1600 500 V1000 H0Z" fill="#d3d1ca"/><path d="M0 690 Q300 620 560 660 T1040 630 T1600 650 V1000H0Z" fill="#c3c2bc"/>
<rect x="720" y="440" width="520" height="230" rx="4" fill="#4c5050"/><rect x="770" y="485" width="410" height="70" fill="#1f2b2d"/><path d="M200 790H1350" stroke="url(#land)" stroke-width="4" opacity=".6"/>
<g font-family="Arial, sans-serif" fill="#2b2d2e"><text x="90" y="120" font-size="24" letter-spacing="7">0{index+1}</text><text x="90" y="182" font-size="52" font-weight="600">{labels[scene_id]}</text></g>
</svg>'''


def main():
    assets=[]
    for idx,(name,factory) in enumerate(SCENES.items()):
        assets.append(export_asset(name,factory)); (FALLBACK/f"{name}.svg").write_text(fallback_svg(name,idx),encoding="utf-8")
    manifest={
        "stage":"6-r4.1-cinematic-model-polish",
        "provenance":"Original Convalt visual-development environments authored procedurally from the R4 art-direction boards. Not client-supplied CAD and not approved factual site geometry.",
        "generatedWith":{"python":"3.x","trimesh":trimesh.__version__,"generator":"scripts/generate-r4-assets.py"},
        "runtimeIntent":"polished cinematic architectural visualization with consolidated material groups, selective transparency and mid-range GPU budgets",
        "textureSourceFormat":"512px PNG embedded in GLB; approved production art may be promoted to KTX2/Basis via existing pipeline",
        "budgets":{"maxTrianglesPerScene":180000,"maxMeshGroups":24,"maxGlbBytesPerScene":8388608},
        "assets":assets,
    }
    (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    print(f"TOTAL: {sum(a['bytes'] for a in assets):,} bytes | {sum(a['triangles'] for a in assets):,} triangles")

if __name__=="__main__": main()

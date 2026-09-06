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


SPECS = {
    "Ground": MaterialSpec("Ground", (150,150,141,255), "ground", .02, .94),
    "Asphalt": MaterialSpec("Asphalt", (74,76,74,255), "asphalt", .02, .92),
    "Concrete": MaterialSpec("Concrete", (199,197,190,255), "concrete", .02, .84),
    "Facade": MaterialSpec("Facade", (185,188,185,255), "facade", .42, .42),
    "Graphite": MaterialSpec("Graphite", (49,52,52,255), None, .35, .52, normal=False),
    "Steel": MaterialSpec("Steel", (142,148,146,255), "steel", .75, .32),
    "Bronze": MaterialSpec("Bronze", (168,137,91,255), "bronze", .54, .38, emissive=(.018,.012,.006)),
    "SolarGlass": MaterialSpec("SolarGlass", (45,76,93,255), "solar", .48, .20, normal=False),
    "BlackGlass": MaterialSpec("BlackGlass", (30,37,38,255), None, .52, .14, normal=False),
    "ServerFace": MaterialSpec("ServerFace", (28,34,34,255), "server", .30, .40, emissive=(.06,.045,.022), emissive_texture="emissive", normal=False),
    "Vegetation": MaterialSpec("Vegetation", (78,97,72,255), "vegetation", .02, .88),
    "Recycled": MaterialSpec("Recycled", (112,114,105,255), "recycled", .08, .76),
    "White": MaterialSpec("White", (229,228,222,255), None, .08, .72, normal=False),
    "RoadMark": MaterialSpec("RoadMark", (224,214,189,255), None, .0, .82, normal=False),
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


def tree(b:Builder,pos,scale=1.):
    b.cyl(.055*scale,.55*scale,(pos[0],pos[1]+.275*scale,pos[2]),"Bronze",sections=7)
    b.sphere(.36*scale,(pos[0],pos[1]+.72*scale,pos[2]),"Vegetation",sub=1)


def landscaping_band(b:Builder,x0,x1,z,spacing=.85,scale=.72):
    for i,x in enumerate(np.arange(x0,x1+1e-5,spacing)):
        tree(b,(float(x),0,z+math.sin(i*.8)*.09),scale*(.85+((i%3)*.08)))


def road(b:Builder,pos,length,width,axis="x",lane_marks=True):
    ext=(length,.08,width) if axis=="x" else (width,.08,length)
    b.box(ext,(pos[0],.02,pos[2]),"Asphalt",repeat=(length/2,width/2))
    # curbs
    if axis=="x":
        b.box((length,.12,.10),(pos[0],.08,pos[2]-width/2),"Concrete"); b.box((length,.12,.10),(pos[0],.08,pos[2]+width/2),"Concrete")
        if lane_marks:
            for x in np.arange(pos[0]-length/2+.7,pos[0]+length/2-.5,1.4): b.box((.62,.012,.04),(float(x),.07,pos[2]),"RoadMark")
    else:
        b.box((.10,.12,length),(pos[0]-width/2,.08,pos[2]),"Concrete"); b.box((.10,.12,length),(pos[0]+width/2,.08,pos[2]),"Concrete")
        if lane_marks:
            for z in np.arange(pos[2]-length/2+.7,pos[2]+length/2-.5,1.4): b.box((.04,.012,.62),(pos[0],.07,float(z)),"RoadMark")


def solar_table(b:Builder,pos,scale=1.,rot_y=0.,cols=2,rows=1):
    for row in range(rows):
        for col in range(cols):
            dx=(col-(cols-1)/2)*1.55*scale; dz=(row-(rows-1)/2)*.95*scale
            m=T(pos[0]+dx,pos[1],pos[2]+dz)@R(rot_y)@R(-.23,(1,0,0))
            b.add(trimesh.creation.box(extents=[1.42*scale,.045*scale,.82*scale]),"SolarGlass",m,repeat=(1,1))
            b.add(trimesh.creation.box(extents=[1.5*scale,.04*scale,.035*scale]),"Steel",m@T(0,-.045,.42*scale))
            b.add(trimesh.creation.box(extents=[1.5*scale,.04*scale,.035*scale]),"Steel",m@T(0,-.045,-.42*scale))
    for sx in (-.58,.58):
        b.box((.05*scale,.62*scale,.05*scale),(pos[0]+sx*scale,pos[1]-.34*scale,pos[2]),"Steel",rot_y=rot_y)


def turbine(b:Builder,pos,scale=1.,yaw=0.):
    tower_y=3.0*scale; b.cyl(.085*scale,6*scale,(pos[0],tower_y,pos[2]),"White",sections=18)
    hub=(pos[0],6.05*scale,pos[2]); b.sphere(.18*scale,hub,"White",sub=1)
    nacelle=trimesh.creation.box(extents=[.55*scale,.23*scale,.25*scale]); b.add(nacelle,"White",T(*hub)@R(yaw))
    for a in (0,2*math.pi/3,4*math.pi/3):
        blade=wedge(2.35*scale,.24*scale,.07*scale,.04*scale)
        b.add(blade,"White",T(*hub)@R(yaw)@R(a,(0,0,1)))


def rooftop_unit(b:Builder,pos,scale=1.):
    b.box((1.05*scale,.42*scale,.78*scale),(pos[0],pos[1]+.21*scale,pos[2]),"Graphite")
    b.cyl(.24*scale,.035*scale,(pos[0],pos[1]+.445*scale,pos[2]),"Steel",sections=16)


def truck(b:Builder,pos,scale=.75,rot_y=0.):
    # local coordinates; a simple but recognizable articulated delivery truck
    parts=[((1.1,.85,.9),(0,.55,0),"White"),((2.4,1.2,.9),(-1.55,.72,0),"Facade"),((.85,.36,.02),(.12,.62,.46),"BlackGlass")]
    for ext,p,mat in parts:
        b.add(trimesh.creation.box(extents=np.array(ext)*scale),mat,T(*pos)@R(rot_y)@T(*(np.array(p)*scale)))
    for x in (.35,-.35,-1.25,-2.0):
        for z in (-.48,.48):
            # wheel axis z in local-ish; enough at distance
            b.add(trimesh.creation.cylinder(radius=.19*scale,height=.11*scale,sections=14),"Graphite",T(*pos)@R(rot_y)@T(x*scale,.24*scale,z*scale)@R(math.pi/2,(1,0,0)))


def worker(b:Builder,pos,scale=.7):
    b.cyl(.13*scale,.7*scale,(pos[0],pos[1]+.35*scale,pos[2]),"Graphite",sections=10)
    b.sphere(.14*scale,(pos[0],pos[1]+.85*scale,pos[2]),"Bronze",sub=1)
    b.cyl(.045*scale,.55*scale,(pos[0]-.12*scale,pos[1]-.23*scale,pos[2]),"Graphite",sections=8)
    b.cyl(.045*scale,.55*scale,(pos[0]+.12*scale,pos[1]-.23*scale,pos[2]),"Graphite",sections=8)


def building_shell(b:Builder,center,size,material="Facade",glass=True,roof_units=0,loading_bays=0):
    x,y,z=center; sx,sy,sz=size
    b.box(size,(x,y+sy/2,z),material,repeat=(max(1,sx/2),max(1,sy/1.5)))
    # slightly darker plinth
    b.box((sx+.08,.18,sz+.08),(x,y+.09,z),"Graphite")
    if glass:
        # glazing band on camera-facing +z side
        b.box((sx*.72,sy*.28,.035),(x,y+sy*.54,z+sz/2+.02),"BlackGlass")
        for i in range(max(3,int(sx/1.25))):
            count=max(3,int(sx/1.25))
            xx=x-sx*.34+i*(sx*.68/max(1,count-1))
            b.box((.025,sy*.28,.05),(xx,y+sy*.54,z+sz/2+.04),"Steel")
    if roof_units:
        for i in range(roof_units):
            cols=max(1,int(math.sqrt(roof_units))); row=i//cols; col=i%cols
            rooftop_unit(b,(x-sx*.28+col*.95,y+sy,z-sz*.22+row*.82),.62)
    if loading_bays:
        for i in range(loading_bays):
            xx=x-sx*.32+i*(sx*.64/max(1,loading_bays-1))
            b.box((.7,1.0,.03),(xx,y+.55,z+sz/2+.04),"Graphite")
            b.box((.78,.08,.12),(xx,y+.08,z+sz/2+.10),"Concrete")


def battery_row(b:Builder,start,count,step,z,scale=.75):
    for i in range(count):
        x=start+i*step
        b.box((1.1*scale,1.1*scale,1.9*scale),(x,.55*scale,z),"White")
        for y in (.28,.52,.76): b.box((.65*scale,.025,.04),(x,y*scale,z+.96*scale),"CoolGlow")


def substation(b:Builder,center,scale=1.):
    x,_,z=center
    b.box((4.6*scale,.08,3.3*scale),(x,.04,z),"Concrete")
    # bus frames + transformers
    for i in range(4):
        xx=x-1.5*scale+i*1.0*scale
        b.cyl(.045*scale,1.8*scale,(xx,.9*scale,z-.7*scale),"Steel",sections=8)
        b.cyl(.045*scale,1.8*scale,(xx,.9*scale,z+.7*scale),"Steel",sections=8)
        b.cyl_between((xx,1.75*scale,z-.7*scale),(xx,1.75*scale,z+.7*scale),.035*scale,"Steel",8)
    for xx in (x-1.0*scale,x+1.0*scale):
        b.box((.8*scale,.85*scale,1.0*scale),(xx,.45*scale,z),"Graphite")
        for dz in (-.35,0,.35): b.cyl(.09*scale,.45*scale,(xx,.98*scale,z+dz*scale),"Bronze",sections=10)


def industrial_frame(b:Builder,x0,x1,z0,z1,height=3.3,bays=7):
    for x in np.linspace(x0,x1,bays+1):
        b.box((.12,height,.12),(float(x),height/2,z0),"Steel")
        b.box((.12,height,.12),(float(x),height/2,z1),"Steel")
        b.cyl_between((float(x),height,z0),(float(x),height,z1),.055,"Steel",8)
    b.cyl_between((x0,height,z0),(x1,height,z0),.06,"Steel",8); b.cyl_between((x0,height,z1),(x1,height,z1),.06,"Steel",8)


def conveyor(b:Builder,start,end,width=.9,height=.55):
    p1=np.array(start,float); p2=np.array(end,float); v=p2-p1; length=float(np.linalg.norm(v[[0,2]])); yaw=math.atan2(v[0],v[2])
    mid=(p1+p2)/2; b.box((width,.12,length),(mid[0],height,mid[2]),"Graphite",rot_y=yaw)
    for t in np.linspace(.05,.95,max(6,int(length/.45))):
        p=p1*(1-t)+p2*t; b.cyl(.055,width*1.04,(p[0],height+.065,p[2]),"Steel",axis="x",sections=10)


def robot_arm(b:Builder,base,scale=.8,angle=.2):
    x,y,z=base
    b.cyl(.18*scale,.18*scale,(x,y+.09*scale,z),"Graphite",sections=14)
    p0=(x,y+.18*scale,z); p1=(x+.32*scale*math.cos(angle),y+.75*scale,z+.20*scale); p2=(x+.85*scale,y+1.20*scale,z+.18*scale)
    b.cyl_between(p0,p1,.075*scale,"White",12); b.sphere(.11*scale,p1,"Bronze",1)
    b.cyl_between(p1,p2,.065*scale,"White",12); b.sphere(.095*scale,p2,"Bronze",1)
    b.box((.30*scale,.08*scale,.24*scale),(p2[0]+.12*scale,p2[1],p2[2]),"Graphite")


def data_rack(b:Builder,pos,scale=.72):
    x,y,z=pos; b.box((.70*scale,2.35*scale,.95*scale),(x,y+1.175*scale,z),"Graphite")
    b.box((.60*scale,2.12*scale,.03),(x,y+1.18*scale,z+.49*scale),"ServerFace",repeat=(1,4))
    b.box((.60*scale,2.12*scale,.03),(x,y+1.18*scale,z-.49*scale),"ServerFace",repeat=(1,4))
    for sx in (-.31,.31): b.box((.035*scale,2.22*scale,.05),(x+sx*scale,y+1.18*scale,z+.51*scale),"Steel")


def bale(b:Builder,pos,scale=.55,mat="Recycled"):
    x,y,z=pos; b.box((1.1*scale,.75*scale,.75*scale),(x,y+.375*scale,z),mat,repeat=(2,2))
    for dx in (-.38,0,.38): b.box((.025,.78*scale,.78*scale),(x+dx*scale,y+.39*scale,z),"Steel")


def pile(b:Builder,center,scale=1.,count=30,mat="Recycled",seed=0):
    rng=np.random.default_rng(5000+seed)
    for _ in range(count):
        a=float(rng.uniform(0,2*math.pi)); r=float(rng.uniform(.05,1))*1.1*scale; s=float(rng.uniform(.10,.24))*scale
        x=center[0]+math.cos(a)*r; z=center[2]+math.sin(a)*r; y=center[1]+s*.45+max(0,1-r/(1.15*scale))*.35*scale
        b.sphere(s,(x,y,z),mat,sub=1)


def hero_scene():
    b=Builder("r4_hero")
    b.box((20,.16,13),(0,-.08,0),"Ground",repeat=(10,7)); mountain_ridge(b,z=-7.0,width=22,height=3.4,seed=1)
    # lake / distant water strip
    b.box((21,.03,1.4),(0,.02,-5.7),"Water")
    road(b,(0,0,1.45),18,1.15,"x"); road(b,(-1.5,0,-.4),8.5,1.0,"z")
    building_shell(b,(-2.7,0,-1.4),(5.6,2.2,3.0),"Facade",True,6,3)
    building_shell(b,(3.4,0,-2.2),(4.1,2.0,2.5),"Graphite",True,6,0)
    building_shell(b,(4.9,0,2.35),(3.2,1.85,2.4),"Facade",True,3,2)
    # solar foreground
    for r in range(4):
        for c in range(7): solar_table(b,(-7.2+c*1.55,.64,2.9+r*.92),.58)
    battery_row(b,-3.4,6,.92,3.85,.62); substation(b,(.4,0,3.8),.72)
    turbine(b,(7.0,0,-.7),.82,-.15); turbine(b,(8.0,0,-4.1),.62,.1)
    # roads/campus greenery
    landscaping_band(b,-8.4,8.4,1.95,.95,.68); landscaping_band(b,-8.0,7.4,-4.4,1.15,.58)
    for x in (-5.7,6.2): truck(b,(x,0,1.4),.60,rot_y=math.pi/2)
    return b.scene()


def manufacturing_scene():
    b=Builder("r4_manufacturing")
    b.box((18,.14,11),(0,-.07,0),"Concrete",repeat=(9,6)); mountain_ridge(b,z=-6.2,width=20,height=2.8,seed=2)
    # exterior loading court to left / production hall to right, open camera-facing side
    building_shell(b,(-5.2,0,-2.4),(5.1,2.9,3.0),"Facade",True,4,4)
    for z in (-.5,2.7): road(b,(-4.9,0,z),5.6,1.0,"x")
    truck(b,(-6.1,0,-.45),.63,rot_y=math.pi/2); truck(b,(-4.5,0,-.45),.63,rot_y=math.pi/2)
    # primary high bay steel structure
    industrial_frame(b,-2.0,7.4,-3.65,3.65,3.8,8)
    # partial roof strips / skylights
    for x in np.linspace(-1.5,6.9,7):
        b.box((.85,.08,7.2),(float(x),3.78,0),"White"); b.box((.32,.035,7.0),(float(x)+.18,3.83,0),"BlackGlass")
    # module production cells / conveyors
    conveyor(b,(-1.7,0,1.65),(6.7,0,1.65),1.05,.55)
    conveyor(b,(-1.7,0,-.2),(6.2,0,-.2),.85,.62)
    for i,x in enumerate(np.linspace(-1.1,5.8,6)):
        solar_table(b,(float(x),1.06,1.65),.42,cols=1)
        robot_arm(b,(float(x)-.20,.04,.45),.72,angle=.25+i*.05)
    # inspection tunnels and material staging
    for x in (1.0,4.3):
        b.box((1.2,1.65,1.5),(x,.83,-1.65),"Graphite"); b.box((.86,.7,.03),(x,1.15,-.88),"BlackGlass")
    for row in range(3):
        for col in range(4): b.box((.72,.08,1.05),(4.7+col*.78,.14+row*.10,3.05),"SolarGlass")
    # lighting/service spines
    for z in (-2.8,-1.1,.7,2.5): b.box((8.7,.045,.045),(2.8,3.15,z),"WarmGlow")
    for p in [(-.7,0,2.75),(2.6,0,-2.7),(5.8,0,2.8)]: worker(b,p,.72)
    landscaping_band(b,-7.7,-3.0,4.35,.82,.55)
    return b.scene()


def generation_scene():
    b=Builder("r4_generation")
    b.box((22,.14,14),(0,-.07,0),"Ground",repeat=(12,8)); mountain_ridge(b,z=-7.4,width=24,height=3.8,seed=3); b.box((22,.025,1.5),(0,.01,-6.0),"Water")
    road(b,(0,0,1.0),20,1.0,"x"); road(b,(2.8,0,-1.8),9,1.0,"z")
    # dense but organized solar fields
    for r in range(6):
        for c in range(9): solar_table(b,(-8.0+c*1.75,.62,-2.8+r*.88),.55)
    turbine(b,(7.2,0,-3.7),.96,-.2); turbine(b,(4.9,0,-5.0),.70,.1); turbine(b,(9.2,0,-5.4),.60,-.1)
    substation(b,(4.1,0,3.7),.92); battery_row(b,6.9,5,.78,3.55,.56)
    # inverter/transformer pads sprinkled along field edge
    for x in (-6.6,-3.4,-.2,2.8):
        b.box((1.0,.65,.75),(x,.34,2.95),"White"); b.box((.65,.025,.03),(x,.45,3.34),"CoolGlow")
    landscaping_band(b,-9.3,9.5,1.7,1.05,.58); landscaping_band(b,-8.8,7.2,-5.0,1.2,.50)
    truck(b,(1.3,0,1.0),.58,math.pi/2)
    return b.scene()


def datacenter_scene():
    b=Builder("r4_datacenters")
    b.box((20,.14,12),(0,-.07,0),"Ground",repeat=(10,6)); mountain_ridge(b,z=-6.6,width=22,height=3.0,seed=4); b.box((19,.025,1.25),(0,.01,-5.3),"Water")
    road(b,(0,0,2.7),18,1.05,"x"); road(b,(-5.0,0,-.2),7.0,1.0,"z")
    # campus halls
    building_shell(b,(-1.2,0,-1.4),(6.3,2.5,3.2),"Facade",True,12,0)
    building_shell(b,(5.4,0,-2.2),(4.4,2.25,2.7),"Facade",True,8,0)
    building_shell(b,(5.0,0,1.1),(3.6,1.8,2.0),"Graphite",True,4,0)
    # visible glass-front server gallery on main hall
    for row in range(2):
        for col in range(6): data_rack(b,(-3.55+col*.86,.15,-.15+row*.86),.48)
    # cooling plant / tanks / pipes
    for x in (-7.1,-6.0,-4.9): b.cyl(.55,2.2,(x,1.1,-2.8),"Steel",sections=24)
    for x in (-7.3,-6.1,-4.9):
        b.cyl_between((x,2.15,-2.8),(x,2.15,-.55),.08,"Steel",10)
    substation(b,(-6.4,0,1.0),.75)
    # perimeter/service
    for x in np.arange(-8.4,8.5,1.2): b.box((.05,.75,.05),(float(x),.38,4.5),"Steel")
    for x in (-6.8,6.6): truck(b,(x,0,2.7),.58,math.pi/2)
    landscaping_band(b,-8.8,8.8,3.7,.92,.60); landscaping_band(b,-8.2,7.8,-4.45,1.15,.52)
    return b.scene()


def recycling_scene():
    b=Builder("r4_recycling")
    b.box((20,.14,12),(0,-.07,0),"Ground",repeat=(10,6)); mountain_ridge(b,z=-6.5,width=22,height=3.2,seed=5)
    road(b,(-1.0,0,3.2),17.5,1.2,"x"); road(b,(-6.8,0,.4),6.4,1.0,"z")
    building_shell(b,(3.6,0,-1.5),(7.3,2.8,3.4),"Facade",True,5,2)
    # intake canopy
    b.box((4.4,.18,2.4),(-5.3,2.25,.5),"Facade")
    for x in np.linspace(-7.1,-3.5,5): b.box((.10,2.2,.10),(float(x),1.1,-.5),"Steel"); b.box((.10,2.2,.10),(float(x),1.1,1.5),"Steel")
    conveyor(b,(-5.9,0,-.55),(0.5,0,-.55),1.15,.70); conveyor(b,(-.1,0,-.55),(3.1,0,-2.2),.95,1.15)
    conveyor(b,(-.1,0,-.55),(3.1,0,.95),.95,1.15)
    # separator cells / optical sorters
    for x in (-2.0,-.4,1.2):
        b.box((1.15,1.5,1.4),(x,.75,-.55),"Graphite"); b.box((.65,.45,.03),(x,1.05,.17),"BlackGlass")
    # piles and sorted bunkers
    for idx,(x,z,mat) in enumerate([(-5.8,-2.6,"Recycled"),(-3.7,-2.7,"Steel"),(-1.8,-2.7,"Recycled")]):
        b.box((1.75,.65,1.6),(x,.325,z),"Concrete"); pile(b,(x,.55,z),.66,30,mat,idx)
    # bales / storage
    for row in range(3):
        for col in range(5): bale(b,(4.4+col*.72,0,1.45+row*.58),.48,"Recycled" if (row+col)%2 else "Steel")
    # processing tanks / dust extraction
    b.cyl(.62,2.8,(7.1,1.4,-2.7),"Steel",sections=24); b.cyl(.22,2.1,(6.1,1.05,-2.6),"Graphite",sections=18)
    truck(b,(-5.9,0,3.2),.62,math.pi/2); truck(b,(6.6,0,3.2),.58,math.pi/2)
    landscaping_band(b,-8.8,8.3,4.35,1.0,.56)
    return b.scene()


def closing_scene():
    b=Builder("r4_close")
    b.box((24,.14,15),(0,-.07,0),"Ground",repeat=(12,8)); mountain_ridge(b,z=-7.9,width=26,height=4.0,seed=6); b.box((24,.025,1.7),(0,.01,-6.5),"Water")
    road(b,(0,0,1.65),21,1.05,"x"); road(b,(-1.0,0,-1.2),9.5,1.0,"z")
    # four zones with clearer spatial relationships
    building_shell(b,(-3.6,0,-1.7),(5.0,2.1,2.8),"Facade",True,5,2)
    building_shell(b,(3.4,0,-2.0),(4.2,1.9,2.5),"Graphite",True,6,0)
    building_shell(b,(6.4,0,2.4),(3.4,1.8,2.5),"Facade",True,3,1)
    for r in range(4):
        for c in range(7): solar_table(b,(-8.1+c*1.45,.58,2.9+r*.82),.50)
    battery_row(b,-3.7,6,.86,4.7,.56); substation(b,(.5,0,4.55),.72)
    turbine(b,(8.6,0,-2.4),.78,.0); turbine(b,(9.1,0,-5.0),.58,.2)
    # connected ecosystem light spine
    for x in np.linspace(-7.0,7.2,18): b.box((.46,.025,.035),(float(x),.10,1.65),"WarmGlow")
    for z in np.linspace(-3.8,4.8,12): b.box((.035,.025,.46),(-1.0,.10,float(z)),"CoolGlow")
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
        "stage":"6-r4-visual-fidelity",
        "provenance":"Original Convalt visual-development environments authored procedurally from the R4 art-direction boards. Not client-supplied CAD and not approved factual site geometry.",
        "generatedWith":{"python":"3.x","trimesh":trimesh.__version__,"generator":"scripts/generate-r4-assets.py"},
        "runtimeIntent":"near-realistic cinematic architectural visualization with consolidated material groups and mid-range GPU budgets",
        "textureSourceFormat":"512px PNG embedded in GLB; approved production art may be promoted to KTX2/Basis via existing pipeline",
        "budgets":{"maxTrianglesPerScene":180000,"maxMeshGroups":24,"maxGlbBytesPerScene":8388608},
        "assets":assets,
    }
    (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    print(f"TOTAL: {sum(a['bytes'] for a in assets):,} bytes | {sum(a['triangles'] for a in assets):,} triangles")

if __name__=="__main__": main()

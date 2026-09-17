"""R6.1.6 additive, metre-scaled hard-surface detailing.

All anchors come from the existing hero recipes, never the whole-site bounds.
No roads, vehicles or unattached animated mechanical assemblies are generated.
LOD2 omits small hardware; its proxy is still derived by the existing reducer.
"""
from __future__ import annotations
import math
import numpy as np
import trimesh
from shared import bevel_box


def project_faces(mesh):
    """Face-space UVs, including vertical walls; keep architectural edges hard."""
    result = mesh.copy()
    result.unmerge_vertices()
    points = np.asarray(result.vertices).reshape(-1, 3, 3)
    axes = np.argmax(np.abs(result.face_normals), axis=1)
    uv = np.zeros((len(points), 3, 2))
    for axis, pair in enumerate(((2, 1), (0, 2), (0, 1))):
        mask = axes == axis
        uv[mask] = points[mask][:, :, pair] / 1.5
    material = mesh.visual.material
    result.visual = trimesh.visual.TextureVisuals(uv=uv.reshape(-1, 2), material=material)
    return result


def envelope(b, center, size, high):
    x, y, z = center; w, h, d = size
    floor, roof = y - h/2, y + h/2
    # Ground-bearing concrete upstand and standing-seam roof ribs.
    bevel_box(b, (w+.12, .12, d+.12), (x, floor+.06, z), "Concrete", .018)
    for xx in np.linspace(x-w*.46, x+w*.46, 19 if high else 10):
        b.box((.018, .026, d*.94), (float(xx), roof+.013, z), "Aluminum")
    b.box((w, .07, .09), (x, roof-.035, z-d/2-.035), "Steel")
    for xx in (x-w*.46, x+w*.46):
        b.cyl(.027, h-.10, (xx, y-.05, z-d/2-.06), "Aluminum", sections=12)
    for zz in np.linspace(z-d*.42, z+d*.42, 9 if high else 5):
        b.box((.014, h*.82, .014), (x+w/2+.003, y, float(zz)), "Graphite")


def coil_faces(b, pos, scale, high):
    x, y, z = pos
    # Original rooftop_unit housing spans y..y+.42*s and z+/-.39*s.
    for sign in (-1, 1):
        face = z+sign*.395*scale
        b.box((.80*scale, .23*scale, .016*scale), (x, y+.20*scale, face), "Steel")
        for xx in np.linspace(x-.37*scale, x+.37*scale, 11 if high else 6):
            b.box((.015*scale, .21*scale, .025*scale), (float(xx), y+.20*scale, face), "Aluminum")
    # Protective grille over the existing fan well, not an unattached rotor.
    if high:
        b.torus(.215*scale, .010*scale, (x, y+.463*scale, z), "Aluminum", rot=(math.pi/2,0,0))
        b.cyl_between((x-.22*scale,y+.472*scale,z),(x+.22*scale,y+.472*scale,z),.008*scale,"Aluminum",8)


def build(ctx, hero, level):
    b = ctx.r4.Builder(f"r616-{hero}-lod{level}")
    if level == 2:
        return b.scene()
    high = level == 0
    if hero == "integrated-campus":
        envelope(b,(1.1,1.275,-.25),(5.4,2.55,2.9),high)
        density = 1 if high else .72
        for x in (-.6,.4,1.4,2.4):
            coil_faces(b,(x,2.66,-.35),.48*density+.18,high)
    elif hero == "data-center-cooling":
        envelope(b,(1.,1.55,-.85),(7.8,3.10,4.25),high)
        for row in range(2 if high else 1):
            for x in np.linspace(-5.7,-1.8,5 if high else 3):
                coil_faces(b,(float(x),.06,-2.55+row*1.15),.66 if high else .56,high)
        if high:
            for x in (-1.6,-.2,1.2,2.6,4.):
                coil_faces(b,(x,3.18,-.85),.34,True)
        for z in (-.30,-1.05):
            for x in (-5.45,-4.25,-3.05,-2.25):
                b.cyl(.079,.065,(x,1.18,z),"Aluminum",axis="x",sections=16)
    elif hero == "substation-bess":
        for x in np.linspace(-.2,5.8,6 if high else 4):
            for z in (.11,.45,.79):
                for y in np.linspace(1.13,1.47,5 if high else 3):
                    b.cyl(.12,.027,(float(x),float(y),z),"White",sections=16)
            for z in np.linspace(.02,.88,9 if high else 5):
                for sign in (-1,1):
                    b.box((.055,.72,.036),(float(x)+sign*.415,.58,float(z)),"Steel")
        for x in np.linspace(-5.8,-1.8,5 if high else 3):
            b.box((.024,.30,.045),(float(x)+.41,.76,2.42),"Aluminum")
            b.box((.19,.085,.018),(float(x)-.27,1.12,2.412),"Warning")
    elif hero == "recycling-intake":
        envelope(b,(3.,1.375,-1.75),(7.2,2.75,3.55),high)
        for x in np.linspace(-5.6,5.4,12 if high else 7):
            for z in (.55,1.17):
                b.box((.12,.62,.12),(float(x),.31,z),"Steel")
                b.box((.26,.035,.26),(float(x),.0175,z),"Concrete")
        for x, s in ((-2.6,.86 if high else .70),(-.25,.78 if high else .66)):
            for sign in (-1,1):
                b.cyl(.455*s,.055*s,(x+sign*.77*s,.85*s,.85),"Aluminum",axis="x",sections=32)
    elif hero == "connected-campus":
        for pos,size in [((-3.7,1.15,-1.6),(4.9,2.3,2.8)),((2.2,1.,-2.),(4.2,2.,2.6)),((5.4,.92,1.7),(3.1,1.84,2.2))]:
            envelope(b,pos,size,high)
            for x in np.linspace(pos[0]-size[0]*.30,pos[0]+size[0]*.30,5 if high else 3):
                coil_faces(b,(float(x),pos[1]+size[1]/2+.03,pos[2]),.38,high)
    else:
        raise ValueError(f"No additive geometry recipe for {hero}")
    scene = b.scene()
    for name in list(scene.geometry):
        scene.geometry[name] = project_faces(scene.geometry[name])
    return scene

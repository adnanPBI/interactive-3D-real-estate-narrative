from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, glass_band, safety_rail

def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-connected-{lod}"), r4)
    high=lod=="lod0"; medium=lod=="lod1"
    # Closing hero is intentionally a curated campus skyline rather than another
    # dense machinery close-up.  Bevelled landmark shells catch the late light.
    landmarks=[((-3.7,1.15,-1.6),(4.9,2.30,2.8)),((2.2,1.0,-2.0),(4.2,2.0,2.6)),((5.4,.92,1.7),(3.1,1.84,2.2))]
    for i,(pos,size) in enumerate(landmarks):
        bevel_box(b,size,pos,"Facade",.11 if high else .075)
        glass_band(b,(pos[0],pos[1],pos[2]),size[0]*.64,size[1]*.20,size[2]/2+.025,8 if high else 5)
        if lod in ("lod0","lod1"):
            for x in np.linspace(pos[0]-size[0]*.30,pos[0]+size[0]*.30,4 if high else 2): r4.rooftop_unit(b,(float(x),pos[1]+size[1]/2+.03,pos[2]),.38)
    # Energy spine visually connects the divisions.
    r4.pipe_rack(b,(-1.4,0,3.5),(5.8,0,3.5),1.42,.68,5 if high else 3)
    safety_rail(b,(-7.5,0,4.25),(7.1,0,4.25),.70,26 if high else 14)
    if lod in ("lod0","lod1"):
        r5.dense_switchyard(b,(.4,0,4.2),high)
        for x in np.linspace(-7.8,-1.5,7 if high else 4): r4.solar_table(b,(float(x),.58,-4.2),.42)
        r5.high_turbine(b,(8.5,0,-3.4),.72 if high else .58,-.08)
    if high:
        for x in (-6.8,-4.4,-2.0,5.8): r4.street_light(b,(x,0,2.65),.72,1.57)
        for p in [(-6.6,0,3.0),(-5.4,0,3.0),(6.4,0,3.0)]: r4.tree(b,p,.60)
    return b.scene()

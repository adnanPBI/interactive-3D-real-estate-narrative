from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, glass_band, safety_rail, service_stair


def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-connected-{lod}"), r4)
    high=lod=="lod0"; medium=lod=="lod1"

    # Curated campus skyline with distinct envelope systems and mechanical roofs.
    landmarks=[((-3.7,1.15,-1.6),(4.9,2.30,2.8)),((2.2,1.0,-2.0),(4.2,2.0,2.6)),((5.4,.92,1.7),(3.1,1.84,2.2))]
    for i,(pos,size) in enumerate(landmarks):
        bevel_box(b,size,pos,"Facade",.11 if high else .075)
        glass_band(b,(pos[0],pos[1],pos[2]),size[0]*.66,size[1]*.22,size[2]/2+.025,10 if high else 6)
        # Vertical mullions and horizontal floor datum lines give each building a
        # readable façade rhythm at the closing wide shot.
        face_z = pos[2] + size[2]/2 + .045
        for x in np.linspace(pos[0]-size[0]*.40,pos[0]+size[0]*.40,8 if high else 5):
            b.box((.035,size[1]*.80,.055),(float(x),pos[1],face_z),"Aluminum")
        for y in np.linspace(pos[1]-size[1]*.28,pos[1]+size[1]*.28,3):
            b.box((size[0]*.84,.025,.055),(pos[0],float(y),face_z),"Aluminum")
        # Parapet coping / corner trims.
        b.box((size[0]+.12,.10,.08),(pos[0],pos[1]+size[1]/2+.04,pos[2]-size[2]/2),"Aluminum")
        b.box((size[0]+.12,.10,.08),(pos[0],pos[1]+size[1]/2+.04,pos[2]+size[2]/2),"Aluminum")
        if lod in ("lod0","lod1"):
            for x in np.linspace(pos[0]-size[0]*.30,pos[0]+size[0]*.30,5 if high else 3):
                r4.rooftop_unit(b,(float(x),pos[1]+size[1]/2+.03,pos[2]),.38)
            if high:
                r5.cable_tray(
                    b,
                    (pos[0]-size[0]*.34,0,pos[2]+size[2]*.28),
                    (pos[0]+size[0]*.34,0,pos[2]+size[2]*.28),
                    pos[1]+size[1]/2+.32,3,.62,
                )

    # Energy spine visually connects the divisions.
    r4.pipe_rack(b,(-1.4,0,3.5),(5.8,0,3.5),1.42,.68,6 if high else 4)
    safety_rail(b,(-7.5,0,4.25),(7.1,0,4.25),.70,30 if high else 16)

    if lod in ("lod0","lod1"):
        r5.dense_switchyard(b,(.4,0,4.2),high)
        for x in np.linspace(-7.8,-1.5,8 if high else 5):
            r4.solar_table(b,(float(x),.58,-4.2),.42)
        r5.high_turbine(b,(8.5,0,-3.4),.72 if high else .58,-.08)
        # Service path, utility cabinets and maintenance access.
        b.box((13.8,.08,.84),(-.30,.04,2.82),"Concrete")
        b.box((13.4,.035,.42),(-.30,.09,2.82),"Graphite")
        for x in (-5.9,-4.8,5.7):
            r5.control_cabinet(b,(x,0,2.25),.46,"CoolGlow")
        service_stair(b,(6.55,0,1.65),.62,1.15,1.0,8,3.14)

    if high:
        for x in (-6.8,-4.4,-2.0,5.8):
            r4.street_light(b,(x,0,2.65),.72,1.57)
        for p in [(-6.6,0,3.0),(-5.4,0,3.0),(6.4,0,3.0)]:
            r4.tree(b,p,.60)
        for x in (-6.0,-5.0,-4.0,4.8,5.7):
            r4.parking_car(b,(x,0,2.82),.30,1.57,"Facade" if x < 0 else "White")

    return b.scene()

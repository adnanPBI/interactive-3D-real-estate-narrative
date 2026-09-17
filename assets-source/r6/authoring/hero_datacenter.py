from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, glass_band, louver_bank, safety_rail, cable_bundle, service_stair


def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-datacenter-{lod}"), r4)
    high=lod=="lod0"; medium=lod=="lod1"

    # The clean context removes the three legacy campus halls. This R6 shell is
    # now the only main building occupying this volume.
    bevel_box(b,(7.8,3.10,4.25),(1.0,1.55,-.85),"Facade",.13)
    glass_band(b,(1.0,1.45,-.85),5.2,.92,2.16,12 if high else 8)
    for x in np.linspace(-2.1,4.1,15 if high else 9):
        b.box((.035,2.52,.10),(float(x),1.45,1.32),"Aluminum")
    for y in (.48,1.05,1.63,2.22,2.82):
        b.box((6.35,.03,.085),(1.0,y,1.34),"Aluminum")
    for z in (-2.93,1.23):
        b.box((7.95,.11,.09),(1.0,3.14,z),"Aluminum")
    for x in (-2.88,4.88):
        b.box((.09,.11,4.32),(x,3.14,-.85),"Aluminum")
    louver_bank(b,(1.0,.75,1.335),13 if high else 8,5 if high else 3,scale=.98)

    # Secondary admin/electrical block is deliberately separated from the main
    # hall instead of being stacked on the legacy R4/R5 buildings.
    if lod in ("lod0","lod1"):
        bevel_box(b,(2.45,1.85,2.25),(6.35,.925,-2.05),"Graphite",.09)
        glass_band(b,(6.35,.90,-2.05),1.65,.48,1.15,5 if high else 3)

    # Mechanical cooling plant. R4 cooling towers/chillers/pipe rack are removed
    # from the clean context, so these rows are the single source of geometry.
    for row in range(2 if high else 1):
        for col,x in enumerate(np.linspace(-5.7,-1.8,5 if high else 3)):
            z=-2.55+row*1.15
            r4.rooftop_unit(b,(float(x),.06,z),.66 if high else .56)
            if high:
                b.cyl(.085,.38,(float(x)+.24,.30,z-.22),"Aluminum",sections=18)
                b.cyl(.085,.38,(float(x)-.24,.30,z+.22),"Aluminum",sections=18)

    r4.pipe_rack(b,(-6.3,0,-.50),(-1.8,0,-.50),1.82,.72,7 if high else 4)
    cable_bundle(b,(-6.0,2.15,-.25),(-1.9,2.15,-.25),7 if high else 4,.016,material="Bronze")
    safety_rail(b,(-6.3,0,-3.2),(-1.6,0,-3.2),.78,18 if high else 10)

    if lod in ("lod0","lod1"):
        # One authored fan deck only; the old R5 fan layer is intentionally not inherited.
        r5.fan_bank(b,(-5.65,.86,-2.85),6 if high else 4,2 if high else 1,.70,.58)
        for x in (-5.6,-4.2,-2.8):
            r5.control_cabinet(b,(x,0,1.65),.62,"CoolGlow")
        for x in np.linspace(-6.3,-2.0,4 if high else 3):
            r4.transformer_pad(b,(float(x),0,2.85),.56)
        r5.cable_tray(b,(-6.0,0,1.10),(-1.75,0,1.10),2.35,5 if high else 3,.82)
        service_stair(b,(4.65,0,1.00),.68,1.35,1.10,9,3.14)
        # Cooling-water headers are offset from the pipe rack to remove the
        # screenshot-3 coplanar/near-coplanar horizontal service bundle.
        for z in (-1.15,-1.55):
            b.cyl_between((-5.9,1.18,z),(-2.0,1.18,z),.055,"Bronze",14)
        for x in (-5.5,-4.3,-3.1,-2.1):
            b.cyl(.055,1.15,(x,.575,-1.15),"Bronze",sections=14)

    if high:
        for row in range(3):
            for col in range(8):
                r4.data_rack(b,(-1.8+col*.62,.06,2.75+row*.53),.34)
        b.box((6.2,.07,.75),(1.0,3.18,-.85),"Graphite")
        safety_rail(b,(-1.95,3.18,-1.18),(3.95,3.18,-1.18),.62,18)
        for x in (-1.6,-.2,1.2,2.6,4.0):
            r4.rooftop_unit(b,(x,3.18,-.85),.34)
        for p in [(-.4,0,2.3),(1.8,0,2.4),(3.6,0,2.3)]:
            r4.worker(b,p,.58)
        for x in (-5.9,-4.7,-3.5,-2.3):
            r4.street_light(b,(x,0,3.65),.58,1.57)

    return b.scene()

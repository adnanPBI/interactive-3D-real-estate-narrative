from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, glass_band, louver_bank, safety_rail, cable_bundle

def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-datacenter-{lod}"), r4)
    high=lod=="lod0"; medium=lod=="lod1"
    # Main white-space block with premium curtain-wall lobby and deep cooling yard.
    bevel_box(b,(7.8,3.10,4.25),(1.0,1.55,-.85),"Facade",.13)
    glass_band(b,(1.0,1.45,-.85),5.2,.92,2.16,10 if high else 7)
    for x in np.linspace(-2.1,4.1,13 if high else 8): b.box((.035,2.52,.10),(float(x),1.45,1.32),"Aluminum")
    louver_bank(b,(1.0,.75,1.335),11 if high else 7,4 if high else 3,scale=.98)
    # Mechanical cooling plant: fan decks + chillers + pipe manifold.
    for row in range(2 if high else 1):
        for col,x in enumerate(np.linspace(-5.7,-1.8,5 if high else 3)):
            z=-2.55+row*1.15
            r4.rooftop_unit(b,(float(x),.06,z),.66 if high else .56)
    r4.pipe_rack(b,(-6.3,0,-.45),(-1.8,0,-.45),1.85,.72,6 if high else 3)
    r4.pipe_rack(b,(-6.3,0,-1.2),(-1.8,0,-1.2),1.55,.62,4 if high else 2)
    cable_bundle(b,(-6.0,2.15,-.30),(-1.9,2.15,-.30),6 if high else 3,.016,material="Bronze")
    safety_rail(b,(-6.3,0,-3.2),(-1.6,0,-3.2),.78,15 if high else 9)
    if lod in ("lod0","lod1"):
        r5.fan_bank(b,(-5.65,.86,-2.85),6 if high else 4,2 if high else 1,.70,.58)
        for x in (-5.6,-4.2,-2.8): r5.control_cabinet(b,(x,0,1.65),.62,"CoolGlow")
        for x in np.linspace(-6.3,-2.0,4 if high else 3): r4.transformer_pad(b,(float(x),0,2.85),.56)
    if high:
        for row in range(3):
            for col in range(8): r4.data_rack(b,(-1.8+col*.62,.06,2.75+row*.53),.34)
        for p in [(-.4,0,2.3),(1.8,0,2.4),(3.6,0,2.3)]: r4.worker(b,p,.58)
    return b.scene()

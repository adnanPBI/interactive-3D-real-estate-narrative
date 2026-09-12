from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, safety_rail, cable_bundle, instrument_cluster

def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-generation-{lod}"), r4)
    high=lod=="lod0"; medium=lod=="lod1"
    # Close substation / protection-yard hero.
    pad_x=2.8
    b.box((7.8,.10,4.6),(pad_x,.05,.35),"Concrete")
    bay_count=6 if high else 4 if medium else 3
    for i,x in enumerate(np.linspace(-.2,5.8,bay_count)):
        bevel_box(b,(.80,1.12,1.05),(float(x),.56,.45),"Facade",.055)
        for dz in (-.34,0,.34): b.cyl(.085,.44,(float(x),1.30,.45+dz),"Bronze",sections=18 if high else 12)
        for pole in (-.32,.32): b.cyl(.035,1.85,(float(x)+pole,.925,-.85),"Steel",sections=10)
        b.cyl_between((float(x)-.32,1.72,-.85),(float(x)+.32,1.72,-.85),.026,"Aluminum",10)
    instrument_cluster(b,(2.8,0,2.25),10 if high else 6,.34,.9)
    safety_rail(b,(-1.0,0,-1.80),(6.7,0,-1.80),.82,18 if high else 11)
    cable_bundle(b,(-.6,1.92,-.85),(6.2,1.92,-.85),7 if high else 4,.017)
    # BESS line and inverter cabinets.
    for i,x in enumerate(np.linspace(-5.8,-1.8,5 if high else 3)):
        bevel_box(b,(1.05,1.30,2.10),(float(x),.65,1.35),"White",.07)
        b.box((.76,.62,.035),(float(x),.66,2.42),"Graphite")
        b.box((.56,.025,.045),(float(x),.37,2.45),"CoolGlow")
    if lod in ("lod0","lod1"):
        r5.insulator_bank(b,(2.8,0,-2.65),11 if high else 7,5 if high else 3,.78)
        for x in np.linspace(-7.6,-1.4,10 if high else 6): r4.solar_table(b,(float(x),.62,-4.30),.46 if high else .40)
        r5.high_turbine(b,(7.9,0,-4.35),.78 if high else .64,-.10)
    if high:
        r5.high_turbine(b,(10.2,0,-2.7),.62,.12)
        for x in (-5.6,-3.4,-1.2,1.0,3.2,5.4): r4.street_light(b,(x,0,3.40),.68,1.57)
    return b.scene()

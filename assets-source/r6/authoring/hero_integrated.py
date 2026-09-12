from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, glass_band, louver_bank, safety_rail, instrument_cluster

def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-integrated-{lod}"), r4)
    density = {"lod0":1.0,"lod1":.72,"lod2":.42,"proxy":.18}[lod]
    # Bespoke operations / visitor center in the foreground, authored separately
    # from the R5 campus massing so the opening shot has a recognisable hero.
    bevel_box(b,(5.4,2.55,2.9),(1.1,1.275,-.25),"Facade",.12)
    bevel_box(b,(2.25,1.45,1.65),(-2.55,.725,1.45),"Graphite",.09,-.06)
    glass_band(b,(1.05,1.28,-.25),4.25,.78,1.47,8 if lod=="lod0" else 5)
    for x in np.linspace(-1.15,3.25,10 if lod=="lod0" else 6):
        b.box((.035,2.10,.11),(float(x),1.22,1.25),"Aluminum")
    b.box((4.85,.10,.62),(1.1,2.70,.55),"Aluminum")
    if lod in ("lod0","lod1"):
        for x in (-.6,.4,1.4,2.4): r4.rooftop_unit(b,(x,2.66,-.35),.48*density+.18)
        louver_bank(b,(1.0,.58,1.235),9 if lod=="lod0" else 6,3,scale=.95)
        instrument_cluster(b,(4.15,0,1.62),8 if lod=="lod0" else 5,.28,.85)
        safety_rail(b,(-1.25,0,2.00),(3.85,0,2.00),.72,16 if lod=="lod0" else 10)
        r4.pipe_rack(b,(-4.6,0,-3.4),(3.7,0,-3.4),1.58,.72,5 if lod=="lod0" else 3)
        for p in [(-4.6,0,2.6),(-3.8,0,2.6),(-3.0,0,2.6),(4.4,0,2.6)]: r4.tree(b,p,.62)
    if lod=="lod0":
        r5.dense_switchyard(b,(5.6,0,2.65),True)
        r5.high_turbine(b,(8.7,0,-2.55),.70,-.12)
        for x in np.linspace(-7.8,-2.2,8): r4.solar_table(b,(float(x),.58,-3.65),.42)
        for x in (-4.7,-2.4,4.4): r4.street_light(b,(x,0,3.05),.72,1.57)
    return b.scene()

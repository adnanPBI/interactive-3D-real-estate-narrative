from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, glass_band, louver_bank, safety_rail, instrument_cluster, service_stair


def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-integrated-{lod}"), r4)
    density = {"lod0":1.0,"lod1":.72,"lod2":.42,"proxy":.18}[lod]
    high = lod == "lod0"

    # Primary operations/visitor building. The clean context removes only the
    # two legacy masses that occupied this volume, so there is one shell here.
    bevel_box(b,(5.4,2.55,2.9),(1.1,1.275,-.25),"Facade",.12)
    bevel_box(b,(2.25,1.45,1.65),(-2.55,.725,1.45),"Graphite",.09,-.06)
    glass_band(b,(1.05,1.28,-.25),4.25,.78,1.47,10 if high else 6)
    for x in np.linspace(-1.15,3.25,12 if high else 7):
        b.box((.035,2.10,.11),(float(x),1.22,1.25),"Aluminum")
    for y in (.48,1.12,1.78,2.38):
        b.box((4.70,.025,.08),(1.05,y,1.26),"Aluminum")
    b.box((5.58,.12,.10),(1.1,2.57,-1.67),"Aluminum")
    b.box((5.58,.12,.10),(1.1,2.57,1.17),"Aluminum")
    b.box((4.85,.10,.62),(1.1,2.70,.55),"Aluminum")

    if lod in ("lod0","lod1"):
        for x in (-.6,.4,1.4,2.4):
            r4.rooftop_unit(b,(x,2.66,-.35),.48*density+.18)
            if high:
                b.cyl(.10,.22,(x+.20,2.91,-.50),"Aluminum",sections=18)
        louver_bank(b,(1.0,.58,1.235),11 if high else 7,4 if high else 3,scale=.95)
        instrument_cluster(b,(4.15,0,1.62),10 if high else 6,.28,.85)
        safety_rail(b,(-1.25,0,2.00),(3.85,0,2.00),.72,20 if high else 12)
        service_stair(b,(3.70,0,1.05),.68,1.15,1.00,8,3.14)
        # Keep pipe services clear of the foreground solar tables; the previous
        # near-intersection was one of the screenshot-1 shimmer zones.
        r4.pipe_rack(b,(-4.6,0,-3.15),(3.7,0,-3.15),1.58,.72,6 if high else 4)
        for x in (-3.95,-3.20,3.95):
            r5.control_cabinet(b,(x,0,1.95),.52,"CoolGlow")
        r5.cable_tray(b,(-4.4,0,-2.82),(3.4,0,-2.82),1.85,4 if high else 2,.82)
        for p in [(-4.6,0,2.6),(-3.8,0,2.6),(-3.0,0,2.6),(4.4,0,2.6)]:
            r4.tree(b,p,.62)

    if high:
        r5.dense_switchyard(b,(5.6,0,2.65),True)
        for x in np.linspace(-7.8,-2.2,8):
            r4.solar_table(b,(float(x),.58,-4.35),.42)
        for x in (-4.7,-2.4,4.4):
            r4.street_light(b,(x,0,3.05),.72,1.57)
        for x in (4.55,5.35):
            r4.transformer_pad(b,(x,0,-2.25),.48)

    return b.scene()

from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, safety_rail, service_stair, instrument_cluster


def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-recycling-{lod}"), r4)
    high=lod=="lod0"; medium=lod=="lod1"

    # Processing hall plus dedicated shredder/sorter/baler train.
    bevel_box(b,(7.2,2.75,3.55),(3.0,1.375,-1.75),"Facade",.12)
    bevel_box(b,(2.3,1.90,2.0),(-4.8,.95,-.8),"Graphite",.09)
    for x in np.linspace(.2,5.8,12 if high else 7):
        b.box((.035,2.18,.09),(float(x),1.28,.05),"Aluminum")
    for y in (.48,1.05,1.65,2.25):
        b.box((6.30,.025,.08),(3.0,y,.07),"Aluminum")

    # Main sorting line with distinct drums, rollers and transfer chutes.
    r5.sorter_drum(b,(-2.6,0,.85),.86 if high else .70)
    r5.sorter_drum(b,(-.25,0,.85),.78 if high else .66)
    r4.conveyor(b,(-6.0,0,.86),(5.9,0,.86),.78,.84)
    r5.roller_bed(b,(-5.7,0,.10),(4.8,0,.10),.72,.62,48 if high else 28 if medium else 14,.90)

    for x in (-4.6,-3.65,1.1,2.0,2.9):
        bevel_box(b,(.72,1.35,.64),(x,.675,-.15),"White",.045)
        b.box((.48,.26,.025),(x,.84,.18),"BlackGlass")
        b.box((.10,.025,.035),(x+.18,1.16,.19),"WarmGlow")
        if lod in ("lod0","lod1"):
            for yy in (.34,.54,.74):
                b.box((.42,.018,.026),(x,yy,.195),"Aluminum")

    if lod in ("lod0","lod1"):
        instrument_cluster(b,(-2.0,0,-.95),10 if high else 6,.30,.85)
        safety_rail(b,(-6.0,0,1.55),(5.8,0,1.55),.78,26 if high else 15)
        safety_rail(b,(-6.0,0,-1.65),(5.0,0,-1.65),.72,22 if high else 13)
        service_stair(b,(5.7,0,-.15),.78,1.35,1.15,9,3.14)
        r5.cable_tray(b,(-5.6,0,-1.25),(4.6,0,-1.25),2.10,5 if high else 3,.80)
        for x in (-5.05,-2.05,.45):
            bevel_box(b,(.95,.68,.92),(x,1.42,.82),"Graphite",.055)
            b.box((.62,.70,.08),(x,1.06,.82),"Steel")
        for row in range(3 if high else 2):
            for col in range(7 if high else 5):
                r4.bale(b,(1.5+col*.56,0,2.05+row*.48),.38,"Recycled" if (row+col)%2 else "Steel")

    if high:
        # Static plant/process detail only; vehicles are intentionally omitted.
        for i,x in enumerate((-6.35,-5.35,-4.35)):
            bevel_box(b,(.82,.68,1.10),(x,.34,2.65),"Graphite" if i%2 else "Recycled",.05)
        r4.pile(b,(-6.3,.08,-3.1),.82,55,"Recycled",106)
        r4.pile(b,(-4.0,.08,-3.1),.68,42,"Steel",107)
        for p in [(-1.0,0,2.25),(3.4,0,2.5)]:
            r4.worker(b,p,.60)
        for x in (-5.8,-3.6,-1.4,3.6,5.4):
            r4.street_light(b,(x,0,3.35),.58,1.57)

    return b.scene()

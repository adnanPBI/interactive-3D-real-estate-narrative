from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, safety_rail, service_stair, cable_bundle, instrument_cluster

def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-manufacturing-{lod}"), r4)
    high = lod=="lod0"; medium=lod=="lod1"
    # Dedicated production cell: lamination oven, stringer cells, laser station,
    # inspection portal and finished-module buffer.  These are not duplicated by
    # the generic R5 hall and make this the closest, most detailed camera moment.
    bevel_box(b,(4.4,1.25,1.55),(1.25,.625,.15),"White",.10)
    bevel_box(b,(1.45,1.75,1.45),(-1.95,.875,.15),"Graphite",.09)
    bevel_box(b,(1.20,1.55,1.32),(4.45,.775,.15),"Facade",.08)
    for z in (-.56,.56):
        b.box((4.05,.085,.06),(1.25,.78,z),"Aluminum")
    for x in np.linspace(-.55,3.05,12 if high else 7):
        b.box((.035,.88,1.46),(float(x),.68,.15),"Steel")
    # Roller/transport and robots remain explicit high-frequency details.
    r5.roller_bed(b,(-4.8,0,2.25),(6.6,0,2.25),.72,.66,44 if high else 26 if medium else 12,.85)
    r4.conveyor(b,(-4.8,0,-2.15),(6.6,0,-2.15),.78,.78)
    robot_count = 14 if high else 8 if medium else 4
    for i,x in enumerate(np.linspace(-3.9,5.7,robot_count)):
        r4.robot_arm(b,(float(x),.02,-.72 if i%2 else .82),.66 if high else .55,.10+i*.035)
    if lod in ("lod0","lod1"):
        r5.gantry_detail(b,-5.1,6.9,-3.35,3.35,3.82,12 if high else 8,high)
        r5.cable_tray(b,(-4.7,0,-2.85),(6.5,0,-2.85),3.05,5 if high else 3,.72)
        r5.cable_tray(b,(-4.7,0,2.85),(6.5,0,2.85),2.92,4 if high else 2,.72)
        safety_rail(b,(-4.8,0,3.05),(6.4,0,3.05),.78,24 if high else 14)
        service_stair(b,(6.4,0,-3.0),.85,1.5,1.15,9,3.14)
        instrument_cluster(b,(-2.1,0,3.15),9 if high else 5,.26,.82)
        cable_bundle(b,(-4.7,2.75,3.05),(6.3,2.75,3.05),6 if high else 3,.014)
    if high:
        for p in [(-3.6,0,1.35),(-1.1,0,-1.45),(1.3,0,1.35),(3.7,0,-1.45),(5.6,0,1.35)]: r4.worker(b,p,.63)
        for x in (-4.2,-1.4,1.4,4.2): r4.pallet_stack(b,(x,0,3.30),3,5,.28,"SolarGlass")
    return b.scene()

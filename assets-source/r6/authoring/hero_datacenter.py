from __future__ import annotations
import numpy as np
from shared import add_context, bevel_box, glass_band, louver_bank, safety_rail, cable_bundle

# The primary white-space block is centered at y=1.55 with a 3.10 m authored
# height, therefore the structural roof datum is y=3.10.  Keep roof equipment
# referenced to this datum instead of using visually ambiguous ground-relative
# rooftop_unit calls.
MAIN_ROOF_Y = 3.10
MAIN_ROOF_X = (-2.90, 4.90)
MAIN_ROOF_Z = (-2.975, 1.275)
ROOF_EDGE_CLEARANCE = 0.42


def _roof_layout(lod: str):
    if lod == "lod0":
        return [
            (-1.85, -1.96, 0.82),
            (-0.35, -1.96, 0.82),
            (1.15, -1.96, 0.82),
            (2.65, -1.96, 0.82),
            (-1.10, -0.72, 0.76),
            (0.40, -0.72, 0.76),
            (1.90, -0.72, 0.76),
            (3.40, -0.72, 0.76),
        ]
    if lod == "lod1":
        return [
            (-1.55, -1.82, 0.74),
            (0.15, -1.82, 0.74),
            (1.85, -1.82, 0.74),
            (3.40, -1.82, 0.74),
        ]
    # LOD2/proxy retain only the structural silhouette; they still use a curb so
    # the simplified equipment can never become a floating island.
    return [(-1.25, -1.55, 0.66), (1.05, -1.55, 0.66), (3.15, -1.55, 0.66)]


def _validate_roof_layout(layout):
    x_min, x_max = MAIN_ROOF_X
    z_min, z_max = MAIN_ROOF_Z
    for x, z, scale in layout:
        half_w = 0.48 * scale
        half_d = 0.40 * scale
        if x - half_w < x_min + ROOF_EDGE_CLEARANCE or x + half_w > x_max - ROOF_EDGE_CLEARANCE:
            raise ValueError(f"Data-center rooftop package at x={x} exceeds structural roof footprint")
        if z - half_d < z_min + ROOF_EDGE_CLEARANCE or z + half_d > z_max - ROOF_EDGE_CLEARANCE:
            raise ValueError(f"Data-center rooftop package at z={z} exceeds structural roof footprint")


def _supported_rooftop_package(b, x: float, z: float, scale: float, high: bool):
    """Author a physically continuous roof curb -> AHU -> fan-cap stack."""
    curb_h = 0.13 * scale
    body_h = 0.40 * scale
    cap_h = 0.055 * scale
    curb_y = MAIN_ROOF_Y + curb_h / 2
    body_y = MAIN_ROOF_Y + curb_h + body_h / 2
    body_top = MAIN_ROOF_Y + curb_h + body_h
    cap_y = body_top - 0.004 + cap_h / 2

    # Concrete curb/plinth makes the support legible from the elevated chapter
    # camera and guarantees the equipment's lower face intersects its support.
    b.box((0.96 * scale, curb_h, 0.80 * scale), (x, curb_y, z), "Concrete")
    bevel_box(b, (0.84 * scale, body_h, 0.68 * scale), (x, body_y, z), "Graphite", 0.035 * scale)
    b.cyl(0.235 * scale, cap_h, (x, cap_y, z), "Aluminum", axis="y", sections=20 if high else 12)

    # Service-side frame is tied into the housing instead of hovering beside it.
    b.box((0.10 * scale, body_h * 0.70, 0.10 * scale),
          (x + 0.34 * scale, MAIN_ROOF_Y + curb_h + body_h * 0.35, z), "Steel")
    if high:
        for dz in (-0.20, 0.0, 0.20):
            b.box((0.58 * scale, 0.018 * scale, 0.026 * scale),
                  (x, MAIN_ROOF_Y + curb_h + body_h * 0.56, z + dz * scale), "Aluminum")


def build(ctx, lod: str):
    r4, r5 = ctx.r4, ctx.r5
    b = add_context(r4.Builder(f"r6-datacenter-{lod}"), r4)
    high = lod == "lod0"

    # Main white-space block with premium curtain-wall lobby and deep cooling yard.
    bevel_box(b, (7.8, 3.10, 4.25), (1.0, 1.55, -.85), "Facade", .13)
    glass_band(b, (1.0, 1.45, -.85), 5.2, .92, 2.16, 10 if high else 7)
    for x in np.linspace(-2.1, 4.1, 13 if high else 8):
        b.box((.035, 2.52, .10), (float(x), 1.45, 1.32), "Aluminum")
    louver_bank(b, (1.0, .75, 1.335), 11 if high else 7, 4 if high else 3, scale=.98)

    # Structurally mounted rooftop plant.  Previous R6.1.2 code placed objects
    # at y~=0.06 and they projected as detached/floating equipment in chapter 04.
    roof_layout = _roof_layout(lod)
    _validate_roof_layout(roof_layout)
    for x, z, scale in roof_layout:
        _supported_rooftop_package(b, x, z, scale, high)

    # Cooling yard remains ground-supported and is kept visually separate from
    # the roof plant. Pipe/cable systems now read as intentional service plant.
    r4.pipe_rack(b, (-6.3, 0, -.45), (-1.8, 0, -.45), 1.85, .72, 6 if high else 3)
    r4.pipe_rack(b, (-6.3, 0, -1.2), (-1.8, 0, -1.2), 1.55, .62, 4 if high else 2)
    cable_bundle(b, (-6.0, 2.15, -.30), (-1.9, 2.15, -.30), 6 if high else 3, .016, material="Bronze")
    safety_rail(b, (-6.3, 0, -3.2), (-1.6, 0, -3.2), .78, 15 if high else 9)

    if lod in ("lod0", "lod1"):
        r5.fan_bank(b, (-5.65, .86, -2.85), 6 if high else 4, 2 if high else 1, .70, .58)
        for x in (-5.6, -4.2, -2.8):
            r5.control_cabinet(b, (x, 0, 1.65), .62, "CoolGlow")
        for x in np.linspace(-6.3, -2.0, 4 if high else 3):
            r4.transformer_pad(b, (float(x), 0, 2.85), .56)
    if high:
        for row in range(3):
            for col in range(8):
                r4.data_rack(b, (-1.8 + col * .62, .06, 2.75 + row * .53), .34)
        for p in [(-.4, 0, 2.3), (1.8, 0, 2.4), (3.6, 0, 2.3)]:
            r4.worker(b, p, .58)
    return b.scene()

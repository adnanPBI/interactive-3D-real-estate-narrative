#!/usr/bin/env python3
"""Generate Convalt R5 hybrid cinematic assets.

R5 keeps the deterministic R4.1 base as the medium-distance foundation and adds
camera-visible, object-specific detail for each hero moment.  Two tiers are
exported:
  * medium: richer than R4.1, tuned for integrated GPUs
  * high: denser hero geometry for discrete / higher-headroom GPUs

The generator deliberately consolidates repeated architectural language around
shared PBR materials and leaves the runtime free to keep only current/adjacent
chapters warm.  It is a visual-development model set, not factual client CAD.
"""
from __future__ import annotations

from dataclasses import replace
from hashlib import sha256
import importlib.util
import json
import math
from pathlib import Path
import shutil
import sys

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
R4_PATH = ROOT / "scripts" / "generate-r4-assets.py"

spec = importlib.util.spec_from_file_location("convalt_r4_generator", R4_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load R4 generator at {R4_PATH}")
r4 = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = r4
spec.loader.exec_module(r4)

OUT = ROOT / "public" / "models" / "r5"
OUT_HIGH = OUT / "high"
OUT_MEDIUM = OUT / "medium"
FALLBACK = ROOT / "public" / "fallback" / "r5"
for directory in (OUT, OUT_HIGH, OUT_MEDIUM, FALLBACK):
    directory.mkdir(parents=True, exist_ok=True)


# R4's repeated vignette AO is useful on isolated props but visually tiles on
# large ground/asphalt/facade surfaces.  R5 removes that source of square patches
# while retaining subtle normal breakup where it reads naturally.
def _configure_r5_materials() -> None:
    r4.SPECS["Ground"] = replace(r4.SPECS["Ground"], ao=False, normal=False, roughness=.91)
    r4.SPECS["Asphalt"] = replace(r4.SPECS["Asphalt"], ao=False, roughness=.89)
    r4.SPECS["Concrete"] = replace(r4.SPECS["Concrete"], ao=False, roughness=.80)
    r4.SPECS["Facade"] = replace(r4.SPECS["Facade"], ao=False, roughness=.36, metallic=.48)
    r4.SPECS["Roof"] = replace(r4.SPECS["Roof"], ao=False, roughness=.64)
    r4.SPECS["Steel"] = replace(r4.SPECS["Steel"], roughness=.27, metallic=.80)
    r4.SPECS["Aluminum"] = replace(r4.SPECS["Aluminum"], roughness=.22, metallic=.86)
    r4.SPECS["SolarGlass"] = replace(r4.SPECS["SolarGlass"], roughness=.16, metallic=.52)
    r4.MATERIALS = {key: r4.make_material(value) for key, value in r4.SPECS.items()}


_configure_r5_materials()


def add_scene(target: trimesh.Scene, source: trimesh.Scene, prefix: str) -> None:
    """Copy geometry into a combined scene without flattening UV/material data."""
    for index, (name, geom) in enumerate(source.geometry.items()):
        target.add_geometry(
            geom.copy(),
            node_name=f"{prefix}-{index}-{name}",
            geom_name=f"{prefix}-{index}-{name}",
        )


def combine(base: trimesh.Scene, detail: trimesh.Scene, name: str) -> trimesh.Scene:
    scene = trimesh.Scene()
    add_scene(scene, base, f"{name}-base")
    add_scene(scene, detail, f"{name}-detail")
    return scene


def facade_fins(b, center, size, density=8, front="z+"):
    """Add parapets, corner trims, mullions and floor datum lines to a shell."""
    x, y, z = center
    w, h, d = size
    y0 = y
    # Roof parapet / coping catches the key light and removes raw box silhouettes.
    for zz in (z - d / 2, z + d / 2):
        b.box((w + .10, .10, .07), (x, y0 + h + .04, zz), "Aluminum")
    for xx in (x - w / 2, x + w / 2):
        b.box((.07, .10, d + .10), (xx, y0 + h + .04, z), "Aluminum")
        b.box((.055, h * .94, .055), (xx, y0 + h * .47, z - d / 2), "Aluminum")
        b.box((.055, h * .94, .055), (xx, y0 + h * .47, z + d / 2), "Aluminum")

    face_z = z + d / 2 + .035 if front == "z+" else z - d / 2 - .035
    for xx in np.linspace(x - w * .44, x + w * .44, max(4, density)):
        b.box((.035, h * .82, .045), (float(xx), y0 + h * .47, face_z), "Aluminum")
    for yy in np.linspace(y0 + h * .22, y0 + h * .78, 3):
        b.box((w * .90, .025, .045), (x, float(yy), face_z), "Aluminum")
    # Dark vision ribbon gives scale and a premium curtain-wall cue.
    b.box((w * .82, h * .16, .028), (x, y0 + h * .58, face_z + (.018 if front == "z+" else -.018)), "VisionGlass")


def rooftop_mechanical(b, center, size, count=4, high=False):
    x, y, z = center
    w, h, d = size
    xs = np.linspace(x - w * .34, x + w * .34, max(2, count))
    for i, xx in enumerate(xs):
        zz = z + ((i % 2) - .5) * min(d * .28, .8)
        r4.rooftop_unit(b, (float(xx), y + h + .04, float(zz)), .38 if not high else .46)
        if high and i % 2 == 0:
            b.cyl(.12, .12, (float(xx) + .25, y + h + .25, float(zz) - .20), "Aluminum", sections=20)


def cable_tray(b, start, end, height=2.6, runs=3, scale=1.0):
    p1 = np.array(start, float)
    p2 = np.array(end, float)
    vec = p2 - p1
    length = float(np.linalg.norm(vec[[0, 2]]))
    if length < 1e-6:
        return
    yaw = math.atan2(vec[0], vec[2])
    midpoint = (p1 + p2) / 2
    for run in range(runs):
        offset = (run - (runs - 1) / 2) * .17 * scale
        lateral = np.array([math.cos(yaw) * offset, 0, -math.sin(yaw) * offset])
        p = midpoint + lateral
        b.box((.10 * scale, .055 * scale, length), (float(p[0]), height + run * .045, float(p[2])), "Aluminum", rot_y=yaw)
    for t in np.linspace(.08, .92, max(4, int(length / (1.2 * scale)))):
        p = p1 * (1 - t) + p2 * t
        b.box((.55 * scale, .035 * scale, .055 * scale), (float(p[0]), height - .10, float(p[2])), "Steel", rot_y=yaw)


def control_cabinet(b, pos, scale=.65, glow="CoolGlow"):
    x, y, z = pos
    b.box((.72 * scale, 1.32 * scale, .46 * scale), (x, y + .66 * scale, z), "White")
    b.box((.58 * scale, .42 * scale, .022), (x, y + .82 * scale, z + .242 * scale), "BlackGlass")
    for yy in (.26, .48, .70):
        b.box((.46 * scale, .018, .024), (x, y + yy * scale, z + .253 * scale), "Aluminum")
    b.box((.12 * scale, .035, .035), (x + .20 * scale, y + 1.12 * scale, z + .255 * scale), glow)


def high_turbine(b, pos, scale=1.0, yaw=0.0):
    """Smoother tower/hub than the R4 turbine for camera-near silhouettes."""
    x, _, z = pos
    tower_h = 6.4 * scale
    b.add(r4.frustum_y(.135 * scale, .055 * scale, tower_h, 48), "White", r4.T(x, tower_h / 2, z))
    b.cyl(.27 * scale, .12 * scale, (x, .06 * scale, z), "Concrete", sections=32)
    hub = (x, tower_h + .05 * scale, z)
    b.sphere(.19 * scale, hub, "White", sub=2)
    b.add(trimesh.creation.capsule(height=.48 * scale, radius=.13 * scale, count=[16, 24]), "White", r4.T(*hub) @ r4.R(math.pi / 2, (0, 0, 1)) @ r4.R(yaw))
    for angle in (0, 2 * math.pi / 3, 4 * math.pi / 3):
        blade = r4.wedge(2.65 * scale, .28 * scale, .055 * scale, .035 * scale)
        b.add(blade, "White", r4.T(*hub) @ r4.R(yaw) @ r4.R(angle, (0, 0, 1)))
        # metallic root collar provides a readable hub joint without many polygons
        root = (x + math.sin(angle) * .28 * scale, hub[1] + math.cos(angle) * .28 * scale, z)
        b.sphere(.065 * scale, root, "Aluminum", sub=1)


def dense_switchyard(b, center, high=False):
    x, _, z = center
    rows = 4 if high else 3
    cols = 7 if high else 5
    for row in range(rows):
        zz = z + (row - (rows - 1) / 2) * .48
        for col in range(cols):
            xx = x + (col - (cols - 1) / 2) * .55
            b.cyl(.035, .72, (xx, .36, zz), "Steel", sections=10)
            b.cyl(.075, .13, (xx, .78, zz), "Bronze", sections=14)
            if row < rows - 1:
                b.cyl_between((xx, .84, zz), (xx, .84, zz + .48), .018, "Aluminum", 8)
        b.cyl_between((x - cols * .30, .95 + row * .035, zz), (x + cols * .30, .95 + row * .035, zz), .022, "Bronze", 10)
    r4.fence_line(b, (x - 2.2, 0, z - 1.25), (x + 2.2, 0, z - 1.25), .82, .55)
    r4.fence_line(b, (x - 2.2, 0, z + 1.25), (x + 2.2, 0, z + 1.25), .82, .55)


def gantry_detail(b, x0, x1, z0, z1, height=3.5, bays=8, high=False):
    for xx in np.linspace(x0, x1, bays + 1):
        b.box((.065, height, .065), (float(xx), height / 2, z0), "Steel")
        b.box((.065, height, .065), (float(xx), height / 2, z1), "Steel")
        # Cross-braces make the frame read as engineered steel rather than sticks.
        if high:
            b.cyl_between((float(xx), height * .60, z0), (float(xx), height * .92, z1), .024, "Aluminum", 8)
            b.cyl_between((float(xx), height * .60, z1), (float(xx), height * .92, z0), .024, "Aluminum", 8)
    for zz in np.linspace(z0, z1, 5):
        b.cyl_between((x0, height, float(zz)), (x1, height, float(zz)), .035, "Steel", 10)


def sorter_drum(b, pos, scale=.7):
    x, y, z = pos
    # cylinder defaults along Z; align along X for a horizontal trommel/readable separator
    drum = trimesh.creation.cylinder(radius=.42 * scale, height=1.55 * scale, sections=32)
    b.add(drum, "Graphite", r4.T(x, y + .85 * scale, z) @ r4.R(math.pi / 2, (0, 1, 0)))
    for dx in (-.62, 0, .62):
        ring = trimesh.creation.torus(major_radius=.43 * scale, minor_radius=.025 * scale, major_sections=36, minor_sections=8)
        b.add(ring, "Aluminum", r4.T(x + dx * scale, y + .85 * scale, z) @ r4.R(math.pi / 2, (0, 1, 0)))
    for sx in (-.55, .55):
        b.box((.08 * scale, .72 * scale, .08 * scale), (x + sx * scale, y + .36 * scale, z - .31 * scale), "Steel")
        b.box((.08 * scale, .72 * scale, .08 * scale), (x + sx * scale, y + .36 * scale, z + .31 * scale), "Steel")



def roller_bed(b, start, end, width=.72, height=.62, rollers=30, scale=1.0):
    p1 = np.array(start, float)
    p2 = np.array(end, float)
    vec = p2 - p1
    yaw = math.atan2(vec[0], vec[2])
    for t in np.linspace(0.03, .97, rollers):
        p = p1 * (1 - t) + p2 * t
        # Roller axis is local X; rotating around Y follows the conveyor direction.
        mesh = trimesh.creation.cylinder(radius=.055 * scale, height=width * scale, sections=14)
        b.add(mesh, "Steel", r4.T(float(p[0]), height, float(p[2])) @ r4.R(math.pi / 2, (0, 1, 0)) @ r4.R(yaw, (0, 1, 0)))
    for side in (-1, 1):
        offset = np.array([math.cos(yaw) * width * .52, 0, -math.sin(yaw) * width * .52]) * side
        b.cyl_between(tuple(p1 + offset + [0, height + .10, 0]), tuple(p2 + offset + [0, height + .10, 0]), .028 * scale, "Aluminum", 10)


def fan_bank(b, origin, cols=4, rows=2, spacing=.72, scale=.55):
    x0, y0, z0 = origin
    for row in range(rows):
        for col in range(cols):
            x = x0 + col * spacing
            z = z0 + row * spacing
            # Fan well + ring + six blades; reads strongly from elevated cameras.
            b.cyl(.31 * scale, .05 * scale, (x, y0 + .04, z), "Graphite", sections=32)
            ring = trimesh.creation.torus(major_radius=.235 * scale, minor_radius=.022 * scale, major_sections=32, minor_sections=8)
            b.add(ring, "Aluminum", r4.T(x, y0 + .075, z) @ r4.R(math.pi / 2, (1, 0, 0)))
            for blade in range(6):
                angle = blade * math.pi / 3
                bx = x + math.cos(angle) * .11 * scale
                bz = z + math.sin(angle) * .11 * scale
                b.box((.20 * scale, .018 * scale, .055 * scale), (bx, y0 + .09, bz), "Steel", rot_y=-angle)
            b.cyl(.045 * scale, .035 * scale, (x, y0 + .095, z), "Bronze", sections=16)


def insulator_bank(b, center, cols=8, rows=4, scale=1.0):
    x0, _, z0 = center
    for row in range(rows):
        z = z0 + (row - (rows - 1) / 2) * .46 * scale
        for col in range(cols):
            x = x0 + (col - (cols - 1) / 2) * .48 * scale
            b.cyl(.028 * scale, .72 * scale, (x, .36 * scale, z), "Steel", sections=10)
            for disk in range(4):
                b.cyl(.075 * scale, .035 * scale, (x, (.55 + disk * .10) * scale, z), "White", sections=16)
            b.cyl(.040 * scale, .16 * scale, (x, .93 * scale, z), "Bronze", sections=12)
        b.cyl_between((x0 - cols * .255 * scale, 1.02 * scale, z), (x0 + cols * .255 * scale, 1.02 * scale, z), .025 * scale, "Bronze", 12)


def industrial_handrail(b, start, end, height=.78, posts=12, scale=1.0):
    p1 = np.array(start, float)
    p2 = np.array(end, float)
    for t in np.linspace(0, 1, posts):
        p = p1 * (1 - t) + p2 * t
        b.cyl(.018 * scale, height * scale, (float(p[0]), height * scale / 2, float(p[2])), "Aluminum", sections=10)
    for y in (height * .55 * scale, height * scale):
        b.cyl_between((float(p1[0]), y, float(p1[2])), (float(p2[0]), y, float(p2[2])), .020 * scale, "Aluminum", 10)

def hero_detail(tier: str):
    high = tier == "high"
    b = r4.Builder(f"r5_{tier}_hero")
    buildings = [
        ((-2.7, 0, -1.4), (5.6, 2.2, 3.0)),
        ((3.4, 0, -2.2), (4.1, 2.0, 2.5)),
        ((4.9, 0, 2.35), (3.2, 1.85, 2.4)),
    ]
    for center, size in buildings:
        facade_fins(b, center, size, 11 if high else 7)
        rooftop_mechanical(b, center, size, 5 if high else 3, high)
    for x in np.linspace(-7.6, -1.4, 7 if high else 4):
        r4.parking_car(b, (float(x), 0, .30), .38, math.pi / 2, "White" if int(abs(x) * 10) % 2 else "Facade")
    dense_switchyard(b, (.4, 0, 3.8), high)
    if high:
        high_turbine(b, (8.7, 0, -1.4), .62, -.12)
        r4.pipe_rack(b, (1.2, 0, -4.8), (5.5, 0, -4.8), 1.35, .65, 3)
        for x in (-7.8, -5.8, 6.6, 8.0):
            r4.street_light(b, (x, 0, 2.15), .78, math.pi / 2)
    return b.scene()


def manufacturing_detail(tier: str):
    high = tier == "high"
    b = r4.Builder(f"r5_{tier}_manufacturing")
    # Strengthen high-bay structural rhythm and overhead services.
    gantry_detail(b, -1.9, 7.3, -3.60, 3.60, 3.72, 10 if high else 8, high)
    cable_tray(b, (-1.5, 0, -2.6), (6.7, 0, -2.6), 2.95, 4 if high else 2, .75)
    cable_tray(b, (-1.5, 0, 2.65), (6.7, 0, 2.65), 2.85, 3 if high else 2, .75)
    robot_count = 12 if high else 7
    for i, x in enumerate(np.linspace(-1.0, 6.0, robot_count)):
        z = .58 if i % 2 == 0 else -1.00
        r4.robot_arm(b, (float(x), .03, z), .66 if high else .58, angle=.16 + i * .055)
        if i % 2 == 0:
            control_cabinet(b, (float(x) + .38, 0, z - .58), .54, "WarmGlow" if i % 4 == 0 else "CoolGlow")
    # Parallel module lines and staged glass pallets make the interior believable.
    r4.conveyor(b, (-1.4, 0, 2.55), (6.4, 0, 2.55), .72, .78)
    roller_bed(b, (-1.35, 0, 1.75), (6.35, 0, 1.75), .68, .60, 32 if high else 20, .88)
    roller_bed(b, (-1.35, 0, -.20), (6.05, 0, -.20), .64, .66, 30 if high else 18, .84)
    if high:
        r4.conveyor(b, (-1.4, 0, -2.05), (6.4, 0, -2.05), .72, .74)
        roller_bed(b, (-1.2, 0, -2.55), (6.15, 0, -2.55), .60, .70, 28, .80)
        industrial_handrail(b, (-1.5, 0, 3.35), (6.6, 0, 3.35), .76, 18, .9)
        for x in (0.2, 2.8, 5.2):
            r4.pallet_stack(b, (x, 0, 3.20), 3, 4, .30, "SolarGlass")
        for p in [(.1, 0, 1.1), (1.8, 0, -1.7), (4.0, 0, 1.0), (5.8, 0, -1.8)]:
            r4.worker(b, p, .64)
    # Exterior hall articulation / loading-side roof equipment.
    facade_fins(b, (-5.2, 0, -2.4), (5.1, 2.9, 3.0), 9 if high else 6)
    rooftop_mechanical(b, (-5.2, 0, -2.4), (5.1, 2.9, 3.0), 4 if high else 2, high)
    if high:
        fan_bank(b, (-6.4, 3.05, -2.9), 4, 2, .70, .48)
    return b.scene()


def generation_detail(tier: str):
    high = tier == "high"
    b = r4.Builder(f"r5_{tier}_generation")
    dense_switchyard(b, (4.25, 0, 3.65), high)
    insulator_bank(b, (4.25, 0, 3.65), 10 if high else 7, 5 if high else 3, .78)
    # Densify the far solar horizon without changing the hero camera footprint.
    rows = 3 if high else 2
    cols = 10 if high else 7
    for row in range(rows):
        for col in range(cols):
            r4.solar_table(b, (-8.2 + col * 1.70, .58, -4.75 + row * .62), .46 if high else .42)
    if high:
        high_turbine(b, (6.7, 0, -4.9), .72, -.18)
        high_turbine(b, (9.3, 0, -3.4), .60, .08)
    for x in (-5.8, -2.2, 1.4):
        control_cabinet(b, (x, 0, 2.45), .52, "CoolGlow")
    r4.pipe_rack(b, (2.7, 0, 2.35), (8.2, 0, 2.35), 1.38, .70, 4 if high else 2)
    for x in np.linspace(5.7, 9.0, 6 if high else 4):
        r4.transformer_pad(b, (float(x), 0, 4.65), .48)
    return b.scene()


def datacenter_detail(tier: str):
    high = tier == "high"
    b = r4.Builder(f"r5_{tier}_datacenters")
    buildings = [
        ((-1.2, 0, -1.4), (6.3, 2.5, 3.2)),
        ((5.4, 0, -2.2), (4.4, 2.25, 2.7)),
        ((5.0, 0, 1.1), (3.6, 1.8, 2.0)),
    ]
    for center, size in buildings:
        facade_fins(b, center, size, 12 if high else 8)
        rooftop_mechanical(b, center, size, 6 if high else 3, high)
    fan_bank(b, (-3.15, 2.60, -2.20), 6 if high else 4, 2, .66, .52)
    fan_bank(b, (4.55, 2.36, -2.65), 4 if high else 3, 2 if high else 1, .66, .48)
    # Extra cooling and electrical plant shifts the scene from generic warehouse to data campus.
    for x in np.linspace(-7.4, -3.8, 5 if high else 3):
        r4.rooftop_unit(b, (float(x), .02, .15), .52)
    r4.pipe_rack(b, (-7.35, 0, -1.15), (-2.4, 0, -1.15), 1.72, .72, 5 if high else 3)
    for x in (-6.7, -5.2, -3.7):
        control_cabinet(b, (x, 0, 1.85), .58, "CoolGlow")
    if high:
        for row in range(2):
            for col in range(6):
                r4.data_rack(b, (-3.65 + col * .78, .12, .68 + row * .68), .42)
        for x in (-1.7, -.6, .5, 1.6, 2.7):
            r4.parking_car(b, (x, 0, 2.18), .36, math.pi / 2, "White" if int((x + 4) * 10) % 2 else "Facade")
    return b.scene()


def recycling_detail(tier: str):
    high = tier == "high"
    b = r4.Builder(f"r5_{tier}_recycling")
    sorter_drum(b, (-2.6, 0, 1.05), .78 if high else .68)
    sorter_drum(b, (-.4, 0, 1.05), .72 if high else .64)
    r4.conveyor(b, (-5.7, 0, 1.1), (2.8, 0, 1.1), .70, .86)
    roller_bed(b, (-5.5, 0, .35), (2.6, 0, .35), .70, .62, 34 if high else 20, .85)
    if high:
        r4.conveyor(b, (1.6, 0, 1.1), (4.6, 0, 2.0), .64, 1.10)
    for x in np.linspace(-6.0, 1.8, 6 if high else 4):
        control_cabinet(b, (float(x), 0, -.05), .50, "WarmGlow")
    # Dense sorted material storage / reusable bales.
    for row in range(4 if high else 2):
        for col in range(7 if high else 5):
            mat = "Recycled" if (row + col) % 2 else "Steel"
            r4.bale(b, (3.4 + col * .56, 0, .75 + row * .48), .38, mat)
    if high:
        r4.pile(b, (-6.7, .1, -3.1), .74, 45, "Recycled", 81)
        r4.pile(b, (-4.5, .1, -3.1), .65, 38, "Steel", 82)
        r4.forklift(b, (1.9, 0, 2.45), .48, math.pi / 2)
        r4.worker(b, (-1.2, 0, 2.2), .60)
        r4.worker(b, (3.1, 0, -1.6), .60)
    facade_fins(b, (3.6, 0, -1.5), (7.3, 2.8, 3.4), 11 if high else 7)
    rooftop_mechanical(b, (3.6, 0, -1.5), (7.3, 2.8, 3.4), 5 if high else 3, high)
    return b.scene()


def closing_detail(tier: str):
    high = tier == "high"
    b = r4.Builder(f"r5_{tier}_closing")
    buildings = [
        ((-3.6, 0, -1.7), (5.0, 2.1, 2.8)),
        ((3.4, 0, -2.0), (4.2, 1.9, 2.5)),
        ((6.4, 0, 2.4), (3.4, 1.8, 2.5)),
    ]
    for center, size in buildings:
        facade_fins(b, center, size, 9 if high else 6)
        rooftop_mechanical(b, center, size, 4 if high else 2, high)
    dense_switchyard(b, (.5, 0, 4.55), high)
    if high:
        high_turbine(b, (9.4, 0, -3.1), .66, -.08)
        for x in np.linspace(-8.8, -1.0, 7):
            r4.parking_car(b, (float(x), 0, .78), .32, math.pi / 2, "Facade")
        r4.pipe_rack(b, (1.1, 0, -4.9), (5.7, 0, -4.9), 1.30, .62, 3)
    return b.scene()


DETAIL_FACTORIES = {
    "hero-campus": hero_detail,
    "manufacturing": manufacturing_detail,
    "power-generation": generation_detail,
    "data-centers": datacenter_detail,
    "recycling": recycling_detail,
    "closing-platform": closing_detail,
}


def export_tier(name: str, tier: str, base: trimesh.Scene) -> dict:
    detail = DETAIL_FACTORIES[name](tier)
    scene = combine(base, detail, f"r5-{tier}-{name}")
    directory = OUT_HIGH if tier == "high" else OUT_MEDIUM
    path = directory / f"{name}.glb"
    path.write_bytes(scene.export(file_type="glb"))

    loaded = trimesh.load(path, force="scene")
    triangles = sum(len(g.faces) for g in loaded.geometry.values())
    vertices = sum(len(g.vertices) for g in loaded.geometry.values())
    materials = sorted({getattr(g.visual.material, "name", "unnamed") for g in loaded.geometry.values()})
    item = {
        "file": path.name,
        "bytes": path.stat().st_size,
        "triangles": triangles,
        "vertices": vertices,
        "meshGroups": len(loaded.geometry),
        "materials": materials,
        "sha256": sha256(path.read_bytes()).hexdigest(),
    }
    print(f"{tier:6s} {name:18s}: {item['bytes']:,} bytes | {triangles:,} tris | {item['meshGroups']} groups")
    return item


def main() -> None:
    tiers = {"medium": [], "high": []}
    for name in r4.SCENES:
        base = r4.SCENES[name]()
        tiers["medium"].append(export_tier(name, "medium", base))
        tiers["high"].append(export_tier(name, "high", base))
        (FALLBACK / f"{name}.svg").write_text(
            r4.fallback_svg(name, list(r4.SCENES).index(name)),
            encoding="utf-8",
        )

    manifest = {
        "stage": "6-r5-hybrid-cinematic",
        "revision": "r5.0",
        "provenance": "Original visual-development geometry derived from the deterministic R4.1 generator and Convalt art-direction boards; not factual client CAD.",
        "strategy": "quality-aware hero detail + adjacent-scene streaming + shared PBR materials + runtime instanced repetition",
        "budgets": {
            "medium": {"maxTrianglesPerScene": 120000, "maxMeshGroups": 48, "maxGlbBytesPerScene": 10485760},
            "high": {"maxTrianglesPerScene": 180000, "maxMeshGroups": 52, "maxGlbBytesPerScene": 12582912},
        },
        "tiers": tiers,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    for tier in ("medium", "high"):
        total_tris = sum(item["triangles"] for item in tiers[tier])
        total_bytes = sum(item["bytes"] for item in tiers[tier])
        print(f"TOTAL {tier}: {total_tris:,} triangles | {total_bytes / 1024 / 1024:.2f} MiB")


if __name__ == "__main__":
    main()

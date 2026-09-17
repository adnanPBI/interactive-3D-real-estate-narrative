"""Shared hard-surface helpers for the six bespoke R6 hero blueprints."""
from __future__ import annotations
import math
import numpy as np
import trimesh


def _ring_points(width: float, depth: float, chamfer: float):
    hx, hz = width / 2.0, depth / 2.0
    c = max(0.0, min(chamfer, hx * 0.45, hz * 0.45))
    return np.array([
        [-hx + c, -hz], [hx - c, -hz], [hx, -hz + c], [hx, hz - c],
        [hx - c, hz], [-hx + c, hz], [-hx, hz - c], [-hx, -hz + c],
    ], dtype=float)


def bevel_mesh(extents, bevel=0.05) -> trimesh.Trimesh:
    """Closed outward-facing chamfer shell without buried end caps.

    The former three capped prisms were wound inward. Four shared rings
    preserve real bevel highlights and eliminate those internal surfaces.
    """
    width, height, depth = map(float, extents)
    if not all(math.isfinite(v) and v > 0 for v in (width, height, depth)):
        raise ValueError("bevel extents must be finite and positive")
    b = min(max(float(bevel), 0.0001), min(width, height, depth) * 0.20)
    outer = _ring_points(width, depth, b)
    inset = _ring_points(width - 2*b, depth - 2*b, b * 0.55)
    rings = (inset, outer, outer, inset)
    ys = (-height/2, -height/2+b, height/2-b, height/2)
    vertices = np.vstack([np.column_stack([r[:, 0], np.full(8, y), r[:, 1]])
                          for r, y in zip(rings, ys)])
    vertices = np.vstack([vertices, [[0, ys[0], 0], [0, ys[-1], 0]]])
    faces = []
    for level in range(3):
        for i in range(8):
            j = (i + 1) % 8
            a, c, d, e = level*8+i, level*8+j, (level+1)*8+j, (level+1)*8+i
            faces.extend([[a, d, c], [a, e, d]])
    for i in range(8):
        j = (i + 1) % 8
        faces.extend([[32, i, j], [33, 24+j, 24+i]])
    return trimesh.Trimesh(vertices=vertices, faces=np.asarray(faces), process=False)


def bevel_box(builder, extents, pos, material, bevel=0.05, rot_y=0.0, repeat=(1.0, 1.0)):
    mesh = bevel_mesh(extents, bevel)
    builder.add(mesh, material, builder_transform(builder, pos, rot_y), repeat=repeat)
    # Face-space projection also gives vertical walls noncollapsed UVs.
    from cinematic import project_faces
    builder.meshes[material][-1] = project_faces(builder.meshes[material][-1])


def builder_transform(builder, pos, rot_y=0.0):
    module = getattr(builder, "_r6_context", None)
    if module is None:
        T = trimesh.transformations.translation_matrix(pos)
        R = trimesh.transformations.rotation_matrix(rot_y, [0, 1, 0])
        return T @ R
    return module.T(*pos) @ module.R(rot_y)


def glass_band(builder, center, width, height, depth_face, columns=7, material="VisionGlass"):
    x, y, z = center
    builder.box((width, height, 0.035), (x, y, z + depth_face), material)
    for xx in np.linspace(x - width/2, x + width/2, columns + 1):
        builder.box((0.026, height + .05, 0.055), (float(xx), y, z + depth_face + .01), "Aluminum")
    builder.box((width + .04, .026, .055), (x, y + height/2, z + depth_face + .01), "Aluminum")
    builder.box((width + .04, .026, .055), (x, y - height/2, z + depth_face + .01), "Aluminum")


def louver_bank(builder, origin, cols=7, rows=3, spacing=(0.30, 0.22), scale=1.0):
    x0, y0, z0 = origin
    for row in range(rows):
        for col in range(cols):
            x = x0 + (col - (cols-1)/2) * spacing[0] * scale
            y = y0 + row * spacing[1] * scale
            builder.box((.24*scale, .035*scale, .045*scale), (x, y, z0), "Graphite", rot_y=-.08)


def cable_bundle(builder, start, end, count=5, radius=.014, height_offset=.0, material="Bronze"):
    p1 = np.asarray(start, float); p2 = np.asarray(end, float)
    for i in range(count):
        offset = (i - (count-1)/2) * radius * 2.6
        a = p1.copy(); b = p2.copy(); a[1] += height_offset + offset; b[1] += height_offset + offset
        builder.cyl_between(tuple(a), tuple(b), radius, material, sections=10)


def safety_rail(builder, start, end, height=.72, posts=10, material="Aluminum"):
    """Keep a roof/platform rail attached to its authored base elevation."""
    p1 = np.asarray(start, float); p2 = np.asarray(end, float)
    for t in np.linspace(0, 1, posts):
        p = p1 * (1-t) + p2 * t
        builder.cyl(.018, height, (float(p[0]), float(p[1])+height/2, float(p[2])), material, sections=10)
    for y in (height*.55, height):
        builder.cyl_between(tuple(p1 + [0, y, 0]), tuple(p2 + [0, y, 0]), .020, material, sections=10)


def service_stair(builder, origin, width=1.0, run=1.8, rise=1.2, steps=10, yaw=0.0):
    x, y, z = origin
    for i in range(steps):
        t = i / max(1, steps-1)
        px = x + math.sin(yaw) * run * t
        pz = z + math.cos(yaw) * run * t
        py = y + rise * t
        builder.box((width, .055, run/steps * .92), (px, py, pz), "Steel", rot_y=yaw)
    a=(x-width*.46*math.cos(yaw), y, z+width*.46*math.sin(yaw))
    b=(x+math.sin(yaw)*run-width*.46*math.cos(yaw), y+rise, z+math.cos(yaw)*run+width*.46*math.sin(yaw))
    builder.cyl_between(a,b,.035,"Steel",10)
    a2=(x+width*.46*math.cos(yaw), y, z-width*.46*math.sin(yaw))
    b2=(x+math.sin(yaw)*run+width*.46*math.cos(yaw), y+rise, z+math.cos(yaw)*run-width*.46*math.sin(yaw))
    builder.cyl_between(a2,b2,.035,"Steel",10)


def instrument_cluster(builder, origin, count=6, spacing=.32, scale=1.0):
    x0, y0, z0 = origin
    for i in range(count):
        x = x0 + (i - (count-1)/2) * spacing * scale
        builder.cyl(.035*scale,.58*scale,(x,y0+.29*scale,z0),"Steel",sections=10)
        builder.cyl(.12*scale,.065*scale,(x,y0+.60*scale,z0),"White",sections=18)
        builder.box((.08*scale,.03*scale,.022*scale),(x,y0+.60*scale,z0+.10*scale),"CoolGlow")


def add_context(builder, r4_module):
    builder._r6_context = r4_module
    return builder

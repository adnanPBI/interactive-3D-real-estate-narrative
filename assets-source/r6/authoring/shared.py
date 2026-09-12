"""Shared hard-surface helpers for the six bespoke R6 hero blueprints.

These helpers are intentionally small.  Scene layout remains hand-authored in one
module per hero rather than being generated from a generic campus template.
"""
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


def _prism_between_rings(bottom: np.ndarray, top: np.ndarray, y0: float, y1: float) -> trimesh.Trimesh:
    n = len(bottom)
    verts = np.vstack([
        np.column_stack([bottom[:, 0], np.full(n, y0), bottom[:, 1]]),
        np.column_stack([top[:, 0], np.full(n, y1), top[:, 1]]),
    ])
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.extend([[i, j, n + j], [i, n + j, n + i]])
    # Caps as triangle fans.  Convex rings make this deterministic and robust.
    center_bottom = len(verts)
    center_top = center_bottom + 1
    verts = np.vstack([verts, [[0, y0, 0], [0, y1, 0]]])
    for i in range(n):
        j = (i + 1) % n
        faces.append([center_bottom, j, i])
        faces.append([center_top, n + i, n + j])
    return trimesh.Trimesh(vertices=verts, faces=np.asarray(faces, dtype=int), process=False)


def bevel_mesh(extents, bevel=0.05) -> trimesh.Trimesh:
    """A true chamfered box with vertical and horizontal bevel geometry.

    The body is built as three tapered chamfered prisms.  Unlike a shader-only
    normal trick, the resulting edge faces catch highlights and remain visible in
    silhouettes, which is the main R6 hard-surface fidelity requirement.
    """
    width, height, depth = map(float, extents)
    b = max(0.002, min(float(bevel), width * 0.12, height * 0.22, depth * 0.12))
    outer = _ring_points(width, depth, b)
    inset = _ring_points(max(width - 2*b, b*4), max(depth - 2*b, b*4), max(b * 0.55, 0.001))
    low = _prism_between_rings(inset, outer, -height/2, -height/2 + b)
    body = _prism_between_rings(outer, outer, -height/2 + b, height/2 - b)
    top = _prism_between_rings(outer, inset, height/2 - b, height/2)
    return trimesh.util.concatenate([low, body, top])


def bevel_box(builder, extents, pos, material, bevel=0.05, rot_y=0.0, repeat=(1.0, 1.0)):
    mesh = bevel_mesh(extents, bevel)
    builder.add(mesh, material, builder_transform(builder, pos, rot_y), repeat=repeat)


def builder_transform(builder, pos, rot_y=0.0):
    # Builders passed to the hero modules come from the R4 authoring layer.
    module = getattr(builder, "_r6_context", None)
    if module is None:
        # Fallback import-free transform; keeps this file usable in isolation.
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
    p1 = np.asarray(start, float); p2 = np.asarray(end, float)
    for t in np.linspace(0, 1, posts):
        p = p1 * (1-t) + p2 * t
        builder.cyl(.018, height, (float(p[0]), height/2, float(p[2])), material, sections=10)
    for y in (height*.55, height):
        builder.cyl_between((p1[0], y, p1[2]), (p2[0], y, p2[2]), .020, material, sections=10)


def service_stair(builder, origin, width=1.0, run=1.8, rise=1.2, steps=10, yaw=0.0):
    x, y, z = origin
    for i in range(steps):
        t = i / max(1, steps-1)
        px = x + math.sin(yaw) * run * t
        pz = z + math.cos(yaw) * run * t
        py = y + rise * t
        builder.box((width, .055, run/steps * .92), (px, py, pz), "Steel", rot_y=yaw)
    # Stringers + rails.
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

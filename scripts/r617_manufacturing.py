"""R6.1.7 manufacturing cleanup and additive hard-surface detail."""
from __future__ import annotations
import math
import numpy as np
import trimesh

ROOF_NAME_TOKENS = (
    "roofvent", "roof_vent", "roof-vent", "roofcurb", "roof_curb",
    "roofunit", "roof_unit", "rooftop_unit", "exhaust_cap", "exhaustcap",
)


def is_legacy_roof_artifact(node: str, mesh: trimesh.Trimesh, scene_max_y: float) -> bool:
    """Remove the small floating/flat roof blocks marked in screenshot 6.

    The spatial rule intentionally excludes long roof strips/skylights and tall
    steel frames. It is only applied to LOD0/LOD1 runtime copies, never source.
    """
    text = node.lower().replace(" ", "_")
    bounds = np.asarray(mesh.bounds, dtype=float)
    ext = bounds[1] - bounds[0]
    center = (bounds[0] + bounds[1]) * 0.5
    named = any(token in text for token in ROOF_NAME_TOKENS)
    compact_roof_block = (
        center[1] >= scene_max_y - 0.52
        and ext[1] <= 0.52
        and 0.16 <= ext[0] <= 1.65
        and 0.16 <= ext[2] <= 1.65
    )
    return bool(named or compact_roof_block)


def _material(name: str):
    specs = {
        "Panel_White": ([0.83, 0.85, 0.84, 1.0], 0.04, 0.48),
        "Metal_Painted_Charcoal": ([0.16, 0.18, 0.18, 1.0], 0.04, 0.46),
        "Metal_Steel": ([0.48, 0.50, 0.49, 1.0], 0.86, 0.32),
        "Metal_Aluminum": ([0.72, 0.74, 0.73, 1.0], 0.86, 0.27),
    }
    color, metalness, roughness = specs[name]
    return trimesh.visual.material.PBRMaterial(
        name=name, baseColorFactor=np.asarray(color, dtype=float),
        metallicFactor=metalness, roughnessFactor=roughness,
    )


def _face_uv(mesh: trimesh.Trimesh):
    result = mesh.copy()
    result.unmerge_vertices()
    points = np.asarray(result.vertices).reshape(-1, 3, 3)
    axes = np.argmax(np.abs(result.face_normals), axis=1)
    uv = np.zeros((len(points), 3, 2), dtype=float)
    for axis, pair in enumerate(((2, 1), (0, 2), (0, 1))):
        mask = axes == axis
        uv[mask] = points[mask][:, :, pair] / 1.2
    return result, uv.reshape(-1, 2)


def _box(extents, pos):
    mesh = trimesh.creation.box(extents=extents)
    mesh.apply_translation(pos)
    return mesh


def _vertical_cylinder(radius, height, pos, sections=24):
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [1, 0, 0]))
    mesh.apply_translation(pos)
    return mesh


def enhance_runtime(scene: trimesh.Scene, lod: int) -> int:
    """Add roof-scale details after source-derived manufacturing geometry merges."""
    if lod >= 2:
        return 0
    bounds = np.asarray(scene.bounds, dtype=float)
    xmin, ymin, zmin = bounds[0]
    xmax, ymax, zmax = bounds[1]
    xspan, zspan = xmax - xmin, zmax - zmin
    cx, cz = (xmin + xmax) * 0.5, (zmin + zmax) * 0.5
    roof_y = min(float(ymax) + 0.035, 4.12)
    groups: dict[str, list[trimesh.Trimesh]] = {k: [] for k in ("Panel_White", "Metal_Painted_Charcoal", "Metal_Steel", "Metal_Aluminum")}

    # Standing seams and raised edge flashing make the broad roof read as a real membrane.
    roof_width = xspan * 0.72
    roof_depth = zspan * 0.64
    for x in np.linspace(cx - roof_width * 0.48, cx + roof_width * 0.48, 13 if lod == 0 else 8):
        groups["Metal_Aluminum"].append(_box((0.022, 0.032, roof_depth), (float(x), roof_y, cz)))
    groups["Metal_Aluminum"].append(_box((roof_width, 0.09, 0.075), (cx, roof_y + 0.035, cz - roof_depth * 0.5)))
    groups["Metal_Aluminum"].append(_box((roof_width, 0.09, 0.075), (cx, roof_y + 0.035, cz + roof_depth * 0.5)))

    # Replace the crude marked roof blocks with three/two properly curbed AHUs.
    unit_count = 3 if lod == 0 else 2
    xs = np.linspace(cx - roof_width * 0.28, cx + roof_width * 0.28, unit_count)
    unit_z = cz - roof_depth * 0.12
    for x in xs:
        groups["Metal_Aluminum"].append(_box((1.18, 0.12, 0.88), (float(x), roof_y + 0.075, unit_z)))
        groups["Panel_White"].append(_box((1.02, 0.42, 0.74), (float(x), roof_y + 0.32, unit_z)))
        groups["Metal_Painted_Charcoal"].append(_vertical_cylinder(0.22, 0.055, (float(x), roof_y + 0.56, unit_z), 28))
        # Real louver rhythm on the camera-facing side.
        for dz in np.linspace(-0.25, 0.25, 5):
            groups["Metal_Steel"].append(_box((0.72, 0.022, 0.024), (float(x), roof_y + 0.33 + dz * 0.30, unit_z + 0.385)))

    # Narrow service grating between the units; elevated enough to avoid coplanar roof faces.
    groups["Metal_Painted_Charcoal"].append(_box((roof_width * 0.66, 0.035, 0.42), (cx, roof_y + 0.055, unit_z + 0.95)))
    for x in np.linspace(cx - roof_width * 0.30, cx + roof_width * 0.30, 9 if lod == 0 else 5):
        groups["Metal_Aluminum"].append(_box((0.025, 0.055, 0.40), (float(x), roof_y + 0.085, unit_z + 0.95)))

    added = 0
    for material_name, meshes in groups.items():
        if not meshes:
            continue
        prepared, uvs = [], []
        for mesh in meshes:
            mapped, uv = _face_uv(mesh)
            prepared.append(mapped)
            uvs.append(uv)
        merged = trimesh.util.concatenate(prepared)
        merged.visual = trimesh.visual.TextureVisuals(
            uv=np.concatenate(uvs, axis=0), material=_material(material_name)
        )
        node = f"R617_{material_name}"
        scene.add_geometry(merged, node_name=node, geom_name=node)
        added += len(meshes)
    return added

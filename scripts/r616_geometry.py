"""Runtime-only winding repair; the reviewed source GLB stays byte-identical."""
import trimesh


def repair_closed_inward(mesh: trimesh.Trimesh) -> bool:
    """Reverse inward closed shells, preserving vertices, UV seams and material.

    Test closure on a welded COPY because architectural UVs duplicate vertices.
    Never invert an open surface merely because its signed volume is negative.
    """
    if mesh.volume >= -1e-9:
        return False
    topology = mesh.copy()
    topology.merge_vertices(merge_tex=True, merge_norm=True)
    if not topology.is_watertight or not topology.is_winding_consistent:
        return False
    mesh.invert()
    return True

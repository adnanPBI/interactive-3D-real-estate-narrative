"""Actual-mesh regressions for R6.1.6 topology, UVs and anchored rails."""
from pathlib import Path
import sys
import unittest
import numpy as np
import trimesh
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'assets-source/r6/authoring'))
from shared import bevel_mesh,safety_rail
from cinematic import project_faces
sys.path.insert(0,str(ROOT/'scripts'))
from r616_geometry import repair_closed_inward

class GeometryTests(unittest.TestCase):
    def test_bevel_is_closed_outward_without_internal_caps(self):
        for extents,bevel in [((5.4,2.55,2.9),.12),((.18,.10,.15),.03),((7.8,3.10,4.25),.13)]:
            with self.subTest(extents=extents):
                mesh=bevel_mesh(extents,bevel)
                self.assertTrue(mesh.is_watertight)
                self.assertTrue(mesh.is_winding_consistent)
                self.assertGreater(mesh.volume,0)
                self.assertLessEqual(mesh.volume,np.prod(extents))
                self.assertEqual(len(mesh.faces),64)
                self.assertTrue(np.all(np.einsum('ij,ij->i',mesh.triangles_center,mesh.face_normals)>0))
                np.testing.assert_allclose(mesh.extents,extents)

    def test_bad_dimensions_rejected(self):
        for extents in [(0,1,1),(-1,1,1),(float('inf'),1,1)]:
            with self.assertRaises(ValueError): bevel_mesh(extents)

    def test_vertical_uvs_are_not_collapsed_and_keep_material(self):
        source=bevel_mesh((5,3,4))
        source.visual=trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name='Facade'))
        result=project_faces(source)
        uv=result.visual.uv.reshape(-1,3,2)
        a,b=uv[:,1]-uv[:,0],uv[:,2]-uv[:,0]
        area=np.abs(a[:,0]*b[:,1]-a[:,1]*b[:,0])/2
        self.assertTrue(np.all(area>1e-8))
        self.assertEqual(result.visual.material.name,'Facade')
        np.testing.assert_allclose(result.bounds,source.bounds)
        np.testing.assert_allclose(result.volume,source.volume)

    def test_runtime_winding_repair_preserves_uvs_and_source(self):
        source=bevel_mesh((5,3,4))
        source.visual=trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name='Facade'))
        source=project_faces(source)
        source.invert()
        runtime=source.copy()
        uv=runtime.visual.uv.copy()
        vertices=runtime.vertices.copy()
        self.assertTrue(repair_closed_inward(runtime))
        self.assertGreater(runtime.volume,0)
        self.assertLess(source.volume,0)
        np.testing.assert_array_equal(runtime.vertices,vertices)
        np.testing.assert_array_equal(runtime.visual.uv,uv)
        self.assertFalse(repair_closed_inward(runtime))
        opened=source.copy()
        opened.update_faces(np.arange(len(opened.faces)-1))
        self.assertFalse(repair_closed_inward(opened))

    def test_roof_rail_keeps_authored_elevation(self):
        class Capture:
            def __init__(self): self.posts,self.rails=[],[]
            def cyl(self,radius,height,pos,material,**kw): self.posts.append((height,pos))
            def cyl_between(self,a,b,*args,**kw): self.rails.append((a,b))
        c=Capture()
        safety_rail(c,(-1.95,3.18,-1.18),(3.95,3.18,-1.18),.62,18)
        self.assertEqual(len(c.posts),18)
        for height,pos in c.posts: self.assertAlmostEqual(pos[1]-height/2,3.18)
        self.assertAlmostEqual(c.rails[-1][0][1],3.8)
        self.assertAlmostEqual(c.rails[-1][1][1],3.8)

if __name__=='__main__': unittest.main()

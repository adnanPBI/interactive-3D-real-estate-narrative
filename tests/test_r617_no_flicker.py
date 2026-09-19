from pathlib import Path
import importlib.util
import sys
import unittest
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from r617_manufacturing import is_legacy_roof_artifact, enhance_runtime

class NoFlickerTests(unittest.TestCase):
    def test_legacy_context_no_longer_points_at_r5_layers(self):
        text = (ROOT/'scripts/r61-legacy-compat.py').read_text()
        self.assertIn('models" / "r6" / "context', text)
        self.assertNotIn('models" / "r5" / "high', text)
        self.assertNotIn('models" / "r5" / "medium', text)

    def test_marked_compact_roof_block_is_detected_but_long_skylight_is_not(self):
        block = trimesh.creation.box(extents=[.8,.25,.6]); block.apply_translation([0,3.9,0])
        strip = trimesh.creation.box(extents=[.32,.05,7.0]); strip.apply_translation([0,3.9,0])
        self.assertTrue(is_legacy_roof_artifact('L0__RoofVent_0', block, 4.0))
        self.assertFalse(is_legacy_roof_artifact('L0__SkylightStrip', strip, 4.0))

    def test_manufacturing_enhancement_is_above_roof_and_finite(self):
        scene = trimesh.Scene()
        hall = trimesh.creation.box(extents=[12,3.8,7]); hall.apply_translation([0,1.9,0])
        scene.add_geometry(hall)
        before = len(scene.geometry)
        added = enhance_runtime(scene,0)
        self.assertGreater(added,10)
        self.assertGreater(len(scene.geometry),before)
        self.assertTrue(np.isfinite(scene.bounds).all())
        self.assertGreater(scene.bounds[1][1],3.8)

    def test_integrated_campus_keeps_marked_rear_strip_removed(self):
        source=(ROOT/'scripts/generate-r4-assets.py').read_text()
        hero=source.split('def hero_scene():',1)[1].split('def manufacturing_scene():',1)[0]
        self.assertNotIn('b.box((21,.03,1.4),(0,.02,-5.7),"Water")', hero)
        self.assertIn('user-marked area that must remain clear', hero)

    def test_r6_authoring_removed_known_overlap_sources(self):
        integrated=(ROOT/'assets-source/r6/authoring/hero_integrated.py').read_text()
        data=(ROOT/'assets-source/r6/authoring/hero_datacenter.py').read_text()
        recycling=(ROOT/'assets-source/r6/authoring/hero_recycling.py').read_text()
        self.assertIn(',-4.35)', integrated)
        self.assertNotIn('(-6.3,0,-1.2)', data)
        self.assertNotIn('(2.3,1.90,2.0)', recycling)

if __name__ == '__main__': unittest.main()

"""A platform-normalized hash must not admit any altered source geometry."""
from pathlib import Path
import sys
import struct
import json
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from r61_source_identity import verify,identity_digest,IDENTITY_SHA256

class SourceIdentityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=(ROOT/'assets-source/r6/heroes/manufacturing-line/visual-master.glb').read_bytes()

    def test_current_source_matches_reviewed_identity(self):
        self.assertTrue(verify(self.data)['sourceUnmodified'])
        self.assertEqual(identity_digest(self.data),IDENTITY_SHA256)

    def test_position_and_normal_changes_are_rejected(self):
        n=struct.unpack_from('<I',self.data,12)[0]
        tree=json.loads(self.data[20:20+n])
        attributes=tree['meshes'][0]['primitives'][0]['attributes']
        for attribute in ['POSITION','NORMAL','TEXCOORD_0']:
            accessor=tree['accessors'][attributes[attribute]]
            view=tree['bufferViews'][accessor['bufferView']]
            offset=28+n+view.get('byteOffset',0)+accessor.get('byteOffset',0)
            mutated=bytearray(self.data)
            old=struct.unpack_from('<f',mutated,offset)[0]
            struct.pack_into('<f',mutated,offset,old+0.01)
            with self.subTest(attribute=attribute),self.assertRaises(ValueError):
                verify(bytes(mutated))

    def test_bad_header_rejected(self):
        with self.assertRaises(ValueError):verify(b'xxxx'+self.data[4:])

if __name__=='__main__':unittest.main()

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';

const read = path => fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function loadTs(path) {
  const compiled=ts.transpileModule(read(path),{compilerOptions:{
    target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
  }}).outputText;
  const exports={};
  new Function('require','exports',compiled)(id=>{assert.equal(id,'three');return THREE;},exports);
  return exports;
}
const {tuneCinematicMaterial}=loadTs('experience/config/r616Materials.ts');
const make=(name,absolute=false)=>{
  const material=new THREE.MeshStandardMaterial({name});
  material.userData.r616AbsolutePbr=absolute;
  tuneCinematicMaterial(material,/Glass/.test(name));
  return material;
};

test('painted steel remains dielectric instead of chrome',()=>{
  assert.equal(make('Metal_Painted_Charcoal').metalness,.04);
  assert.equal(make('Metal_Steel').metalness,.86);
  assert.equal(make('Concrete').metalness,0);
  assert.equal(make('Rubber').roughness,.88);
});
test('industrial glazing has no depth-writing or metallic tint',()=>{
  const glass=make('Glass_Industrial');
  assert.equal(glass.transparent,true);
  assert.equal(glass.depthWrite,false);
  assert.equal(glass.metalness,0);
  assert.equal(glass.side,THREE.DoubleSide);
  assert.ok(glass.opacity>0 && glass.opacity<.5);
});
test('absolute albedo is not multiplied by a second dark pigment',()=>{
  const material=make('Metal_Painted_Charcoal',true);
  assert.deepEqual(material.color.toArray(),[1,1,1]);
  assert.equal(material.roughness,1);
  assert.equal(material.depthWrite,true);
  assert.equal(material.transparent,false);
});
test('every manufacturing material URL resolves to generated KTX2',()=>{
  const {r61ManufacturingTextureMaterials,r61MaterialTextureUrl,r61GlassMaterials}=loadTs('experience/config/r61Materials.ts');
  assert.ok(r61GlassMaterials.has('Glass_Industrial'));
  assert.equal(Object.keys(r61ManufacturingTextureMaterials).length,8);
  for(const material of Object.keys(r61ManufacturingTextureMaterials)){
    for(const kind of ['basecolor','normal','orm']){
      const url=r61MaterialTextureUrl('manufacturing-line',material,kind);
      const bytes=fs.readFileSync(new URL(`../public${url}`,import.meta.url));
      assert.equal(bytes.subarray(1,4).toString(),'KTX',url);
    }
  }
});
test('radiance geometry exists and HDR is tone-mapped before clamping',()=>{
  const probe=read('components/experience/EnvironmentProbe.tsx');
  assert.match(probe,/new THREE\.ShaderMaterial/);
  assert.match(probe,/new THREE\.PlaneGeometry/);
  assert.match(probe,/pmrem\.fromScene/);
  const fx=read('components/experience/R6PostFX.tsx');
  assert.ok(fx.indexOf('next.addPass(new OutputPass())')<fx.indexOf('next.addPass(grade)'));
  assert.ok(fx.indexOf('next.addPass(grade)')<fx.indexOf('next.addPass(new SMAAPass())'));
  assert.match(fx,/postFx === "off"\) return null/);
  assert.match(fx,/quality === "high" && hdr/);
});
test('floating fans stay removed and paused carrier instances initialize',()=>{
  const motion=read('components/experience/R6AmbientMotion.tsx');
  assert.doesNotMatch(motion,/function CoolingFan|function DataCenterOperations|<DataCenterOperations/);
  assert.match(motion,/useLayoutEffect/);
  assert.match(motion,/<extrudeGeometry/);
  assert.match(read('components/experience/HeroAsset.tsx'),/<primitive object=\{instance\}/);
});

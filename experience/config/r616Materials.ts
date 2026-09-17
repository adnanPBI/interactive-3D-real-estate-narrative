import * as THREE from "three";

/** Painted metal is a dielectric coating, not bare steel. */
export function tuneCinematicMaterial(material: THREE.MeshStandardMaterial, glass: boolean) {
  const name = material.name;
  material.depthTest = true;
  material.alphaHash = false;
  if (glass) {
    material.color.set(name === "Glass_Tinted" ? "#829b9e" : "#b8cbcd");
    material.roughness = 0.12;
    material.metalness = 0;
    material.transparent = true;
    material.opacity = name === "Glass_Tinted" ? 0.42 : 0.27;
    material.depthWrite = false;
    material.side = THREE.DoubleSide;
    material.envMapIntensity = 0.90;
    return;
  }
  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.side = THREE.FrontSide;
  material.envMapIntensity = 0.80;
  if (/Painted|Graphite|Roof|Rubber|Convalt_Blue|Safety_Amber|Warning/.test(name)) {
    material.metalness = 0.04;
    material.roughness = name === "Rubber" ? 0.88 : 0.48;
    material.envMapIntensity = 0.65;
  } else if (/Steel|Aluminum|Bronze|Copper/.test(name)) {
    material.metalness = 0.86;
    material.roughness = /Aluminum/.test(name) ? 0.28 : 0.34;
    material.envMapIntensity = 1;
  } else if (/Concrete|Ground|Recycled/.test(name)) {
    material.metalness = 0;
    material.roughness = 0.86;
    material.envMapIntensity = 0.50;
  } else if (/Facade|Panel_White|White/.test(name)) {
    material.metalness = 0.04;
    material.roughness = 0.51;
  }
  // Absolute albedo maps must not be multiplied by the pigment twice.
  if (material.userData.r616AbsolutePbr) {
    material.color.setRGB(1, 1, 1);
    material.roughness = 1;
    material.metalness = /Painted|Rubber|Safety|Concrete|Panel/.test(name) ? 0.05 : 1;
  }
  material.aoMapIntensity = 0.70;
  if (/Glow|Emissive|ServerFace/.test(name)) {
    material.emissive.copy(material.color);
    material.emissiveIntensity = 0.30;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
  }
}

export const energyFieldVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const energyFieldFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uStrength;
  uniform vec3 uColor;

  void main() {
    vec2 centered = vUv - 0.5;
    float radial = length(centered);
    float alpha = smoothstep(0.50, 0.05, radial) * uStrength;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

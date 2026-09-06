'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type SceneSpec = {
  id: string;
  label: string;
  kicker: string;
  title: string;
  body: string;
  side?: 'left' | 'right';
  camera: [number, number, number];
  target: [number, number, number];
  background: number;
  accent: number;
};

type Diagnostics = {
  fps: number;
  averageFps: number;
  activeScene: number;
  sceneId: string;
  drawCalls: number;
  triangles: number;
  webgl: boolean;
  dpr: number;
  timestamp: number;
};

declare global {
  interface Window {
    __CONVALT_DIAGNOSTICS__?: Diagnostics;
  }
}

const scenes: SceneSpec[] = [
  {
    id: 'hero',
    label: 'Integrated platform',
    kicker: '01 — Convalt Energy',
    title: 'Powering a more resilient future.',
    body: 'A cinematic 3D journey through manufacturing, power generation, data infrastructure and circular-energy systems.',
    camera: [9.6, 6.4, 15.2],
    target: [0, 1, 0],
    background: 0x09100c,
    accent: 0xd29549,
  },
  {
    id: 'manufacturing',
    label: 'Solar manufacturing',
    kicker: '02 — Manufacturing',
    title: 'Built at industrial scale.',
    body: 'A purpose-built solar manufacturing hall reveals production cells, material flow, inspection stations and line infrastructure.',
    side: 'right',
    camera: [8.2, 4.8, 11.3],
    target: [0.8, 1.2, 0],
    background: 0x0d110e,
    accent: 0xc57a2f,
  },
  {
    id: 'generation',
    label: 'Power generation',
    kicker: '03 — Power generation',
    title: 'Generation meets landscape.',
    body: 'A dedicated energy field combines solar arrays, wind turbines and grid infrastructure in a broad outdoor composition.',
    camera: [-9.2, 5.8, 13.8],
    target: [0, 1, 0],
    background: 0x09110f,
    accent: 0xd4a45e,
  },
  {
    id: 'data',
    label: 'Data centers',
    kicker: '04 — Data centers',
    title: 'Infrastructure for the digital economy.',
    body: 'A separate data-center environment exposes server aisles, cooling infrastructure and an energy-fed operations spine.',
    side: 'right',
    camera: [7.5, 3.8, 10.2],
    target: [0.4, 1.4, 0],
    background: 0x080d0c,
    accent: 0xb66f31,
  },
  {
    id: 'recycling',
    label: 'Recycling',
    kicker: '05 — Recycling',
    title: 'Materials return to the system.',
    body: 'The recycling scene visualizes intake, sorting, processing and recovered-material loops as a distinct industrial layout.',
    camera: [-7.8, 4.5, 11.8],
    target: [-0.2, 1, 0],
    background: 0x0a100c,
    accent: 0xbd7a2d,
  },
  {
    id: 'close',
    label: 'Connected ecosystem',
    kicker: '06 — Connected platform',
    title: 'One connected energy platform.',
    body: 'The closing scene recombines the visual language of all four pillars into a single energy-campus composition.',
    side: 'right',
    camera: [0.9, 6.6, 15.5],
    target: [0, 1.3, 0],
    background: 0x090d0b,
    accent: 0xd0a05f,
  },
];

function makeMaterial(
  color: number,
  metalness = 0.35,
  roughness = 0.68,
  emissive = 0,
  emissiveIntensity = 0,
) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity,
    transparent: true,
  });
}

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  rotationY = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  group.add(mesh);
  return mesh;
}

function addCylinder(
  group: THREE.Group,
  radius: number,
  height: number,
  position: [number, number, number],
  material: THREE.Material,
  segments = 16,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    material,
  );
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function buildHero() {
  const group = new THREE.Group();
  const ground = makeMaterial(0x18231c, 0.1, 0.95);
  const dark = makeMaterial(0x1e2924, 0.55, 0.6);
  const glass = makeMaterial(0x183847, 0.7, 0.3);
  const copper = makeMaterial(0xb66f31, 0.7, 0.38);
  const green = makeMaterial(0x536d59, 0.2, 0.86);

  addBox(group, [28, 0.6, 22], [0, -0.65, 0], ground);
  addBox(group, [7, 2.8, 5], [4, 1, -3], dark);
  addBox(group, [5.8, 0.08, 3.8], [4, 2.45, -3], glass);

  for (let z = -7; z <= 7; z += 2.5) {
    for (let x = -10; x <= -2; x += 2.3) {
      const panel = addBox(group, [1.8, 0.08, 1.1], [x, 0.05, z], glass);
      panel.rotation.x = -0.18;
    }
  }

  for (let i = 0; i < 6; i += 1) {
    addBox(group, [0.42, 2.3, 1.1], [2 + i * 0.75, 0.75, 3.5], dark);
  }

  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    addBox(
      group,
      [0.7, 0.7, 0.7],
      [Math.cos(angle) * 7, 0, Math.sin(angle) * 7 + 5],
      green,
      angle,
    );
  }

  for (let i = 0; i < 5; i += 1) {
    addBox(group, [0.55, 0.12, 0.55], [-1 + i * 0.7, 0.1, -4.8], copper);
  }

  return group;
}

function buildManufacturing() {
  const group = new THREE.Group();
  const floor = makeMaterial(0x202824, 0.15, 0.86);
  const steel = makeMaterial(0x7f8984, 0.75, 0.38);
  const dark = makeMaterial(0x1b211e, 0.5, 0.62);
  const copper = makeMaterial(0xb86f2d, 0.7, 0.4);
  const glass = makeMaterial(0x193842, 0.65, 0.32);
  const signal = makeMaterial(0xd59b4b, 0.45, 0.5, 0x5b3510, 0.5);

  addBox(group, [25, 0.45, 15], [0, -0.55, 0], floor);

  for (const x of [-10, -6, -2, 2, 6, 10]) {
    addBox(group, [0.22, 5, 0.22], [x, 1.8, -6.4], steel);
    addBox(group, [0.22, 5, 0.22], [x, 1.8, 6.4], steel);
  }

  addBox(group, [22, 0.2, 0.2], [0, 4.2, -6.4], steel);
  addBox(group, [22, 0.2, 0.2], [0, 4.2, 6.4], steel);

  for (let i = 0; i < 10; i += 1) {
    const x = -8 + i * 1.75;
    addBox(group, [1.45, 0.2, 1.1], [x, 0.05, 0], glass);
    addBox(group, [0.1, 0.7, 1.35], [x, 0.38, 0], steel);
  }

  for (const x of [-6, -2, 2, 6]) {
    addBox(group, [1.4, 1.4, 2.2], [x, 0.7, -3.2], dark);
    addBox(group, [0.5, 0.12, 0.7], [x, 1.45, -3.2], signal);
  }

  for (let i = 0; i < 8; i += 1) {
    addCylinder(group, 0.14, 0.7, [-7 + i * 2, 0, 3.4], copper, 12);
  }

  return group;
}

function buildGeneration() {
  const group = new THREE.Group();
  const earth = makeMaterial(0x1d2a20, 0.05, 0.98);
  const solar = makeMaterial(0x173b4b, 0.72, 0.28);
  const steel = makeMaterial(0x9da4a0, 0.8, 0.32);
  const grid = makeMaterial(0x39453f, 0.55, 0.55);
  const copper = makeMaterial(0xc07a35, 0.65, 0.4);

  addBox(group, [34, 0.5, 24], [0, -0.7, 0], earth);

  for (let z = -8; z <= 6; z += 2.6) {
    for (let x = -12; x <= 1; x += 2.2) {
      const panel = addBox(group, [1.8, 0.07, 1.15], [x, 0.05, z], solar);
      panel.rotation.x = -0.22;
      panel.rotation.y = 0.05;
    }
  }

  const addTurbine = (x: number, z: number, scale: number) => {
    addCylinder(group, 0.11 * scale, 6 * scale, [x, 2.35 * scale, z], steel, 12);
    const rotor = new THREE.Group();
    rotor.position.set(x, 5.35 * scale, z);
    rotor.userData.spin = true;

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.24 * scale, 12, 12), steel);
    rotor.add(hub);

    for (let i = 0; i < 3; i += 1) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(2.5 * scale, 0.08 * scale, 0.13 * scale),
        steel,
      );
      blade.position.x = 1.25 * scale;
      blade.rotation.z = (i * Math.PI * 2) / 3;
      rotor.add(blade);
    }

    group.add(rotor);
  };

  addTurbine(7, -6, 1);
  addTurbine(10, 1, 0.9);
  addTurbine(6, 7, 0.8);

  addBox(group, [5, 2.5, 3], [8, 0.55, 6], grid);
  for (let i = 0; i < 5; i += 1) {
    addBox(group, [0.28, 0.9, 0.28], [6.5 + i * 0.7, 0.85, 4.35], copper);
  }

  return group;
}

function buildDataCenter() {
  const group = new THREE.Group();
  const floor = makeMaterial(0x181d1b, 0.1, 0.9);
  const rack = makeMaterial(0x1d2522, 0.65, 0.45);
  const frame = makeMaterial(0x727a76, 0.75, 0.32);
  const led = makeMaterial(0x3f6f57, 0.2, 0.5, 0x57d58a, 2.1);
  const copper = makeMaterial(0xb96a29, 0.7, 0.36);
  const cooling = makeMaterial(0x283f46, 0.62, 0.38);

  addBox(group, [24, 0.45, 15], [0, -0.6, 0], floor);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i += 1) {
      const x = side * 4.1;
      const z = -5.2 + i * 1.7;
      addBox(group, [1.2, 2.8, 1.25], [x, 1, z], rack);
      for (let y = 0; y < 5; y += 1) {
        addBox(group, [0.05, 0.08, 0.45], [x - side * 0.62, 0.15 + y * 0.48, z], led);
      }
    }
  }

  addBox(group, [2.4, 2.8, 10], [0, 1, 0], cooling);
  for (let i = 0; i < 6; i += 1) {
    addBox(group, [0.22, 0.22, 8], [-1 + i * 0.4, 3, -0.5], frame);
  }

  for (let i = 0; i < 8; i += 1) {
    addBox(group, [0.18, 0.08, 0.7], [-1.4 + i * 0.4, 0.05, 5.6], copper);
  }

  return group;
}

function buildRecycling() {
  const group = new THREE.Group();
  const floor = makeMaterial(0x232a24, 0.08, 0.94);
  const steel = makeMaterial(0x777f79, 0.76, 0.42);
  const dark = makeMaterial(0x202720, 0.48, 0.63);
  const orange = makeMaterial(0xb96e2d, 0.62, 0.44);
  const green = makeMaterial(0x45624d, 0.25, 0.75, 0x244f31, 0.45);
  const scrap = makeMaterial(0x5f655e, 0.78, 0.5);

  addBox(group, [27, 0.45, 17], [0, -0.6, 0], floor);
  addBox(group, [8, 2.8, 5], [-5, 1, -3], dark);
  addBox(group, [7, 2.2, 4], [5, 0.7, 3], dark);

  for (let i = 0; i < 8; i += 1) {
    addCylinder(group, 0.34, 0.7, [-8 + i * 1.1, 0, 2.5], scrap, 10);
  }

  addBox(group, [11, 0.35, 1.5], [0, 0.2, 0], steel, 0.12);
  for (let i = 0; i < 6; i += 1) {
    addBox(group, [0.65, 0.5, 0.75], [-3 + i * 1.3, 0.58, 0], orange, i * 0.1);
  }

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    addBox(
      group,
      [0.6, 0.6, 0.6],
      [6 + Math.cos(angle) * 3, 0, -3 + Math.sin(angle) * 3],
      green,
      angle,
    );
  }

  return group;
}

function buildClosingPlatform() {
  const group = new THREE.Group();
  const base = makeMaterial(0x1a241e, 0.1, 0.94);
  const dark = makeMaterial(0x202a25, 0.55, 0.58);
  const solar = makeMaterial(0x173a48, 0.7, 0.3);
  const copper = makeMaterial(0xbe7732, 0.72, 0.38);
  const green = makeMaterial(0x4f6954, 0.25, 0.82);
  const steel = makeMaterial(0x8c9490, 0.78, 0.34);

  addBox(group, [30, 0.5, 22], [0, -0.65, 0], base);
  addBox(group, [6, 2.4, 5], [0, 0.8, 0], dark);

  for (let x = -11; x <= -4; x += 2.2) {
    for (let z = -7; z <= 4; z += 2.4) {
      const panel = addBox(group, [1.7, 0.07, 1.05], [x, 0.03, z], solar);
      panel.rotation.x = -0.2;
    }
  }

  for (let i = 0; i < 6; i += 1) {
    addBox(group, [0.5, 2.1, 1], [4 + i * 0.7, 0.65, -2], dark);
  }

  addCylinder(group, 0.1, 5.5, [9, 2.1, 5], steel, 12);
  addBox(group, [2.1, 0.07, 0.12], [10, 4.85, 5], steel);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    addBox(
      group,
      [0.55, 0.55, 0.55],
      [Math.cos(angle) * 5, 0, Math.sin(angle) * 5 + 6],
      green,
      angle,
    );
  }

  for (let i = 0; i < 7; i += 1) {
    addBox(group, [0.18, 0.08, 0.55], [-1.1 + i * 0.36, 0.08, -3.2], copper);
  }

  return group;
}

const builders = [
  buildHero,
  buildManufacturing,
  buildGeneration,
  buildDataCenter,
  buildRecycling,
  buildClosingPlatform,
];

export function MultiSceneExperience() {
  const mount = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [qa, setQa] = useState(false);
  const [diag, setDiag] = useState<Diagnostics>({
    fps: 0,
    averageFps: 0,
    activeScene: 0,
    sceneId: scenes[0].id,
    drawCalls: 0,
    triangles: 0,
    webgl: false,
    dpr: 1,
    timestamp: 0,
  });

  useEffect(() => {
    setQa(new URLSearchParams(window.location.search).get('qa') === '1');
  }, []);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      host.classList.add('fallback');
      return;
    }

    const dpr = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    host.appendChild(renderer.domElement);

    const world = new THREE.Scene();
    world.background = new THREE.Color(scenes[0].background);
    world.fog = new THREE.Fog(scenes[0].background, 12, 36);

    const camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(...scenes[0].camera);

    world.add(new THREE.HemisphereLight(0xdde4df, 0x111713, 1.45));

    const sun = new THREE.DirectionalLight(0xffe6c1, 2.8);
    sun.position.set(8, 12, 7);
    world.add(sun);

    const rim = new THREE.PointLight(scenes[0].accent, 11, 25);
    rim.position.set(-6, 5, -5);
    world.add(rim);

    const groups = builders.map((builder, index) => {
      const group = builder();
      group.visible = index < 2;
      world.add(group);
      return group;
    });

    const backgroundA = new THREE.Color();
    const backgroundB = new THREE.Color();
    const background = new THREE.Color();
    const accentA = new THREE.Color();
    const accentB = new THREE.Color();
    const cameraFrom = new THREE.Vector3();
    const cameraTo = new THREE.Vector3();
    const targetFrom = new THREE.Vector3();
    const targetTo = new THREE.Vector3();
    const target = new THREE.Vector3();

    let raf = 0;
    let lastFrame = performance.now();
    let fpsWindowStart = lastFrame;
    let fpsFrames = 0;
    let currentFps = 60;
    let totalFrames = 0;
    let totalFrameTime = 0;
    let lastActive = -1;
    let lastDiagnosticPublish = 0;

    const animate = (now: number) => {
      const frameTime = Math.max(0.1, now - lastFrame);
      lastFrame = now;
      fpsFrames += 1;
      totalFrames += 1;
      totalFrameTime += frameTime;

      if (now - fpsWindowStart >= 1000) {
        currentFps = Math.round((fpsFrames * 1000) / (now - fpsWindowStart));
        fpsFrames = 0;
        fpsWindowStart = now;
      }

      const scrollMax = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const scrollProgress = THREE.MathUtils.clamp(window.scrollY / scrollMax, 0, 1);
      const scenePosition = scrollProgress * (scenes.length - 1);
      const from = Math.floor(scenePosition);
      const to = Math.min(scenes.length - 1, from + 1);
      const local = scenePosition - from;
      const eased = local * local * (3 - 2 * local);
      const activeIndex = Math.min(scenes.length - 1, Math.round(scenePosition));

      if (activeIndex !== lastActive) {
        lastActive = activeIndex;
        setActive(activeIndex);
      }

      groups.forEach((group, index) => {
        const distance = Math.abs(index - scenePosition);
        group.visible = distance < 1.08;
        if (!group.visible) return;

        const weight = Math.max(0, 1 - distance);
        group.position.y = -(1 - weight) * 0.35;
        group.rotation.y = (index % 2 ? -0.03 : 0.03) * (1 - weight);

        group.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const item of materials) {
            if (item instanceof THREE.MeshStandardMaterial) {
              item.opacity = Math.max(0.08, weight);
            }
          }
        });
      });

      groups[2].traverse((object) => {
        if (object instanceof THREE.Group && object.userData.spin === true) {
          object.rotation.z -= frameTime * 0.00035;
        }
      });

      cameraFrom.set(...scenes[from].camera);
      cameraTo.set(...scenes[to].camera);
      camera.position.lerpVectors(cameraFrom, cameraTo, eased);

      targetFrom.set(...scenes[from].target);
      targetTo.set(...scenes[to].target);
      target.lerpVectors(targetFrom, targetTo, eased);
      camera.lookAt(target);

      backgroundA.setHex(scenes[from].background);
      backgroundB.setHex(scenes[to].background);
      background.lerpColors(backgroundA, backgroundB, eased);
      if (world.background instanceof THREE.Color) {
        world.background.copy(background);
      }
      if (world.fog instanceof THREE.Fog) {
        world.fog.color.copy(background);
      }

      accentA.setHex(scenes[from].accent);
      accentB.setHex(scenes[to].accent);
      rim.color.lerpColors(accentA, accentB, eased);
      rim.position.x = -6 + Math.sin(now * 0.0002) * 2;

      renderer.render(world, camera);

      if (now - lastDiagnosticPublish >= 500) {
        const averageFps = totalFrameTime > 0
          ? Math.round((totalFrames * 1000) / totalFrameTime)
          : 0;
        const nextDiagnostics: Diagnostics = {
          fps: currentFps,
          averageFps,
          activeScene: activeIndex,
          sceneId: scenes[activeIndex].id,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          webgl: true,
          dpr: renderer.getPixelRatio(),
          timestamp: Date.now(),
        };
        window.__CONVALT_DIAGNOSTICS__ = nextDiagnostics;
        setDiag(nextDiagnostics);
        lastDiagnosticPublish = now;
      }

      raf = requestAnimationFrame(animate);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    };

    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      groups.forEach((group) => {
        group.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((item) => item.dispose());
        });
      });
      renderer.dispose();
      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <header className="site-nav">
        <a className="brand" href="#hero">
          CONVALT <b>ENERGY</b>
        </a>
        <nav className="navlinks" aria-label="Primary navigation">
          <a href="#projects">Projects</a>
          <a href="#team">Team</a>
          <a href="#media">Media</a>
          <a href="#resources">Resources</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <div className="experience">
        <div className="canvas-shell" ref={mount}>
          <div className="fallback" />
        </div>
        <div className="veil" />

        <div className="hud" aria-live="polite">
          <span>{String(active + 1).padStart(2, '0')} / 06</span>
          <strong>{scenes[active].label}</strong>
        </div>

        <div className={`diag ${qa ? 'show' : ''}`} aria-live="polite">
          <div>FPS: {diag.fps}</div>
          <div>AVG: {diag.averageFps}</div>
          <div>SCENE: {diag.sceneId}</div>
          <div>DRAWS: {diag.drawCalls}</div>
          <div>TRIS: {diag.triangles}</div>
          <div>DPR: {diag.dpr.toFixed(2)}</div>
          <div>WEBGL: {diag.webgl ? 'PASS' : 'WAIT'}</div>
        </div>

        <div className="progress" aria-label="3D story chapters">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              className={index === active ? 'active' : ''}
              aria-label={`Go to ${scene.label}`}
              onClick={() => chapterRefs.current[index]?.scrollIntoView({ behavior: 'smooth' })}
            />
          ))}
        </div>

        <main className="story">
          {scenes.map((scene, index) => (
            <section
              id={scene.id}
              key={scene.id}
              ref={(node) => {
                chapterRefs.current[index] = node;
              }}
              className={`chapter ${scene.side === 'right' ? 'right' : ''}`}
            >
              <div className="copy">
                <div className="kicker">{scene.kicker}</div>
                {index === 0 ? <h1>{scene.title}</h1> : <h2>{scene.title}</h2>}
                <p>{scene.body}</p>
                <span className="cue">
                  {index < 5 ? 'Scroll to explore' : 'Continue to project portfolio'}
                </span>
              </div>
            </section>
          ))}
        </main>
      </div>

      <section id="projects" className="below">
        <div className="kicker">Projects</div>
        <h2>Energy infrastructure across four connected pillars.</h2>
        <p>
          The conventional content layer follows the immersive sequence with fast,
          accessible information architecture.
        </p>
        <div className="grid">
          <article className="card">
            <small>Manufacturing</small>
            <div>
              <h3>Solar manufacturing</h3>
              <p>Integrated production and domestic supply-chain infrastructure.</p>
            </div>
          </article>
          <article className="card">
            <small>Generation</small>
            <div>
              <h3>Power projects</h3>
              <p>Utility-scale renewable generation and supporting grid systems.</p>
            </div>
          </article>
          <article className="card">
            <small>Compute</small>
            <div>
              <h3>Data centers</h3>
              <p>Energy-aligned digital infrastructure.</p>
            </div>
          </article>
        </div>
      </section>

      <section id="team" className="below dark">
        <div className="kicker">Team</div>
        <h2>Built by operators.</h2>
        <p>
          Leadership, development, operations and advisors presented through a clean,
          responsive directory layer.
        </p>
      </section>

      <section id="media" className="below">
        <div className="kicker">Media</div>
        <h2>News and announcements.</h2>
        <p>
          Media, press releases and company updates remain semantic and indexable
          outside the immersive canvas.
        </p>
      </section>

      <section id="resources" className="below dark">
        <div className="kicker">Resources</div>
        <h2>Industry references.</h2>
        <p>Manufacturing, policy, raw-material and supply-chain resources.</p>
      </section>

      <section id="contact" className="below">
        <div className="kicker">Contact</div>
        <h2>Start a conversation.</h2>
        <p>
          Contact delivery credentials are configured independently of the public
          WebGL experience.
        </p>
      </section>

      <footer className="footer">
        <span>Convalt Energy — Stage 6</span>
        <span>Six-scene Next.js / Three.js runtime</span>
      </footer>
    </>
  );
}

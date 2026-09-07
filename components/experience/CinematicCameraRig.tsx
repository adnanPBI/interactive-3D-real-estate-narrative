"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cameraShot, sceneDefinitions, sceneTimeline, viewportClass } from "@/experience/config/scenes";
import { storyMotion } from "@/experience/config/storyMotion";
import { useExperienceStore } from "@/lib/experienceStore";

const desired = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const lightA = new THREE.Vector3();
const lightB = new THREE.Vector3();
const accentA = new THREE.Color();
const accentB = new THREE.Color();
const warm = new THREE.Color("#fff7e8");
const bgA = new THREE.Color();
const bgB = new THREE.Color();
const bg = new THREE.Color();

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

/** Allocation-free cardinal/Catmull-Rom scalar interpolation. */
function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  const tension = storyMotion.splineTension;
  const m1 = (p2 - p0) * tension;
  const m2 = (p3 - p1) * tension;
  return (2 * t3 - 3 * t2 + 1) * p1
    + (t3 - 2 * t2 + t) * m1
    + (-2 * t3 + 3 * t2) * p2
    + (t3 - t2) * m2;
}

function shotAt(index: number, width: number) {
  return cameraShot(sceneDefinitions[Math.max(0, Math.min(sceneDefinitions.length - 1, index))], width);
}

function setSplineVector(target: THREE.Vector3, width: number, from: number, t: number, key: "position" | "target") {
  const p0 = shotAt(from - 1, width)[key];
  const p1 = shotAt(from, width)[key];
  const p2 = shotAt(from + 1, width)[key];
  const p3 = shotAt(from + 2, width)[key];
  target.set(
    catmull(p0[0], p1[0], p2[0], p3[0], t),
    catmull(p0[1], p1[1], p2[1], p3[1], t),
    catmull(p0[2], p1[2], p2[2], p3[2], t),
  );
}

/**
 * Camera + atmospheric orchestration. All authored motion is a pure function of
 * the master timeline progress; frame-time damping only removes display jitter.
 */
export function CinematicCameraRig({ quality }: { quality: "high" | "medium" }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.PointLight>(null);

  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.castShadow = quality === "high";
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.00025;
    light.shadow.normalBias = 0.025;
    const camera = light.shadow.camera as THREE.OrthographicCamera;
    camera.left = -17;
    camera.right = 17;
    camera.top = 17;
    camera.bottom = -17;
    camera.near = 0.5;
    camera.far = 42;
    camera.updateProjectionMatrix();
  }, [quality]);

  useFrame((state, delta) => {
    const progress = useExperienceStore.getState().progress;
    const timeline = sceneTimeline(progress);
    const a = sceneDefinitions[timeline.from];
    const b = sceneDefinitions[timeline.to];
    const t = smoothStep(timeline.local);
    const viewport = viewportClass(state.size.width);
    const parallax = storyMotion.pointerParallax[viewport];
    const reduced = typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced";

    setSplineVector(desired, state.size.width, timeline.from, t, "position");
    // R3 camera art direction is monotonic from right to left. Cardinal splines
    // can overshoot between points, so clamp X to the current segment before
    // adding only a near-imperceptible pointer offset.
    const segmentA = shotAt(timeline.from, state.size.width).position[0];
    const segmentB = shotAt(timeline.to, state.size.width).position[0];
    desired.x = THREE.MathUtils.clamp(desired.x, Math.min(segmentA, segmentB), Math.max(segmentA, segmentB));
    if (!reduced) {
      desired.x += state.pointer.x * parallax.x;
      desired.y += state.pointer.y * parallax.y;
    }

    const cameraDamping = reduced ? 24 : storyMotion.cameraDamping;
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, desired.x, cameraDamping, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, desired.y, cameraDamping, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, desired.z, cameraDamping, delta);

    setSplineVector(lookTarget, state.size.width, timeline.from, t, "target");
    if (!reduced) {
      lookTarget.x += state.pointer.x * parallax.x * 0.22;
      lookTarget.y += state.pointer.y * parallax.y * 0.26;
    }
    state.camera.lookAt(lookTarget);

    const perspective = state.camera as THREE.PerspectiveCamera;
    const fov0 = shotAt(timeline.from - 1, state.size.width).fov;
    const fov1 = shotAt(timeline.from, state.size.width).fov;
    const fov2 = shotAt(timeline.from + 1, state.size.width).fov;
    const fov3 = shotAt(timeline.from + 2, state.size.width).fov;
    const desiredFov = catmull(fov0, fov1, fov2, fov3, t);
    perspective.fov = THREE.MathUtils.damp(perspective.fov, desiredFov, reduced ? 24 : storyMotion.fovDamping, delta);
    perspective.updateProjectionMatrix();

    if (sun.current) {
      lightA.fromArray(a.keyLight);
      lightB.fromArray(b.keyLight);
      sun.current.position.copy(lightA.lerp(lightB, t));
      sun.current.intensity = THREE.MathUtils.damp(
        sun.current.intensity,
        THREE.MathUtils.lerp(a.keyIntensity, b.keyIntensity, t) * (quality === "high" ? 1 : 0.9),
        storyMotion.lightDamping,
        delta,
      );
      accentA.set(a.accent);
      accentB.set(b.accent);
      sun.current.color.copy(accentA).lerp(accentB, t).lerp(warm, 0.86);
    }

    if (rim.current) {
      accentA.set(a.accent);
      accentB.set(b.accent);
      rim.current.color.copy(accentA).lerp(accentB, t);
      rim.current.intensity = THREE.MathUtils.damp(
        rim.current.intensity,
        THREE.MathUtils.lerp(a.rimIntensity, b.rimIntensity, t) * (quality === "high" ? 1 : 0.72),
        storyMotion.lightDamping,
        delta,
      );
    }

    bgA.set(a.background);
    bgB.set(b.background);
    bg.copy(bgA).lerp(bgB, t);
    if (state.scene.background instanceof THREE.Color) state.scene.background.lerp(bg, 1 - Math.exp(-delta * 4.2));
    if (state.scene.fog instanceof THREE.Fog) {
      state.scene.fog.near = THREE.MathUtils.damp(state.scene.fog.near, THREE.MathUtils.lerp(a.fog[0], b.fog[0], t), 3.6, delta);
      state.scene.fog.far = THREE.MathUtils.damp(state.scene.fog.far, THREE.MathUtils.lerp(a.fog[1], b.fog[1], t), 3.6, delta);
      state.scene.fog.color.lerp(bg, 1 - Math.exp(-delta * 4.2));
    }
  });

  return (
    <>
      <hemisphereLight args={["#fffaf1", "#90958d", quality === "high" ? 1.02 : 0.90]} />
      <directionalLight ref={sun} position={[6, 10, 5]} intensity={2.2} castShadow={quality === "high"} />
      <pointLight ref={rim} position={[-6, 4.5, -4]} intensity={5.8} distance={25} decay={2} />
      <pointLight position={[3.5, 2.6, 5.5]} color="#ffd7a0" intensity={quality === "high" ? 1.25 : 0.75} distance={15} decay={2} />
    </>
  );
}

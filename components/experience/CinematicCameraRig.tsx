"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cameraShot, sceneDefinitions, sceneTimeline, viewportClass } from "@/experience/config/scenes";
import { storyMotion } from "@/experience/config/storyMotion";
import { r6ChapterHero } from "@/experience/config/r6Assets";
import { r612HeroMotion } from "@/experience/config/r612Motion";
import { useExperienceStore } from "@/lib/experienceStore";

const desired = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const lightA = new THREE.Vector3();
const lightB = new THREE.Vector3();
const accentA = new THREE.Color();
const accentB = new THREE.Color();
const warm = new THREE.Color("#f5ead8");
const bgA = new THREE.Color();
const bgB = new THREE.Color();
const bg = new THREE.Color();
const SHADOW_POSITION_EPSILON = 0.004;

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

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

export function CinematicCameraRig({ quality }: { quality: "high" | "medium" }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.PointLight>(null);
  const previousShadowSun = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.castShadow = true;
    const shadowSize = storyMotion.quality[quality].shadowMapSize;
    light.shadow.mapSize.set(shadowSize, shadowSize);
    light.shadow.bias = -0.00018;
    light.shadow.normalBias = quality === "high" ? 0.018 : 0.026;
    light.shadow.radius = quality === "high" ? 1.15 : 0.9;
    const camera = light.shadow.camera as THREE.OrthographicCamera;
    const extent = quality === "high" ? 14.5 : 12.5;
    camera.left = -extent;
    camera.right = extent;
    camera.top = extent;
    camera.bottom = -extent;
    camera.near = 0.5;
    camera.far = 42;
    camera.updateProjectionMatrix();
    previousShadowSun.current = null;
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
    const elapsed = state.clock.elapsedTime;
    const motionA = r612HeroMotion[r6ChapterHero[timeline.from]];
    const motionB = r612HeroMotion[r6ChapterHero[timeline.to]];

    setSplineVector(desired, state.size.width, timeline.from, t, "position");
    const segmentA = shotAt(timeline.from, state.size.width).position[0];
    const segmentB = shotAt(timeline.to, state.size.width).position[0];
    desired.x = THREE.MathUtils.clamp(desired.x, Math.min(segmentA, segmentB), Math.max(segmentA, segmentB));
    if (!reduced) {
      desired.x += state.pointer.x * parallax.x * 0.55;
      desired.y += state.pointer.y * parallax.y * 0.55;
      desired.x += Math.sin(elapsed * 0.075 + timeline.position * 0.47)
        * THREE.MathUtils.lerp(motionA.cameraDrift[0], motionB.cameraDrift[0], t);
      desired.y += Math.sin(elapsed * 0.060 + 1.1 + timeline.position * 0.31)
        * THREE.MathUtils.lerp(motionA.cameraDrift[1], motionB.cameraDrift[1], t);
      desired.z += Math.cos(elapsed * 0.065 + 0.4 + timeline.position * 0.36)
        * THREE.MathUtils.lerp(motionA.cameraDrift[2], motionB.cameraDrift[2], t);
    }

    const cameraDamping = reduced ? 24 : storyMotion.cameraDamping;
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, desired.x, cameraDamping, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, desired.y, cameraDamping, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, desired.z, cameraDamping, delta);

    setSplineVector(lookTarget, state.size.width, timeline.from, t, "target");
    if (!reduced) {
      lookTarget.x += state.pointer.x * parallax.x * 0.11;
      lookTarget.y += state.pointer.y * parallax.y * 0.13;
      lookTarget.x += Math.sin(elapsed * 0.055 + 0.8)
        * THREE.MathUtils.lerp(motionA.cameraLookDrift[0], motionB.cameraLookDrift[0], t);
      lookTarget.y += Math.cos(elapsed * 0.048 + 0.2)
        * THREE.MathUtils.lerp(motionA.cameraLookDrift[1], motionB.cameraLookDrift[1], t);
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
      if (!reduced) {
        sun.current.position.x += Math.sin(elapsed * 0.038)
          * THREE.MathUtils.lerp(motionA.sunOrbit[0], motionB.sunOrbit[0], t);
        sun.current.position.y += Math.sin(elapsed * 0.031 + 0.7)
          * THREE.MathUtils.lerp(motionA.sunOrbit[1], motionB.sunOrbit[1], t);
        sun.current.position.z += Math.cos(elapsed * 0.038)
          * THREE.MathUtils.lerp(motionA.sunOrbit[2], motionB.sunOrbit[2], t);
      }
      const prior = previousShadowSun.current;
      if (!prior || prior.distanceToSquared(sun.current.position) >= SHADOW_POSITION_EPSILON * SHADOW_POSITION_EPSILON) {
        state.gl.shadowMap.needsUpdate = true;
        if (prior) prior.copy(sun.current.position);
        else previousShadowSun.current = sun.current.position.clone();
      }
      const pulse = reduced ? 0 : Math.sin(elapsed * 0.08 + progress * Math.PI * 2)
        * THREE.MathUtils.lerp(motionA.sunPulse, motionB.sunPulse, t);
      sun.current.intensity = THREE.MathUtils.damp(
        sun.current.intensity,
        THREE.MathUtils.lerp(a.keyIntensity, b.keyIntensity, t) * (quality === "high" ? 0.78 : 0.70) * (1 + pulse),
        storyMotion.lightDamping,
        delta,
      );
      accentA.set(a.accent);
      accentB.set(b.accent);
      sun.current.color.copy(accentA).lerp(accentB, t).lerp(warm, 0.90);
    }

    if (rim.current) {
      accentA.set(a.accent);
      accentB.set(b.accent);
      rim.current.color.copy(accentA).lerp(accentB, t);
      rim.current.intensity = THREE.MathUtils.damp(
        rim.current.intensity,
        THREE.MathUtils.lerp(a.rimIntensity, b.rimIntensity, t) * (quality === "high" ? 0.64 : 0.48),
        storyMotion.lightDamping,
        delta,
      );
    }

    bgA.set(a.background).multiplyScalar(0.84);
    bgB.set(b.background).multiplyScalar(0.84);
    bg.copy(bgA).lerp(bgB, t);
    if (state.scene.background instanceof THREE.Color) state.scene.background.lerp(bg, 1 - Math.exp(-delta * 4.2));
    if (state.scene.fog instanceof THREE.Fog) {
      state.scene.fog.near = THREE.MathUtils.damp(state.scene.fog.near, THREE.MathUtils.lerp(a.fog[0], b.fog[0], t) + 4, 3.6, delta);
      state.scene.fog.far = THREE.MathUtils.damp(state.scene.fog.far, THREE.MathUtils.lerp(a.fog[1], b.fog[1], t) + 12, 3.6, delta);
      state.scene.fog.color.lerp(bg, 1 - Math.exp(-delta * 4.2));
    }
  });

  return (
    <>
      <hemisphereLight args={["#ebe6dc", "#626963", quality === "high" ? 0.46 : 0.40]} />
      <directionalLight ref={sun} position={[6, 10, 5]} intensity={1.7} castShadow />
      <pointLight ref={rim} position={[-6, 4.5, -4]} intensity={3.2} distance={25} decay={2} />
      <pointLight position={[3.5, 2.6, 5.5]} color="#d9b47c" intensity={quality === "high" ? 0.48 : 0.30} distance={15} decay={2} />
    </>
  );
}

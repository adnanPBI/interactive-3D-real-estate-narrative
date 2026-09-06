"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { chapters } from "@/content/site";
import { useExperienceStore } from "@/lib/experienceStore";

export type SceneBenchmark = {
  scene: string;
  averageFps: number;
  onePercentLowFps: number;
  p95FrameMs: number;
  maxFrameMs: number;
  droppedFrameRatio: number;
  frames: number;
  sampleSeconds: number;
  pass: boolean;
};

export type LaptopBenchmarkReport = {
  generatedAt: string;
  userAgent: string;
  viewport: string;
  dpr: number;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  webglRenderer: string;
  quality: string;
  criteria: { averageFps: number; onePercentLowFps: number; p95FrameMs: number };
  results: SceneBenchmark[];
  overallPass: boolean;
};

type NavMemory = Navigator & { deviceMemory?: number };

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))];
}

function webglRenderer() {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
    if (!gl) return "WebGL unavailable";
    const ext = gl.getExtension("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL: number } | null;
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  } catch { return "Renderer unavailable"; }
}

async function sampleFrames(seconds: number) {
  const deltas: number[] = [];
  await new Promise<void>((resolve) => {
    let start = 0;
    let last = 0;
    const frame = (now: number) => {
      if (!start) { start = now; last = now; requestAnimationFrame(frame); return; }
      const delta = now - last;
      last = now;
      if (delta < 1000) deltas.push(delta);
      if (now - start < seconds * 1000) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
  return deltas;
}

export function LaptopBenchmarkPanel({ quality, activeChapter }: { quality: string; activeChapter: number }) {
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [report, setReport] = useState<LaptopBenchmarkReport | null>(null);
  const aborted = useRef(false);

  const sampleSeconds = useMemo(() => {
    if (typeof window === "undefined") return 8;
    const value = Number(new URLSearchParams(window.location.search).get("sample") ?? 8);
    return Math.min(30, Math.max(5, Number.isFinite(value) ? value : 8));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get("benchmark") === "1" || params.get("qa") === "1");
  }, []);

  if (!enabled) return null;

  const run = async () => {
    if (running) return;
    setRunning(true); aborted.current = false; setReport(null);
    const results: SceneBenchmark[] = [];
    for (let index = 0; index < chapters.length; index += 1) {
      if (aborted.current) break;
      setStatus(`Warming chapter ${index + 1}/${chapters.length}: ${chapters[index].id}`);
      const anchor = index / Math.max(1, chapters.length - 1);
      useExperienceStore.getState().setTargetProgress(anchor);
      useExperienceStore.getState().setTimelineProgress(anchor);
      useExperienceStore.getState().setActiveChapter(index);
      await sleep(2200);
      setStatus(`Measuring ${chapters[index].id} for ${sampleSeconds}s`);
      const deltas = await sampleFrames(sampleSeconds);
      const totalMs = deltas.reduce((sum, value) => sum + value, 0);
      const averageFps = totalMs > 0 ? deltas.length / (totalMs / 1000) : 0;
      const frameFps = deltas.map((delta) => 1000 / Math.max(0.1, delta));
      const onePercentLowFps = percentile(frameFps, 0.01);
      const p95FrameMs = percentile(deltas, 0.95);
      const maxFrameMs = Math.max(0, ...deltas);
      const dropped = deltas.filter((delta) => delta > 20).length / Math.max(1, deltas.length);
      const scene = {
        scene: chapters[index].id,
        averageFps: Number(averageFps.toFixed(2)),
        onePercentLowFps: Number(onePercentLowFps.toFixed(2)),
        p95FrameMs: Number(p95FrameMs.toFixed(2)),
        maxFrameMs: Number(maxFrameMs.toFixed(2)),
        droppedFrameRatio: Number(dropped.toFixed(4)),
        frames: deltas.length,
        sampleSeconds,
        pass: averageFps >= 58 && onePercentLowFps >= 45 && p95FrameMs <= 20,
      } satisfies SceneBenchmark;
      results.push(scene);
    }
    const nav = navigator as NavMemory;
    const nextReport: LaptopBenchmarkReport = {
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      deviceMemory: nav.deviceMemory ?? null,
      webglRenderer: webglRenderer(),
      quality,
      criteria: { averageFps: 58, onePercentLowFps: 45, p95FrameMs: 20 },
      results,
      overallPass: results.length === chapters.length && results.every((result) => result.pass),
    };
    window.__CONVALT_LAPTOP_BENCHMARK__ = nextReport;
    setReport(nextReport);
    setStatus(nextReport.overallPass ? "PASS — physical-laptop 60 FPS gate" : "FAIL — optimization still required");
    setRunning(false);
  };

  const download = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `convalt-laptop-benchmark-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <aside className="benchmark-panel" aria-label="Real laptop performance benchmark">
    <div className="benchmark-panel__head"><strong>60 FPS acceptance</strong><span>scene {activeChapter + 1}/6</span></div>
    <p>{status}</p>
    <small>Physical hardware only · {sampleSeconds}s per scene · quality: {quality}</small>
    <div className="benchmark-actions">
      <button type="button" onClick={run} disabled={running}>{running ? "Running…" : "Run 6-scene test"}</button>
      {running && <button type="button" onClick={() => { aborted.current = true; setStatus("Stopping after current scene"); }}>Stop</button>}
      {report && <button type="button" onClick={download}>Export JSON</button>}
    </div>
    {report && <div className="benchmark-results">
      {report.results.map((result) => <div key={result.scene} data-pass={result.pass}>
        <span>{result.scene}</span><strong>{result.averageFps} fps</strong><small>1% {result.onePercentLowFps} · p95 {result.p95FrameMs} ms</small>
      </div>)}
    </div>}
  </aside>;
}

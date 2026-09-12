import type { LaptopBenchmarkReport } from "@/components/experience/LaptopBenchmarkPanel";

export {};

declare global {
  interface Window {
    __CONVALT_PERF__?: {
      samples: Array<{
        at: number;
        fps: number;
        dpr: number;
        chapter: number;
        quality: string;
        lod?: string;
        postFx?: string;
        calls: number;
        triangles: number;
        totalCalls?: number;
        totalTriangles?: number;
        postCalls?: number;
        postTriangles?: number;
        geometries: number;
        textures: number;
        shadowsEnabled?: boolean;
        budgetWarnings?: string[];
      }>;
    };
    __CONVALT_LAPTOP_BENCHMARK__?: LaptopBenchmarkReport;
    __R6_WEBGL_PROBE_ATTEMPTS__?: number;
  }
}

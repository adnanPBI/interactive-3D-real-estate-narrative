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
        calls: number;
        triangles: number;
        geometries: number;
        textures: number;
        budgetWarnings?: string[];
      }>;
    };
    __CONVALT_LAPTOP_BENCHMARK__?: LaptopBenchmarkReport;
  }
}

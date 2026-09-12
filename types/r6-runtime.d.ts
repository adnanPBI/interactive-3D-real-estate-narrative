export {};

declare global {
  interface Window {
    __CONVALT_ACTIVE_HERO__?: { hero: string; lod: string; url: string; ready: boolean };
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
    __R6_WEBGL_PROBE_ATTEMPTS__?: number;
  }
}

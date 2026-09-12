export {};

declare global {
  interface Window {
    __CONVALT_ACTIVE_HERO__?: { hero: string; lod: string; url: string; ready: boolean };
  }
}

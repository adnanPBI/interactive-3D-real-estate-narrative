export type RenderTelemetry = {
  sceneCalls: number;
  sceneTriangles: number;
  totalCalls: number;
  totalTriangles: number;
  postCalls: number;
  postTriangles: number;
};

let current: RenderTelemetry = {
  sceneCalls: 0,
  sceneTriangles: 0,
  totalCalls: 0,
  totalTriangles: 0,
  postCalls: 0,
  postTriangles: 0,
};

export function setSceneRenderTelemetry(sceneCalls: number, sceneTriangles: number) {
  current = {
    ...current,
    sceneCalls,
    sceneTriangles,
    totalCalls: sceneCalls,
    totalTriangles: sceneTriangles,
    postCalls: 0,
    postTriangles: 0,
  };
}

export function finalizeRenderTelemetry(totalCalls: number, totalTriangles: number) {
  current = {
    ...current,
    totalCalls,
    totalTriangles,
    postCalls: Math.max(0, totalCalls - current.sceneCalls),
    postTriangles: Math.max(0, totalTriangles - current.sceneTriangles),
  };
}

export function getRenderTelemetry(): RenderTelemetry {
  return current;
}

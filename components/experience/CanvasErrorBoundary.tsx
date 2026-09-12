"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; onFatal?: (error: Error) => void };
type State = { failed: boolean };

/** Claude-scaffold idea retained for R6: a failed WebGL tree must fail closed. */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("[R6] WebGL experience failed; switching to authored fallback.", error);
    this.props.onFatal?.(error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

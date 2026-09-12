"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; onError: (error: Error) => void };
type State = { failed: boolean };

export class ExperienceErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[3D] Experience render failure", error, info);
    this.props.onError(error);
  }
  render() { return this.state.failed ? null : this.props.children; }
}

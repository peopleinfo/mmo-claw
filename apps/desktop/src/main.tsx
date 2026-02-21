import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { ensureDesktopApi } from "./lib/desktop-api-fallback";
import "./styles.css";

ensureDesktopApi();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-output" style={{ padding: 20, color: "red" }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.onerror = (msg, src, lineno, colno, err) => {
  document.body.innerHTML += `<div style="color:red"><pre>Global Error: ${msg}\n${err?.stack}</pre></div>`;
  fetch("http://localhost:5173/__log_error", {
    method: "POST",
    body: msg + "\n" + err?.stack,
  }).catch(() => null);
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

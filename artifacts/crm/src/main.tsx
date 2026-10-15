import { createRoot } from "react-dom/client";
import { startTableStacking } from "./lib/stackTables";
import { installAuthFetch } from "./lib/authFetch";
import App from "./App";
import "./index.css";

installAuthFetch();
// Phones behave like an app: no pinch / double-tap zoom (iOS ignores user-scalable=no on its own)
if (typeof document !== "undefined") {
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener("gesturestart", stop, { passive: false } as any);
  document.addEventListener("gesturechange", stop, { passive: false } as any);
  document.addEventListener("touchmove", (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}
createRoot(document.getElementById("root")!).render(<App />);
startTableStacking();

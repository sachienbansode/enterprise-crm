import { createRoot } from "react-dom/client";
import { startTableStacking } from "./lib/stackTables";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
startTableStacking();

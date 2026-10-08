import { createRoot } from "react-dom/client";
import { startTableStacking } from "./lib/stackTables";
import { installAuthFetch } from "./lib/authFetch";
import App from "./App";
import "./index.css";

installAuthFetch();
createRoot(document.getElementById("root")!).render(<App />);
startTableStacking();

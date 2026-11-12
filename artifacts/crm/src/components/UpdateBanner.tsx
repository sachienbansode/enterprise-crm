import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { APP_VERSION, useServerVersion } from "../lib/version";

// After a deploy, an open tab still runs the old screens. When the server reports a newer version, offer a reload.
export default function UpdateBanner() {
  const server = useServerVersion();
  const [hidden, setHidden] = useState("");
  if (!server || server.version === "dev" || APP_VERSION === "dev" || server.version === APP_VERSION || hidden === server.version) return null;
  return (
    <div role="status" className="fixed z-[90] left-1/2 -translate-x-1/2 bottom-24 md:bottom-5 w-[calc(100%-24px)] max-w-md rounded-2xl bg-blue-600 text-white shadow-2xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <RefreshCw className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0 text-sm"><div className="font-semibold">NIYTRI CRM has been updated</div><div className="text-[12px] opacity-90">v{server.version} is live — you're on v{APP_VERSION}. Reload to get it.</div></div>
      <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg bg-white text-blue-700 text-sm font-semibold">Reload</button>
      <button onClick={() => setHidden(server.version)} aria-label="Later" className="p-1 opacity-80 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

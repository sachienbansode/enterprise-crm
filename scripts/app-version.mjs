// App version shown in the CRM (About page, sidebar, sign-in page) and returned by /healthz.
// Changes on every deploy: <year>.<month>.<build> where build = number of commits on the deployed branch.
//   e.g. 2026.11.412 (commit 8a857ec)
// Override with APP_VERSION=… if the build runs outside a git checkout.
import { execSync } from "node:child_process";

const git = (cmd) => { try { return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };

export function appVersion() {
  const sha = process.env.APP_COMMIT || git("rev-parse --short HEAD") || "local";
  const count = git("rev-list --count HEAD") || "0";
  const date = git("log -1 --format=%cs") || new Date().toISOString().slice(0, 10);
  const [y, m] = date.split("-");
  const version = process.env.APP_VERSION || `${y}.${Number(m)}.${count}`;
  return { version, sha, built: new Date().toISOString() };
}

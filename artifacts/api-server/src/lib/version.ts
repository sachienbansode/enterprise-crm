// Version of the running API, set at build time (scripts/app-version.mjs → esbuild define).
// The browser compares it with its own version and offers a reload after a deploy.
declare const __APP_VERSION__: string, __APP_COMMIT__: string, __BUILD_TIME__: string;
export const APP_INFO = {
  version: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev",
  commit: typeof __APP_COMMIT__ === "string" ? __APP_COMMIT__ : "",
  built: typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "",
};

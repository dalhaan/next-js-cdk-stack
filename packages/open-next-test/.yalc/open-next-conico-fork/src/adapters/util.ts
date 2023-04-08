import fs from "node:fs";
import path from "node:path";

export function loadConfig(nextDir: string) {
  const filePath = path.join(nextDir, "required-server-files.json");
  const json = fs.readFileSync(filePath, "utf-8");
  const { config } = JSON.parse(json);
  return config;
}

export function loadBuildId(nextDir: string) {
  const filePath = path.join(nextDir, "BUILD_ID");
  return fs.readFileSync(filePath, "utf-8").trim();
}

interface PrerenderManifest {
  version: number;
  routes: {
    dataRoute: string;
    srcRoute: string | null;
    initialRevalidateSeconds: number | boolean;
  }[];
  dynamicRoutes: {
    routeRegex: string;
    dataRoute: string;
    fallback: string | null;
    dataRouteRegex: string;
  }[];
  preview: {
    previewModeId: string;
    previewModeSigningKey: string;
    previewModeEncryptionKey: string;
  };
}

export function loadPrerenderManifest(nextDir: string) {
  const filePath = path.join(nextDir, "prerender-manifest.json");
  const json = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(json) as PrerenderManifest;
}

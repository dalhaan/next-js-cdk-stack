import fs from "node:fs";
import path from "node:path";
export function loadConfig(nextDir) {
    const filePath = path.join(nextDir, "required-server-files.json");
    const json = fs.readFileSync(filePath, "utf-8");
    const { config } = JSON.parse(json);
    return config;
}
export function loadBuildId(nextDir) {
    const filePath = path.join(nextDir, "BUILD_ID");
    return fs.readFileSync(filePath, "utf-8").trim();
}
export function loadPrerenderManifest(nextDir) {
    const filePath = path.join(nextDir, "prerender-manifest.json");
    const json = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(json);
}

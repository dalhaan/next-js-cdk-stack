import fs from "node:fs";
import path from "node:path";
import { request } from "node:https";
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
export async function revalidateInBackground(host, path, preview) {
    try {
        await new Promise((resolve, reject) => {
            request(`https://${host}${path}`, {
                method: "HEAD",
                headers: { "x-prerender-revalidate": preview },
            })
                .on("error", (err) => reject(err))
                .end(() => resolve());
        });
    }
    catch (e) {
        console.error("Failed to revalidate stale page.", path);
        console.error(e);
    }
}

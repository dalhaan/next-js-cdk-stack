export declare function loadConfig(nextDir: string): any;
export declare function loadBuildId(nextDir: string): string;
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
export declare function loadPrerenderManifest(nextDir: string): PrerenderManifest;
export {};

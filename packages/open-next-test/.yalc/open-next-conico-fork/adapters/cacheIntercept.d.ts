import type { PrerenderManifest } from "./util.js";
import { S3Client } from "@aws-sdk/client-s3";
interface MatchedRoute {
    key: string;
    route: string;
    revalidate: number;
}
interface CompiledDynamicRoute {
    routeRegex: RegExp;
    dataRouteRegex: RegExp;
    srcRoute: string;
}
interface ProxyEvent {
    rawPath: string;
    headers: Record<string, string>;
    method: string;
}
interface ProxyResult {
    statusCode: number;
    headers: Record<string, string | string[]>;
    body: string;
    isBase64Encoded: boolean;
}
export declare class CacheInterceptor {
    buildId: string;
    s3: S3Client;
    revalidates: Map<string, number>;
    prerenderedRoutes: MatchedRoute[];
    compiledDynamicRoutes: CompiledDynamicRoute[];
    preview: string;
    constructor({ routes, dynamicRoutes, preview }: PrerenderManifest, buildId: string);
    parsePath(path: string): string;
    matcher: (url: string) => MatchedRoute | null;
    revalidate(uri: string, host?: string): Promise<void>;
    handler(event: ProxyEvent): Promise<ProxyResult | false>;
}
export {};

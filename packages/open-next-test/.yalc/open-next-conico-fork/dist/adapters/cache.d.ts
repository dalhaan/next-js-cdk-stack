/// <reference types="node" resolution-mode="require"/>
interface CachedFetchValue {
    kind: "FETCH";
    data: {
        headers: {
            [k: string]: string;
        };
        body: string;
        status?: number;
    };
    revalidate: number;
}
interface CachedRedirectValue {
    kind: "REDIRECT";
    props: Object;
}
interface CachedRouteValue {
    kind: "ROUTE";
    body: Buffer;
    status: number;
    headers: Record<string, undefined | string | string[]>;
}
interface CachedImageValue {
    kind: "IMAGE";
    etag: string;
    buffer: Buffer;
    extension: string;
    isMiss?: boolean;
    isStale?: boolean;
}
interface IncrementalCachedPageValue {
    kind: "PAGE";
    html: string;
    pageData: Object;
}
type IncrementalCacheValue = CachedRedirectValue | IncrementalCachedPageValue | CachedImageValue | CachedFetchValue | CachedRouteValue;
interface CacheHandlerContext {
    fs?: never;
    dev?: boolean;
    flushToDisk?: boolean;
    serverDistDir?: string;
    maxMemoryCacheSize?: number;
    _appDir: boolean;
    _requestHeaders: never;
    fetchCacheKeyPrefix?: string;
}
interface CacheHandlerValue {
    lastModified?: number;
    age?: number;
    cacheState?: string;
    value: IncrementalCacheValue | null;
}
export default class S3Cache {
    private client;
    private buildId;
    constructor(_ctx: CacheHandlerContext);
    get(key: string): Promise<CacheHandlerValue | null>;
    set(key: string, data?: IncrementalCacheValue): Promise<void>;
    private getPath;
    private getS3Object;
    private putS3Object;
}
export {};

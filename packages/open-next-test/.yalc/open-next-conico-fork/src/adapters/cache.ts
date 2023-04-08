import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import path from "path";
import { loadBuildId } from "./util.js";
import { debug } from "./logger.js";

interface CachedFetchValue {
  kind: "FETCH";
  data: {
    headers: { [k: string]: string };
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
  // this needs to be a RenderResult so since renderResponse
  // expects that type instead of a string
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
  // this needs to be a string since the cache expects to store
  // the string value
  html: string;
  pageData: Object;
}

type IncrementalCacheValue =
  | CachedRedirectValue
  | IncrementalCachedPageValue
  | CachedImageValue
  | CachedFetchValue
  | CachedRouteValue;

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

type Extension = "json" | "html" | "rsc" | "body" | "meta";

export default class S3Cache {
  private client: S3Client;
  private buildId: string;
  constructor(_ctx: CacheHandlerContext) {
    debug("S3Cache(contructor)", _ctx);
    this.client = new S3Client({});
    this.buildId = loadBuildId(
      path.dirname(_ctx.serverDistDir ?? ".next/server")
    );

    debug("S3Cache.buildId", this.buildId);
  }

  async get(key: string): Promise<CacheHandlerValue | null> {
    debug("S3Cache.get(key)", key);
    debug("CACHE_BUCKET_NAME", process.env.CACHE_BUCKET_NAME);
    const { Contents } = await this.client.send(
      new ListObjectsV2Command({
        Bucket: process.env.CACHE_BUCKET_NAME,
        Prefix: `${this.buildId}${key}.`,
      })
    );
    debug("S3Cache.get(ListObjects.Contents)", Contents);
    const keys = Contents?.map(({ Key }) => Key);
    debug("S3Cache.get(ListObjects.Contents.keys)", keys);
    if (!keys?.length) {
      return null;
    }
    if (keys.includes(this.getPath(key, "body"))) {
      debug("S3Cache::keys.includes(body)");
      try {
        const { Body, LastModified } = await this.getS3Object(key, "body");
        debug("S3Cache::getObject.LastModified", LastModified);
        const body = await Body?.transformToByteArray();

        const { Body: metaBody } = await this.getS3Object(key, "meta");
        const meta = JSON.parse((await metaBody?.transformToString()) ?? "{}");

        const cacheEntry: CacheHandlerValue = {
          lastModified: LastModified?.getTime(),
          value: {
            kind: "ROUTE",
            body: Buffer.from(body ?? Buffer.alloc(0)),
            status: meta.status,
            headers: meta.headers,
          },
        };
        return cacheEntry;
      } catch (e) {
        // no .meta data for the related key
        console.error(e);
      }
    }
    if (
      keys.includes(this.getPath(key, "html")) &&
      (keys.includes(this.getPath(key, "json")) ||
        keys.includes(this.getPath(key, "rsc")))
    ) {
      debug("S3Cache::keys.includes(html, json, rsc)");
      try {
        const { Body, LastModified } = await this.getS3Object(key, "html");
        debug("S3Cache::get.LastModified", LastModified);

        const pageData = keys.includes(this.getPath(key, "json"))
          ? JSON.parse(
              (await (
                await this.getS3Object(key, "json")
              ).Body?.transformToString()) ?? "{}"
            )
          : Buffer.from(
              (await (
                await this.getS3Object(key, "rsc")
              ).Body?.transformToByteArray()) ?? Buffer.alloc(0)
            );

        const cacheEntry: CacheHandlerValue = {
          lastModified: LastModified?.getTime(),
          value: {
            kind: "PAGE",
            html: (await Body?.transformToString()) ?? "",
            pageData,
          },
        };
        return cacheEntry;
      } catch (e) {
        console.error(e);
        return null;
      }
    }
    return null;
  }

  async set(key: string, data?: IncrementalCacheValue): Promise<void> {
    debug("S3Cache::set(key)", key);
    if (data?.kind === "ROUTE") {
      debug("S3Cache::set:ROUTE");
      const { body, status, headers } = data;
      await this.putS3Object(key, body, "body");
      await this.putS3Object(key, JSON.stringify({ status, headers }), "meta");
    }
    if (data?.kind === "PAGE") {
      debug("S3Cache::set:PAGE");
      const { html, pageData } = data;
      await this.putS3Object(key, html, "html");
      const isAppPath = typeof pageData === "string";
      await this.putS3Object(
        key,
        isAppPath ? pageData : JSON.stringify(pageData),
        isAppPath ? "rsc" : "json"
      );
    }
  }

  private getPath(key: string, extension: Extension) {
    debug("S3Cache::getPath(key, extension)", key, extension);
    return path.join(this.buildId, `${key}.${extension}`);
  }

  private async getS3Object(key: string, extension: Extension) {
    debug("S3Cache::getS3Object(key, extension)", key, extension);
    const Key = this.getPath(key, extension);
    return this.client.send(
      new GetObjectCommand({
        Bucket: process.env.CACHE_BUCKET_NAME,
        Key,
      })
    );
  }

  private async putS3Object(
    key: string,
    value: PutObjectCommandInput["Body"],
    extension: Extension
  ) {
    const Key = this.getPath(key, extension);
    debug("S3Cache::putS3Object(key, extension, Key)", key, extension, Key);
    return this.client.send(
      new PutObjectCommand({
        Bucket: process.env.CACHE_BUCKET_NAME,
        Key,
        Body: value,
      })
    );
  }
}

import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, } from "@aws-sdk/client-s3";
import path from "path";
import { loadBuildId } from "./util.js";
import { debug } from "./logger.js";
export default class S3Cache {
    client;
    buildId;
    constructor(_ctx) {
        debug("S3Cache(contructor)", _ctx);
        this.client = new S3Client({});
        this.buildId = loadBuildId(path.dirname(_ctx.serverDistDir ?? ".next/server"));
        debug("S3Cache.buildId", this.buildId);
    }
    async get(key) {
        debug("S3Cache.get(key)", key);
        debug("CACHE_BUCKET_NAME", process.env.CACHE_BUCKET_NAME);
        const { Contents } = await this.client.send(new ListObjectsV2Command({
            Bucket: process.env.CACHE_BUCKET_NAME,
            Prefix: `${this.buildId}${key}.`,
        }));
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
                const cacheEntry = {
                    lastModified: LastModified?.getTime(),
                    value: {
                        kind: "ROUTE",
                        body: Buffer.from(body ?? Buffer.alloc(0)),
                        status: meta.status,
                        headers: meta.headers,
                    },
                };
                return cacheEntry;
            }
            catch (e) {
                // no .meta data for the related key
                console.error(e);
            }
        }
        if (keys.includes(this.getPath(key, "html")) &&
            (keys.includes(this.getPath(key, "json")) ||
                keys.includes(this.getPath(key, "rsc")))) {
            debug("S3Cache::keys.includes(html, json, rsc)");
            try {
                const { Body, LastModified } = await this.getS3Object(key, "html");
                debug("S3Cache::get.LastModified", LastModified);
                const pageData = keys.includes(this.getPath(key, "json"))
                    ? JSON.parse((await (await this.getS3Object(key, "json")).Body?.transformToString()) ?? "{}")
                    : Buffer.from((await (await this.getS3Object(key, "rsc")).Body?.transformToByteArray()) ?? Buffer.alloc(0));
                const cacheEntry = {
                    lastModified: LastModified?.getTime(),
                    value: {
                        kind: "PAGE",
                        html: (await Body?.transformToString()) ?? "",
                        pageData,
                    },
                };
                return cacheEntry;
            }
            catch (e) {
                console.error(e);
                return null;
            }
        }
        return null;
    }
    async set(key, data) {
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
            await this.putS3Object(key, isAppPath ? pageData : JSON.stringify(pageData), isAppPath ? "rsc" : "json");
        }
    }
    getPath(key, extension) {
        debug("S3Cache::getPath(key, extension)", key, extension);
        return path.join(this.buildId, `${key}.${extension}`);
    }
    async getS3Object(key, extension) {
        debug("S3Cache::getS3Object(key, extension)", key, extension);
        const Key = this.getPath(key, extension);
        return this.client.send(new GetObjectCommand({
            Bucket: process.env.CACHE_BUCKET_NAME,
            Key,
        }));
    }
    async putS3Object(key, value, extension) {
        const Key = this.getPath(key, extension);
        debug("S3Cache::putS3Object(key, extension, Key)", key, extension, Key);
        return this.client.send(new PutObjectCommand({
            Bucket: process.env.CACHE_BUCKET_NAME,
            Key,
            Body: value,
        }));
    }
}

import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, } from "@aws-sdk/client-s3";
import path from "path";
import { loadBuildId } from "./util.js";
export default class S3Cache {
    client;
    buildId;
    constructor(_ctx) {
        this.client = new S3Client({});
        this.buildId = loadBuildId(path.dirname(_ctx.serverDistDir ?? ".next/server"));
    }
    async get(key) {
        const { Contents } = await this.client.send(new ListObjectsV2Command({
            Bucket: process.env.CACHE_BUCKET_NAME,
            Prefix: `${this.buildId}${key}.`,
        }));
        const keys = Contents?.map(({ Key }) => Key);
        if (!keys?.length) {
            return null;
        }
        if (keys.includes(this.getPath(key, "body"))) {
            try {
                const { Body, LastModified } = await this.getS3Object(key, "body");
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
            try {
                const { Body, LastModified } = await this.getS3Object(key, "html");
                const pageData = keys.includes(this.getPath(key, "json"))
                    ? JSON.parse((await (await this.getS3Object(key, "json")).Body?.transformToString()) ??
                        "{}")
                    : Buffer.from((await (await this.getS3Object(key, "rsc")).Body?.transformToByteArray()) ??
                        Buffer.alloc(0));
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
        if (data?.kind === "ROUTE") {
            const { body, status, headers } = data;
            await this.putS3Object(key, body, "body");
            await this.putS3Object(key, JSON.stringify({ status, headers }), "meta");
        }
        if (data?.kind === "PAGE") {
            const { html, pageData } = data;
            await this.putS3Object(key, html, "html");
            const isAppPath = typeof pageData === "string";
            await this.putS3Object(key, isAppPath ? pageData : JSON.stringify(pageData), isAppPath ? "rsc" : "json");
        }
    }
    getPath(key, extension) {
        return path.join(this.buildId, `${key}.${extension}`);
    }
    async getS3Object(key, extension) {
        const Key = this.getPath(key, extension);
        return this.client.send(new GetObjectCommand({
            Bucket: process.env.CACHE_BUCKET_NAME,
            Key,
        }));
    }
    async putS3Object(key, value, extension) {
        const Key = this.getPath(key, extension);
        return this.client.send(new PutObjectCommand({
            Bucket: process.env.CACHE_BUCKET_NAME,
            Key,
            Body: value,
        }));
    }
}

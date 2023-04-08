import fs from "node:fs";
import path from "node:path";
import { IncomingMessage } from "./request.js";
import { ServerResponse } from "./response.js";
import { request } from "node:https";
// @ts-ignore
import NextServer from "next/dist/server/next-server.js";
import { loadBuildId, loadConfig, loadPrerenderManifest } from "./util.js";
import { isBinaryContentType } from "./binary.js";
import { debug } from "./logger.js";
import { CacheInterceptor } from "./cacheIntercept.js";
setNextjsServerWorkingDirectory();
const nextDir = path.join(__dirname, ".next");
const config = loadConfig(nextDir);
const htmlPages = loadHtmlPages();
const prerenderManifest = loadPrerenderManifest(nextDir);
debug({ nextDir });
const cacheInterceptor = new CacheInterceptor(prerenderManifest, loadBuildId(nextDir));
// Create a NextServer
let requestHandler = null;
const getServer = () => {
    if (requestHandler) {
        return requestHandler;
    }
    requestHandler = new NextServer.default({
        hostname: "localhost",
        port: Number(process.env.PORT) || 3000,
        // Next.js compression should be disabled because of a bug in the bundled
        // `compression` package — https://github.com/vercel/next.js/issues/11669
        conf: {
            ...config,
            compress: false,
            experimental: {
                ...config.experimental,
                incrementalCacheHandlerPath: `${process.env.LAMBDA_TASK_ROOT}/cache.js`,
            },
        },
        customServer: false,
        dev: false,
        dir: __dirname,
    }).getRequestHandler();
    return requestHandler;
};
const eventParser = {
    apiv2: (event) => ({
        get method() {
            return event.requestContext.http.method;
        },
        get rawPath() {
            return event.rawPath;
        },
        get url() {
            const { rawPath, rawQueryString } = event;
            return rawQueryString.length > 0 ? `${rawPath}?${rawQueryString}` : rawPath;
        },
        get body() {
            const { body, isBase64Encoded } = event;
            if (Buffer.isBuffer(body)) {
                return body;
            }
            else if (typeof body === "string") {
                return Buffer.from(body, isBase64Encoded ? "base64" : "utf8");
            }
            else if (typeof body === "object") {
                return Buffer.from(JSON.stringify(body));
            }
            return Buffer.from("", "utf8");
        },
        get headers() {
            const { headers: rawHeaders, cookies } = event;
            const headers = {};
            if (Array.isArray(cookies)) {
                headers["cookie"] = cookies.join("; ");
            }
            for (const [key, value] of Object.entries(rawHeaders || {})) {
                headers[key.toLowerCase()] = value;
            }
            return headers;
        },
        get remoteAddress() {
            return event.requestContext.http.sourceIp;
        },
    }),
    cloudfront: (event) => ({
        get method() {
            return event.Records[0].cf.request.method;
        },
        get rawPath() {
            return event.Records[0].cf.request.uri;
        },
        get url() {
            const { uri, querystring } = event.Records[0].cf.request;
            return querystring.length > 0 ? `${uri}?${querystring}` : uri;
        },
        get body() {
            const { body } = event.Records[0].cf.request;
            if (!body) {
                return Buffer.from("", "utf8");
            }
            return body.encoding === "base64"
                ? Buffer.from(body.data, "base64")
                : Buffer.from(body.data, "utf8");
        },
        get headers() {
            const { headers: rawHeaders } = event.Records[0].cf.request;
            const headers = {};
            for (const [key, values] of Object.entries(rawHeaders)) {
                for (const { value } of values) {
                    if (value) {
                        headers[key] = value;
                    }
                }
            }
            return headers;
        },
        get remoteAddress() {
            return event.Records[0].cf.request.clientIp;
        },
    }),
};
/////////////
// Handler //
/////////////
export async function handler(event) {
    debug("handler event", event);
    // Parse Lambda event and create Next.js request
    const isCloudFrontEvent = event.Records?.[0]?.cf;
    const parser = isCloudFrontEvent
        ? eventParser.cloudfront(event)
        : eventParser.apiv2(event);
    //Try intercept the request to see if it is a cached request
    const cacheResponse = await cacheInterceptor.handler(parser);
    if (cacheResponse) {
        // If we have a cache response, return it and don't invoke NextServer
        return isCloudFrontEvent
            ? formatCloudFrontResponse(cacheResponse)
            : formatApiv2Response(cacheResponse);
    }
    const reqProps = {
        method: parser.method,
        url: parser.url,
        //WORKAROUND: We pass this header to the serverless function to mimic a prefetch request which will not trigger revalidation since we handle revalidation differently
        headers: { ...parser.headers, purpose: "prefetch" },
        body: parser.body,
        remoteAddress: parser.remoteAddress,
    };
    debug("IncomingMessage constructor props", reqProps);
    const req = new IncomingMessage(reqProps);
    const res = new ServerResponse({ method: reqProps.method });
    // Process Next.js request
    await processRequest(req, res);
    // Format Next.js response to Lambda response
    const statusCode = res.statusCode || 200;
    const headers = ServerResponse.headers(res);
    const isBase64Encoded = isBinaryContentType(Array.isArray(headers["content-type"])
        ? headers["content-type"][0]
        : headers["content-type"]);
    const encoding = isBase64Encoded ? "base64" : "utf8";
    const body = ServerResponse.body(res).toString(encoding);
    debug("ServerResponse data", { statusCode, headers, isBase64Encoded, body });
    // WORKAROUND: `NextServer` does not set cache response headers for HTML pages — https://github.com/serverless-stack/open-next#workaround-nextserver-does-not-set-cache-response-headers-for-html-pages
    if (htmlPages.includes(parser.rawPath) && headers["cache-control"]) {
        headers["cache-control"] = "public, max-age=0, s-maxage=31536000, must-revalidate";
    }
    // WORKAROUND: `NextServer` does not revalidate correctly
    // x-nextjs-cache should be allowed in cloudfront headers
    const nextJsCacheHeader = headers?.["x-nextjs-cache"];
    if (nextJsCacheHeader === "STALE" || nextJsCacheHeader === "MISS") {
        headers["cache-control"] = "public, max-age=0, s-maxage=0, must-revalidate";
        const preview = prerenderManifest.preview;
        try {
            await new Promise((resolve, reject) => {
                request(`https://${headers.host}${parser.rawPath}`, {
                    method: "HEAD",
                    headers: { "x-prerender-revalidate": preview.previewModeId },
                })
                    .on("error", (err) => reject(err))
                    .end(() => resolve());
            });
        }
        catch (e) {
            console.error("Failed to revalidate stale page.", parser.rawPath);
            console.error(e);
        }
    }
    return isCloudFrontEvent
        ? // WORKAROUND: public/ static files served by the server function (AWS specific) — https://github.com/serverless-stack/open-next#workaround-public-static-files-served-by-the-server-function-aws-specific
            statusCode === 404
                ? formatCloudFrontFailoverResponse(event)
                : formatCloudFrontResponse({ statusCode, headers, isBase64Encoded, body })
        : formatApiv2Response({ statusCode, headers, isBase64Encoded, body });
}
//////////////////////
// Helper functions //
//////////////////////
function setNextjsServerWorkingDirectory() {
    // WORKAROUND: Set `NextServer` working directory (AWS specific) — https://github.com/serverless-stack/open-next#workaround-set-nextserver-working-directory-aws-specific
    process.chdir(__dirname);
}
function loadHtmlPages() {
    const filePath = path.join(nextDir, "server", "pages-manifest.json");
    const json = fs.readFileSync(filePath, "utf-8");
    return Object.entries(JSON.parse(json))
        .filter(([_, value]) => value.endsWith(".html"))
        .map(([key]) => key);
}
async function processRequest(req, res) {
    // @ts-ignore
    // Next.js doesn't parse body if the property exists
    // https://github.com/dougmoscrop/serverless-http/issues/227
    delete req.body;
    try {
        await getServer()(req, res);
    }
    catch (e) {
        console.error("NextJS request failed.", e);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
            message: "Server failed to respond.",
            details: e,
        }, null, 2));
    }
}
function formatApiv2Response({ statusCode, headers: rawHeaders, body, isBase64Encoded, }) {
    const headers = {};
    Object.entries(rawHeaders)
        .filter(([key]) => key.toLowerCase() !== "set-cookie")
        .forEach(([key, value]) => {
        if (value === null) {
            headers[key] = "";
            return;
        }
        headers[key] = Array.isArray(value) ? value.join(", ") : value.toString();
    });
    const response = {
        statusCode,
        headers,
        cookies: rawHeaders["set-cookie"],
        body,
        isBase64Encoded,
    };
    debug(response);
    return response;
}
function formatCloudFrontResponse({ statusCode, headers: rawHeaders, body, isBase64Encoded, }) {
    const headers = {};
    Object.entries(rawHeaders)
        .filter(([key]) => key.toLowerCase() !== "content-length")
        .forEach(([key, value]) => {
        headers[key] = [
            ...(headers[key] || []),
            ...(Array.isArray(value)
                ? value.map((v) => ({ key, value: v }))
                : [{ key, value: value.toString() }]),
        ];
    });
    const response = {
        status: statusCode.toString(),
        statusDescription: "OK",
        headers,
        bodyEncoding: isBase64Encoded ? "base64" : "text",
        body,
    };
    debug(response);
    return response;
}
function formatCloudFrontFailoverResponse(event) {
    return event.Records[0].cf.request;
}

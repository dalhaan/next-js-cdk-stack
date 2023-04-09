/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import http from "node:http";
export declare class IncomingMessage extends http.IncomingMessage {
    constructor({ method, url, headers, body, remoteAddress, }: {
        method: string;
        url: string;
        headers: Record<string, string>;
        body: Buffer;
        remoteAddress: string;
    });
}

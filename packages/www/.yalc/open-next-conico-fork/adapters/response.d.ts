/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import http from "node:http";
export declare class ServerResponse extends http.ServerResponse {
    static from(res: any): ServerResponse;
    static body(res: any): Buffer;
    static headers(res: any): any;
    get headers(): any;
    setHeader(key: any, value: any): void;
    writeHead(statusCode: any, reason: any, obj: any): void;
    constructor({ method }: {
        method: any;
    });
}

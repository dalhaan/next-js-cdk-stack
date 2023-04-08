import type { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";
export declare function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult>;

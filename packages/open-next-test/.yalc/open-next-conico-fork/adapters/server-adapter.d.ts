import type { APIGatewayProxyEventV2, CloudFrontRequestEvent } from "aws-lambda";
export declare function handler(event: APIGatewayProxyEventV2 | CloudFrontRequestEvent): Promise<import("aws-lambda").APIGatewayProxyStructuredResultV2 | import("aws-lambda").CloudFrontRequest | import("aws-lambda").CloudFrontResultResponse>;

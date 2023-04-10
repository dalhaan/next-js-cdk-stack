import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NextJSAssetsBucket } from "../constructs/next-js-assets-bucket";
import { NextJsServerFunction } from "../constructs/next-js-server-function";
import { NextJsImageOptimisationFunction } from "../constructs/next-js-image-optimisation-function";
import { NextJsCdn } from "../constructs/next-js-cdn";

const OPEN_NEXT_ASSETS_DIR = "../../packages/www/.open-next/assets/";
const OPEN_NEXT_CACHE_DIR = "../../packages/www/.open-next/cache/";
const OPEN_NEXT_SERVER_FUNCTION_DIR =
  "../../packages/www/.open-next/server-function/";
const OPEN_NEXT_IMAGE_OPTIMISATION_FUNCTION_DIR =
  "../../packages/www/.open-next/image-optimization-function/";

/**
 * NextJS CDK Stack
 *
 * Creates:
 *   - S3 bucket for assets
 *   - Server function lambda
 *   - Image optimisation function lambda
 *   - CloudFront distribution
 */
export class NextJsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const assetsBucket = new NextJSAssetsBucket(this, "AssetsBucket", {
      openNextAssetsDir: OPEN_NEXT_ASSETS_DIR,
      openNextCacheDir: OPEN_NEXT_CACHE_DIR,
    });

    const serverFunction = new NextJsServerFunction(this, "ServerFunction", {
      assetsBucket,
      openNextServerDir: OPEN_NEXT_SERVER_FUNCTION_DIR,
    });

    const imageOptimisationFunction = new NextJsImageOptimisationFunction(
      this,
      "ImageOptimisationFunction",
      {
        assetsBucket,
        openNextImageOptimisationFunctionDir:
          OPEN_NEXT_IMAGE_OPTIMISATION_FUNCTION_DIR,
      }
    );

    const cdn = new NextJsCdn(this, "CloudFront", {
      assetsBucket,
      serverFunction,
      imageOptimisationFunction,
    });

    // Deploy assets to bucket and invalidate cdn
    assetsBucket.deployAndInvalidate(cdn);

    // Outputs
    new cdk.CfnOutput(this, "CloudFrontDistributionDomainName", {
      value: cdn.distributionDomainName,
    });
  }
}

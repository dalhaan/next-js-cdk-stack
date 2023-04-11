import * as cdk from "aws-cdk-lib";
import * as path from "node:path";
import { Construct } from "constructs";
import { NextJSAssetsBucket } from "../constructs/next-js-assets-bucket";
import { NextJsServerFunction } from "../constructs/next-js-server-function";
import { NextJsImageOptimisationFunction } from "../constructs/next-js-image-optimisation-function";
import { NextJsCdn } from "../constructs/next-js-cdn";

type Props = cdk.StackProps & {
  path: string;
};

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
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const assetsBucket = new NextJSAssetsBucket(this, "AssetsBucket", {
      openNextAssetsDir: path.join(props.path, ".open-next/assets"),
      openNextCacheDir: path.join(props.path, ".open-next/cache"),
    });

    const serverFunction = new NextJsServerFunction(this, "ServerFunction", {
      assetsBucket,
      openNextServerDir: path.join(props.path, ".open-next/server-function"),
    });

    const imageOptimisationFunction = new NextJsImageOptimisationFunction(
      this,
      "ImageOptimisationFunction",
      {
        assetsBucket,
        openNextImageOptimisationFunctionDir: path.join(
          props.path,
          ".open-next/image-optimization-function"
        ),
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

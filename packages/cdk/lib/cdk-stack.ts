import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NextJSAssetsBucket } from "./constructs/next-js-assets-bucket";
import { NextJsServerFunction } from "./constructs/next-js-server-function";
import { NextJsImageOptimisationFunction } from "./constructs/next-js-image-optimisation-function";
import { NextJsCdn } from "./constructs/next-js-cdn";

const OPEN_NEXT_ASSETS_DIR = "../../packages/open-next-test/.open-next/assets/";
const OPEN_NEXT_SERVER_FUNCTION_DIR =
  "../../packages/open-next-test/.open-next/server-function/";
const OPEN_NEXT_IMAGE_OPTIMISATION_FUNCTION_DIR =
  "../../packages/open-next-test/.open-next/image-optimization-function/";

export class OpenNextStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const assetsBucket = new NextJSAssetsBucket(this, "AssetsBucket", {
      bucketName: "opennext-assets",
      openNextAssetsDir: OPEN_NEXT_ASSETS_DIR,
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

    // Outputs

    new cdk.CfnOutput(this, "ServerFunctionUrl", {
      value: serverFunction.url,
    });

    new cdk.CfnOutput(this, "ImageOptimisationFunctionUrl", {
      value: imageOptimisationFunction.url,
    });
  }
}

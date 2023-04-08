import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import { stripSchemeFromUrl } from "./utils";
import { NextJSAssetsBucket } from "./constructs/next-js-assets-bucket";

const OPEN_NEXT_ASSETS_DIR = "../../packages/open-next-test/.open-next/assets/";
const OPEN_NEXT_SERVER_FUNCTION_DIR =
  "../../packages/open-next-test/.open-next/server-function/";
const OPEN_NEXT_IMAGE_OPTIMISATION_FUNCTION_DIR =
  "../../packages/open-next-test/.open-next/image-optimization-function/";

export class OpenNextStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ----------------
    // S3 assets bucket
    // ----------------

    // Assets Bucket
    // const assetsBucket = new s3.Bucket(this, "AssetsBucket", {
    //   bucketName: "opennext-assets",
    // });
    const assetsBucket = new NextJSAssetsBucket(this, "AssetsBucket", {
      bucketName: "opennext-assets",
      openNextAssetsDirectory: OPEN_NEXT_ASSETS_DIR,
    });

    // ----------------------
    // Server function lambda
    // ----------------------
    const serverFunction = new lambda.Function(this, "ServerFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(OPEN_NEXT_SERVER_FUNCTION_DIR),
      timeout: cdk.Duration.seconds(10),
    });

    // Server function environment variables
    serverFunction.addEnvironment("BUCKET_NAME", assetsBucket.bucketName);
    serverFunction.addEnvironment("CACHE_BUCKET_NAME", assetsBucket.bucketName);
    serverFunction.addEnvironment("NODE_ENV", "production");

    // Add function URL
    const serverFunctionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    // Strip scheme (https://) from server function url to use for an HttpOrigin
    const serverFunctionUrlNoScheme = stripSchemeFromUrl(serverFunctionUrl.url);

    new cdk.CfnOutput(this, "ServerFunctionUrl", {
      value: serverFunctionUrl.url,
    });

    // Allow read/write to assets bucket
    assetsBucket.grantReadWrite(serverFunction);

    // ----------------------------------
    // Image optimisation function lambda
    // ----------------------------------
    const imageOptimisationFunction = new lambda.Function(
      this,
      "ImageOptimisationFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        architecture: lambda.Architecture.ARM_64,
        handler: "index.handler",
        code: lambda.Code.fromAsset(OPEN_NEXT_IMAGE_OPTIMISATION_FUNCTION_DIR),
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Server function environment variables
    imageOptimisationFunction.addEnvironment(
      "BUCKET_NAME",
      assetsBucket.bucketName
    );
    imageOptimisationFunction.addEnvironment("NODE_ENV", "production");

    // Add function URL
    const imageOptimisationFunctionUrl =
      imageOptimisationFunction.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
      });
    // Strip scheme (https://) from image optimisation function url to use for an HttpOrigin
    const imageOptimisationFunctionUrlNoScheme = stripSchemeFromUrl(
      imageOptimisationFunctionUrl.url
    );

    new cdk.CfnOutput(this, "ImageOptimisationFunctionUrl", {
      value: imageOptimisationFunctionUrl.url,
    });

    // Allow read/write to assets bucket
    assetsBucket.grantRead(imageOptimisationFunction);

    // ----------
    // CloudFront
    // ----------

    // origins
    const assetsBucketOrigin = new origins.S3Origin(assetsBucket);
    const serverFunctionOrigin = new origins.HttpOrigin(
      serverFunctionUrlNoScheme
    );
    const imageOptimisationFunctionOrigin = new origins.HttpOrigin(
      imageOptimisationFunctionUrlNoScheme
    );
    const defaultFailoverOriginGroup = new origins.OriginGroup({
      primaryOrigin: serverFunctionOrigin,
      fallbackOrigin: assetsBucketOrigin,
      fallbackStatusCodes: [404],
    });

    const cdn = new cloudfront.Distribution(this, "CloudFront", {
      defaultBehavior: {
        origin: defaultFailoverOriginGroup,
      },
      additionalBehaviors: {
        "/_next/static/*": {
          origin: assetsBucketOrigin,
        },
        "/_next/image/*": {
          origin: imageOptimisationFunctionOrigin,
        },
        "/_next/data/*": {
          origin: serverFunctionOrigin,
        },
        "/api/*": {
          origin: serverFunctionOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
      },
    });
  }
}

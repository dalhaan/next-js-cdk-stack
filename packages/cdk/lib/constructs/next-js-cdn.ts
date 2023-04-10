import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { NextJsServerFunction } from "./next-js-server-function";
import { NextJsImageOptimisationFunction } from "./next-js-image-optimisation-function";

type Props = {
  assetsBucket: s3.Bucket;
  serverFunction: NextJsServerFunction;
  imageOptimisationFunction: NextJsImageOptimisationFunction;
};

export class NextJsCdn extends cloudfront.Distribution {
  constructor(scope: Construct, id: string, props: Props) {
    // origins
    const assetsBucketOrigin = new origins.S3Origin(props.assetsBucket);
    const serverFunctionOrigin = new origins.HttpOrigin(
      props.serverFunction.domainName
    );
    const imageOptimisationFunctionOrigin = new origins.HttpOrigin(
      props.imageOptimisationFunction.domainName
    );
    const defaultFailoverOriginGroup = new origins.OriginGroup({
      primaryOrigin: assetsBucketOrigin,
      fallbackOrigin: serverFunctionOrigin,
      fallbackStatusCodes: [403, 404],
    });

    super(scope, id, {
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

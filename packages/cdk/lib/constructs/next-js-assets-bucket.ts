import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { NextJsCdn } from "./next-js-cdn";

type Props = {
  openNextAssetsDir: string;
  openNextCacheDir: string;
} & Pick<s3.Bucket, "bucketName">;

export class NextJSAssetsBucket extends s3.Bucket {
  openNextAssetsDir: string;
  openNextCacheDir: string;

  constructor(scope: Construct, id: string, props: Props) {
    // Initialise bucket
    super(scope, id, {
      bucketName: props.bucketName,
    });

    this.openNextAssetsDir = props.openNextAssetsDir;
    this.openNextCacheDir = props.openNextCacheDir;
  }

  /**
   * Deploys assets to bucket and invalidates CloudFront distribution.
   * @param cdn CloudFront distribution to invalidate
   */
  deployAndInvalidate(cdn: NextJsCdn) {
    // Upload assets
    new s3Deploy.BucketDeployment(this, "DeployFiles", {
      sources: [
        s3Deploy.Source.asset(this.openNextAssetsDir),
        s3Deploy.Source.asset(this.openNextCacheDir),
      ],
      destinationBucket: this,
      retainOnDelete: false,
      distribution: cdn, // invalidate cdn's cache
      distributionPaths: ["/*"],
    });
  }
}

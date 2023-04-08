import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

type Props = {
  openNextAssetsDir: string;
} & Pick<s3.Bucket, "bucketName">;

export class NextJSAssetsBucket extends s3.Bucket {
  constructor(scope: Construct, id: string, props: Props) {
    // Initialise bucket
    super(scope, id, {
      bucketName: props.bucketName,
    });

    // Upload assets
    new s3Deploy.BucketDeployment(this, "DeployFiles", {
      sources: [s3Deploy.Source.asset(props.openNextAssetsDir)],
      destinationBucket: this,
      retainOnDelete: false,
    });
  }
}

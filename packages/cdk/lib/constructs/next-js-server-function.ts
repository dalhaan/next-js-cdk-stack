import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

import { getDomainNameFromUrl } from "../utils";

type Props = {
  assetsBucket: s3.Bucket;
  openNextServerDir: string;
};

export class NextJsServerFunction extends Construct {
  public domainName: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const serverFunction = new lambda.Function(this, "ServerFunctionLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(props.openNextServerDir),
      timeout: cdk.Duration.seconds(10),
    });

    // Server function environment variables
    serverFunction.addEnvironment("BUCKET_NAME", props.assetsBucket.bucketName);
    serverFunction.addEnvironment(
      "CACHE_BUCKET_NAME",
      props.assetsBucket.bucketName
    );
    serverFunction.addEnvironment("NODE_ENV", "production");
    serverFunction.addEnvironment("EXPERIMENTAL_CACHE_INTERCEPTION", "true");

    // Add function URL
    const serverFunctionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // Strip scheme (https://) from server function url to use for an HttpOrigin
    const domainName = getDomainNameFromUrl(serverFunctionUrl.url);

    // Allow read/write to assets bucket
    props.assetsBucket.grantReadWrite(serverFunction);

    this.domainName = domainName;
  }
}

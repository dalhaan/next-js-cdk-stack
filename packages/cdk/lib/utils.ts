import * as cdk from "aws-cdk-lib";

export const stripSchemeFromUrl = (url: string) =>
  cdk.Fn.select(2, cdk.Fn.split("/", url));

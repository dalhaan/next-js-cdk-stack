#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";

import { NextJsStack } from "../lib/stacks/next-js-stack";

const app = new cdk.App();
new NextJsStack(app, "OpenNextStack", {
  assetsBucketName: "opennext-assets",
});

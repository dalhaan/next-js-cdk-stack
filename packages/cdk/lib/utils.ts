import { createHash } from "node:crypto";
import * as cdk from "aws-cdk-lib";

/**
 * Strips the scheme from a URL.
 *
 * e.g.
 *
 * input: "https://www.google.com"
 *
 * output: "www.google.com"
 */
export const getDomainNameFromUrl = (url: string) =>
  cdk.Fn.select(2, cdk.Fn.split("/", url));

/**
 * Appends string with hash of itself.
 *
 * e.g.
 *
 * input: "opennextstack-assets-bucket"
 *
 * output: "opennextstack-assets-bucket-90777a99"
 */
export const appendHash = (plain: string) => {
  const hash = createHash("md5").update(plain).digest("hex").substring(0, 8);

  return `${plain}-${hash}`;
};

# NextJS CDK Stack

AWS CDK stack to provision the infra for and deploy a NextJS site on AWS using Open Next and AWS CDK.

## Quick start

```bash
yarn install # install project dependencies
yarn build # build NextJS site
yarn diff # verify CloudFormation diff
yarn deploy # provision and deploy stack
```

## Project structure

This repo is a monorepo with two packages, `open-next-test` and `cdk`.

`open-next-test` is a NextJS project that uses Open Next to create an AWS compatible production build.

`cdk` contains the code for provisioning the infra and deploying `open-next-test` to AWS.

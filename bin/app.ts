#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppRunnerStack } from '../lib/apprunner-stack';

const app = new cdk.App();

// Get configuration from environment variables or CDK context
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '703671892588',
  region: process.env.AWS_REGION || 'us-west-2',
};

const imageIdentifier = process.env.IMAGE_IDENTIFIER || app.node.tryGetContext('imageIdentifier');
const commitSha = process.env.COMMIT_SHA || app.node.tryGetContext('commitSha') || 'unknown';

new AppRunnerStack(app, 'AppRunnerDemoStack', {
  env,
  imageIdentifier,
  commitSha,
  ecrRepositoryName: 'apprunner-demo',
  appRunnerServiceName: 'AppRunnerDemoService',
  iamRoleName: 'AppRunnerECRAccessRole',
});

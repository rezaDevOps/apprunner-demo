import * as cdk from 'aws-cdk-lib';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AppRunnerStackProps extends cdk.StackProps {
  /**
   * Full ECR image URI with tag (e.g., 123456789.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123)
   */
  imageIdentifier?: string;

  /**
   * Git commit SHA to inject into the container
   */
  commitSha: string;

  /**
   * Name of the existing ECR repository
   */
  ecrRepositoryName: string;

  /**
   * Name for the App Runner service
   */
  appRunnerServiceName: string;

  /**
   * Name of the existing IAM role for App Runner ECR access
   */
  iamRoleName: string;
}

export class AppRunnerStack extends cdk.Stack {
  public readonly serviceUrl: cdk.CfnOutput;
  public readonly serviceArn: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: AppRunnerStackProps) {
    super(scope, id, props);

    // Reference existing ECR repository
    const ecrRepository = ecr.Repository.fromRepositoryName(
      this,
      'ECRRepository',
      props.ecrRepositoryName
    );

    // Reference existing IAM role (created manually to avoid propagation issues)
    const accessRole = iam.Role.fromRoleName(
      this,
      'AppRunnerECRAccessRole',
      props.iamRoleName
    );

    // Use placeholder image if not provided (for bootstrap/synth operations)
    const imageIdentifier = props.imageIdentifier ||
      `${props.env?.account}.dkr.ecr.${props.env?.region}.amazonaws.com/${props.ecrRepositoryName}:placeholder`;

    // Create App Runner service
    const service = new apprunner.CfnService(this, 'AppRunnerService', {
      serviceName: props.appRunnerServiceName,
      sourceConfiguration: {
        authenticationConfiguration: {
          accessRoleArn: accessRole.roleArn,
        },
        imageRepository: {
          imageIdentifier: imageIdentifier,
          imageRepositoryType: 'ECR',
          imageConfiguration: {
            port: '8080',
            runtimeEnvironmentVariables: [
              {
                name: 'COMMIT_SHA',
                value: props.commitSha,
              },
            ],
          },
        },
        autoDeploymentsEnabled: false,
      },
      instanceConfiguration: {
        cpu: '1024',
        memory: '2048',
      },
      healthCheckConfiguration: {
        protocol: 'HTTP',
        path: '/health',
        interval: 10,
        timeout: 5,
        healthyThreshold: 1,
        unhealthyThreshold: 5,
      },
      tags: [
        {
          key: 'Name',
          value: props.appRunnerServiceName,
        },
        {
          key: 'ManagedBy',
          value: 'CDK',
        },
      ],
    });

    // Outputs
    this.serviceUrl = new cdk.CfnOutput(this, 'ServiceURL', {
      description: 'The URL of the App Runner service',
      value: `https://${service.attrServiceUrl}`,
      exportName: 'AppRunnerServiceURL',
    });

    this.serviceArn = new cdk.CfnOutput(this, 'ServiceARN', {
      description: 'The ARN of the App Runner service',
      value: service.attrServiceArn,
      exportName: 'AppRunnerServiceARN',
    });

    new cdk.CfnOutput(this, 'ServiceId', {
      description: 'The ID of the App Runner service',
      value: service.attrServiceId,
    });

    new cdk.CfnOutput(this, 'ServiceStatus', {
      description: 'The status of the App Runner service',
      value: service.attrStatus,
    });

    new cdk.CfnOutput(this, 'ECRRepositoryURL', {
      description: 'The URL of the ECR repository',
      value: ecrRepository.repositoryUri,
    });
  }
}

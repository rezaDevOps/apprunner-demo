import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AppRunnerStack } from '../lib/apprunner-stack';

describe('AppRunnerStack', () => {
  let app: cdk.App;
  const defaultProps = {
    env: {
      account: '703671892588',
      region: 'us-west-2',
    },
    commitSha: 'abc123',
    ecrRepositoryName: 'apprunner-demo',
    appRunnerServiceName: 'AppRunnerDemoService',
    iamRoleName: 'AppRunnerECRAccessRole',
  };

  beforeEach(() => {
    app = new cdk.App();
  });

  test('creates App Runner service with correct configuration', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    // Verify App Runner service exists
    template.hasResourceProperties('AWS::AppRunner::Service', {
      ServiceName: 'AppRunnerDemoService',
      SourceConfiguration: {
        ImageRepository: {
          ImageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
          ImageRepositoryType: 'ECR',
          ImageConfiguration: {
            Port: '8080',
            RuntimeEnvironmentVariables: [
              {
                Name: 'COMMIT_SHA',
                Value: 'abc123',
              },
            ],
          },
        },
        AutoDeploymentsEnabled: false,
      },
      InstanceConfiguration: {
        Cpu: '1024',
        Memory: '2048',
      },
    });
  });

  test('creates health check configuration correctly', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppRunner::Service', {
      HealthCheckConfiguration: {
        Protocol: 'HTTP',
        Path: '/health',
        Interval: 10,
        Timeout: 5,
        HealthyThreshold: 1,
        UnhealthyThreshold: 5,
      },
    });
  });

  test('uses placeholder image when imageIdentifier not provided', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: undefined,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppRunner::Service', {
      SourceConfiguration: {
        ImageRepository: {
          ImageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:placeholder',
        },
      },
    });
  });

  test('propagates commitSha to environment variables', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      commitSha: 'test-commit-sha-123',
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppRunner::Service', {
      SourceConfiguration: {
        ImageRepository: {
          ImageConfiguration: {
            RuntimeEnvironmentVariables: Match.arrayWith([
              {
                Name: 'COMMIT_SHA',
                Value: 'test-commit-sha-123',
              },
            ]),
          },
        },
      },
    });
  });

  test('creates service with correct tags', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    // CDK sorts tags alphabetically, so ManagedBy comes before Name
    template.hasResourceProperties('AWS::AppRunner::Service', {
      Tags: [
        {
          Key: 'ManagedBy',
          Value: 'CDK',
        },
        {
          Key: 'Name',
          Value: 'AppRunnerDemoService',
        },
      ],
    });
  });

  test('creates all required CloudFormation outputs', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    // Verify all outputs exist
    template.hasOutput('ServiceURL', {
      Description: 'The URL of the App Runner service',
      Export: {
        Name: 'AppRunnerServiceURL',
      },
    });

    template.hasOutput('ServiceARN', {
      Description: 'The ARN of the App Runner service',
      Export: {
        Name: 'AppRunnerServiceARN',
      },
    });

    template.hasOutput('ServiceId', {
      Description: 'The ID of the App Runner service',
    });

    template.hasOutput('ServiceStatus', {
      Description: 'The status of the App Runner service',
    });

    template.hasOutput('ECRRepositoryURL', {
      Description: 'The URL of the ECR repository',
    });
  });

  test('configures instance resources correctly', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppRunner::Service', {
      InstanceConfiguration: {
        Cpu: '1024',
        Memory: '2048',
      },
    });
  });

  test('disables auto deployments', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppRunner::Service', {
      SourceConfiguration: {
        AutoDeploymentsEnabled: false,
      },
    });
  });

  test('snapshot test - validates entire template structure', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('creates exactly one App Runner service', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppRunner::Service', 1);
  });

  test('uses correct ECR repository type', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppRunner::Service', {
      SourceConfiguration: {
        ImageRepository: {
          ImageRepositoryType: 'ECR',
        },
      },
    });
  });

  test('configures service to listen on port 8080', () => {
    const stack = new AppRunnerStack(app, 'TestStack', {
      ...defaultProps,
      imageIdentifier: '703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:abc123',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppRunner::Service', {
      SourceConfiguration: {
        ImageRepository: {
          ImageConfiguration: {
            Port: '8080',
          },
        },
      },
    });
  });
});

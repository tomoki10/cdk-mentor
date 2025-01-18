import { SynthUtils } from '@aws-cdk/assert';

import { KubectlV24Layer } from '@aws-cdk/lambda-layer-kubectl-v24';
import * as cdk from 'aws-cdk-lib';

import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Patterns from 'aws-cdk-lib/aws-route53-patterns';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

// MEMO: The following modules are not available in the current CDK version
// import * as appconfig from '@aws-cdk/aws-appconfig';
// import * as apigatewayv2 rom 'aws-cdk-lib/aws-apigatewayv2';

import { CdkMentor } from '../src/index';

let stack: Stack;

describe('PascalCase Construct ID Check', () => {
  beforeEach(() => {
    const app = new cdk.App();
    stack = new Stack(app);
    cdk.Aspects.of(app).add(new CdkMentor());
  });

  test('PascalCase Construct ID', () => {
    new sns.Topic(stack, 'Test');
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });
  describe.each`
    testTitle             | constructId
    ${'camelCase'}        | ${'testData'}
    ${'snake_case'}       | ${'test_data'}
    ${'kebab-case'}       | ${'test-data'}
    ${'UPPER_SNAKE_CASE'} | ${'TEST_Data'}
    ${'UPPERCASE'}        | ${'TESTDATA'}
    ${'lowercase'}        | ${'testdata'}
    ${'Title Case'}       | ${'Test data'}
    ${'dot.case'}         | ${'test.data'}
    ${'Train-Case'}       | ${'Test-Data'}
    ${'UPPER-TRAIN-CASE'} | ${'TEST-DATA'}
  `('$testTitle test pattern constructId: $constructId', ({ constructId }) => {
    test('NOT PascalCase Construct ID', () => {
      new sns.Topic(stack, constructId);
      const messages = SynthUtils.synthesize(stack).messages;
      expect(messages).toContainEqual(
        expect.objectContaining({
          entry: expect.objectContaining({
            data: expect.stringMatching('.*[ERR:001]*'),
          }),
        }),
      );
    });
  });
});

describe('CDK core constructs with non-PascalCase resources', () => {
  beforeEach(() => {
    const app = new cdk.App();
    stack = new Stack(app);
    cdk.Aspects.of(app).add(new CdkMentor());
  });

  /**
   * Sample Cfn Template
   *
   * "BooksApiDeploymentStageprod0693B760": {
   *   "Type": "AWS::ApiGateway::Stage",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/BooksApi/DeploymentStage.prod/Resource"
   *   }
   * },
   * "BooksApiANY0C4EABE3": {
   *   "Type": "AWS::ApiGateway::Method",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/BooksApi/ANY/Resource"
   *   }
   * },
   * "BooksApiBooksbookid866FE5CE": {
   *   "Type": "AWS::ApiGateway::Resource",
   *   ...
   *  "Metadata": {
   *    "aws:cdk:path": "Stack/BooksApi/Books/{book_id}/Resource"
   *  }
   * },
   *
   */
  test('Verify that API Gateway exists but does not raise an error', () => {
    const api = new apigateway.RestApi(stack, 'BooksApi');
    api.root.addMethod('ANY');
    const books = api.root.addResource('Books');
    books.addResource('{book_id}');
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ApiGateway::Stage', 1);
    template.resourceCountIs('AWS::ApiGateway::Method', 1);
    template.resourceCountIs('AWS::ApiGateway::Resource', 2);
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });

  /**
   * Sample Cfn Template
   *
   * "EventSourceMapping": {
   *   "Type": "AWS::Lambda::EventSourceMapping",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/LamDesFn/SqsEventSource:SandboxStackMyQueue3457E9E6/Resource"
   *   }
   * }
   */
  test('Verify that EventSourceMapping exists but does not raise an error', () => {
    const fn = new lambda.Function(stack, 'LamDesFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromInline('exports.handler = async () => {};'),
    });
    const queue = new sqs.Queue(stack, 'MyQueue');
    fn.addEventSource(new cdk.aws_lambda_event_sources.SqsEventSource(queue));
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Lambda::EventSourceMapping', 1);
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });

  /**
   * Sample Cfn Template
   *
   * "HttpApiGETbooksGetBooksIntegration62C21291": {
   *   "Type": "AWS::ApiGatewayV2::Integration",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/HttpApi/GET--books/GetBooksIntegration/Resource"
   *   }
   * }
   *
   * "HttpApiGETbooksF1B941B8": {
   *   "Type": "AWS::ApiGatewayV2::Route",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/HttpApi/GET--books/Resource"
   *   }
   * }
   * "BookStoreDefaultFnCustomRulePermissionn8NniGbw5Nkfrt94qGvLZ4YxlvUmRph2170mPuz9yXwBA47C678": {
   *  "Type": "AWS::Lambda::Permission",
   *  ...
   *  "Metadata": {
   *    "aws:cdk:path": "Stack/BookStoreDefaultFn/CustomRulePermissionn8NniGbw5Nkfrt94qGvLZ4YxlvUmRph2170mPuz9yXw="
   *  }
   * }
   */
  // This construct does not exist in the current version.
  // This test will be implemented when cdk version 2.112.0 or later is used.
  // See: https://github.com/aws/aws-cdk/releases/tag/v2.112.0

  /**
   * Sample Cfn Template
   *
   * "MyHostedConfigDeploymentA4784DFF660C3": {
   *   "Type": "AWS::AppConfig::Deployment",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/MyHostedConfig/DeploymentA4784"
   *   }
   * }
   */
  // This construct does not exist in the current version.
  // This test will be implemented when cdk version 2.130.0 or later is used.
  // See: https://github.com/aws/aws-cdk/releases/tag/v2.130.0

  /**
   * Sample Cfn Template
   *
   * "VpcPublicSubnet1EIPD7E02669": {
   *   "Type": "AWS::EC2::EIP",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/Vpc/PublicSubnet1/EIP"
   *   }
   * },
   * "VpcIGWACA8CB6D": {
   *   "Type": "AWS::EC2::InternetGateway",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/Vpc/Vpc/IGW"
   *   }
   * },
   * "VpcVPCGW5EA121D2": {
   *   "Type": "AWS::EC2::VPCGatewayAttachment",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/Vpc/Vpc/VPCGW"
   *   }
   * }
   */
  test('Verify that EIP/IGW/VPCGatewayAttachment exists but does not raise an error', () => {
    new ec2.Vpc(stack, 'Vpc', {});
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::EIP', 2);
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    template.resourceCountIs('AWS::EC2::VPCGatewayAttachment', 1);
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });

  /**
   * Sample Cfn Template
   *
   * "AsgASGD1D7B4E2": {
   *   "Type": "AWS::AutoScaling::AutoScalingGroup",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/Asg/ASG"
   *   }
   * }
   */
  test('Verify that AutoScalingGroup exists but does not raise an error', () => {
    const vpc = new ec2.Vpc(stack, 'Vpc', {});
    new autoscaling.AutoScalingGroup(stack, 'Asg', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::AutoScaling::AutoScalingGroup', 1);
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });

  /**
   * Sample Cfn Template
   *
   * "SecurityGroupName": {
   *   Type": "AWS::EC2::SecurityGroupEgress",
   *   "Properties": {
   *     "Description": "to SecurityGroupA11500E8:80",
   *   ...
   *    "Metadata": {
   *      "aws:cdk:path": "Stack/Sg/SecurityGroupId/to SecurityGroupA11500E8:80"
   *   }
   * }
   */
  test('Verify that SecurityGroupEgress exists but does not raise an error', () => {
    const vpc = new ec2.Vpc(stack, 'Vpc', {});
    const securityGroup = new ec2.SecurityGroup(stack, 'SecurityGroup', {
      vpc,
      allowAllOutbound: false,
    });
    const securityGroup2 = new ec2.SecurityGroup(stack, 'SecurityGroup2', {
      vpc,
    });
    securityGroup.addEgressRule(securityGroup2, ec2.Port.allTcp());
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      Description: Match.stringLikeRegexp('to '),
    });
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });

  /**
   * Sample Cfn Template
   *
   * "SecurityGroupName": {
   *   Type": "AWS::EC2::SecurityGroupIngress",
   *   "Properties": {
   *     "Description": "from SecurityGroupA11500E8:80",
   *   ...
   *    "Metadata": {
   *      "aws:cdk:path": "Stack/Sg/SecurityGroupId/from SecurityGroupA11500E8:80"
   *   }
   * }
   */
  test('Verify that SecurityGroupIngress exists but does not raise an error', () => {
    const vpc = new ec2.Vpc(stack, 'Vpc', {});
    const securityGroup = new ec2.SecurityGroup(stack, 'SecurityGroup', {
      vpc,
    });
    const securityGroup2 = new ec2.SecurityGroup(stack, 'SecurityGroup2', {
      vpc,
    });
    securityGroup.addIngressRule(securityGroup2, ec2.Port.allTcp());
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      Description: Match.stringLikeRegexp('from '),
    });
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });

  /**
   * Sample Cfn Template
   *
   * "awscdkawseksKubectlProviderNestedStackawscdkawseksKubectlProviderNestedStackResourceA7AEBA6B": {
   *   "Type": "AWS::CloudFormation::Stack",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/@aws-cdk--aws-eks.KubectlProvider.NestedStack/@aws-cdk--aws-eks.KubectlProvider.NestedStackResource",
   *   }
   * }
   */
  test('Verify that CloudFormation::Stack exists but does not raise an error', () => {
    new eks.Cluster(stack, 'HelloEks', {
      version: eks.KubernetesVersion.V1_24,
      kubectlLayer: new KubectlV24Layer(stack, 'Kubectl'),
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFormation::Stack', 2);
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      })[0], // MEMO: EKS L2 construct includes two CloudFormation::Stack
    );
  });

  /**
   * Sample Cfn Template
   *
   * "Route53RedirectRedirectDistributionCFDistributionFD10977D": {
   *   "Type": "AWS::CloudFront::Distribution",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/Route53Redirect/RedirectDistribution/CFDistribution"
   *   }
   * }
   */
  test('Verify that CloudFront::Distribution exists but does not raise an error', () => {
    new route53Patterns.HttpsRedirect(stack, 'Route53Redirect', {
      recordNames: ['foo.example.com'],
      targetDomain: 'bar.example.com',
      zone: route53.HostedZone.fromHostedZoneAttributes(stack, 'Route53HostedZone2', {
        hostedZoneId: 'ID',
        zoneName: 'example.com',
      }),
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    // MEMO: No error in case of CFDistribution
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });

  /**
   * Sample Cfn Template
   *
   * "TopichttpsfoobarcomE7064E32": {
   *   "Type": "AWS::SNS::Subscription",
   *   "Properties": {
   *     "Endpoint": "https://foobar.com/",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/Topic2/https:----foobar.com--/Resource"
   *   }
   * }
   */
  test('Verify that SNS::Subscription exists but does not raise an error', () => {
    const topic = new sns.Topic(stack, 'Topic');
    topic.addSubscription(new snsSubscriptions.UrlSubscription('https://foobar.com/'));
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SNS::Subscription', 1);
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });

  /**
   * Sample Cfn Template
   *
   * "PatternsServiceLBPublicListener4CEFDB78": {
   *   Type": "AWS::ElasticLoadBalancingV2::Listener",
   *   ...
   *    "Metadata": {
   *      "aws:cdk:path": "Stack/PatternsService/LB/PublicListener/Resource"
   *   }
   * },
   * "PatternsServiceLBPublicListenerECSGroupCDF3FD59": {
   *   Type": "AWS::ElasticLoadBalancingV2::TargetGroup",
   *   ...
   *    "Metadata": {
   *      "aws:cdk:path": "Stack/PatternsService/LB/PublicListener/ECSGroup/Resource"
   *   }
   * }
   */
  test('Verify that ElasticLoadBalancingV2 exists but does not raise an error. Only when using EcsPatterns', () => {
    const vpc = new ec2.Vpc(stack, 'Vpc', {});
    const cluster = new ecs.Cluster(stack, 'Cluster', {
      vpc,
    });
    cluster.addCapacity('DefaultAutoScalingGroupCapacity', {
      instanceType: new ec2.InstanceType('t2.small'),
      desiredCapacity: 3,
    });
    new ecsPatterns.ApplicationLoadBalancedEc2Service(stack, 'PatternsService', {
      cluster,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('test'),
        command: ['command'],
        entryPoint: ['entry', 'point'],
      },
      desiredCount: 1,
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
    // MEMO: No error in case of LB or ECSGroup
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      })[0], // MEMO: Since ECS Patterns contains Nested Stacks internally, specify index 0
    );
  });

  /**
   * Sample Cfn Template
   *
   * "UserPoolsmsRole4EA729DD": {
   *   "Type": "AWS::IAM::Role",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "Stack/UserPool/ssmRole/Resource"
   *   }
   * }
   */
  test('Verify that `smsRole` exists but does not raise an error', () => {
    new cognito.UserPool(stack, 'UserPool', {
      userPoolName: 'test-user-pool',
      mfa: cdk.aws_cognito.Mfa.OPTIONAL,
    });
    const template = Template.fromStack(stack);
    // MEMO: Verify smsRole using fixed policy name 'sns-publish' as it only exists in Metadata
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: [
        {
          PolicyName: 'sns-publish',
        },
      ],
    });
    const messages = SynthUtils.synthesize(stack).messages;
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[ERR:001]*'),
        }),
      }),
    );
  });
});

describe("Avoid 'Stack' or 'Construct' in Construct names", () => {
  describe.each`
    testTitle                       | constructId
    ${'stack in resource name'}     | ${'TestStack'}
    ${'construct in resource name'} | ${'TestConstruct'}
    ${'stack in resource name'}     | ${'StackTest'}
    ${'construct in resource name'} | ${'ConstructTest'}
  `('$testTitle test pattern constructId: $constructId', ({ constructId }) => {
    test("Avoid 'Stack' or 'Construct' in Construct names", () => {
      const app = new cdk.App();
      stack = new Stack(app, 'Stack', {});
      cdk.Aspects.of(app).add(new CdkMentor());

      new sns.Topic(stack, constructId);
      const messages = SynthUtils.synthesize(stack).messages;

      expect(messages).toContainEqual(
        expect.objectContaining({
          entry: expect.objectContaining({
            data: expect.stringMatching('.*[WARN:001]*'),
          }),
        }),
      );
    });
  });

  /**
   * Sample Cfn Template
   * "BooksApiGETApiPermissionTestStackBooksApiA2CED8D6GET911FB15C": {
   *   "Type": "AWS::Lambda::Permission",
   *   ...
   *   "Metadata": {
   *     "aws:cdk:path": "TestStack/BooksApi/Default/GET/ApiPermission.TestStackBooksApiA2CED8D6.GET.."
   *   }
   * }
   */
  test('No warning when NOT using Stack or Construct in Construct names', () => {
    const app = new cdk.App();
    stack = new Stack(app, 'Stack', {});
    cdk.Aspects.of(app).add(new CdkMentor());

    const api = new apigateway.RestApi(stack, 'BooksApi');
    const fn = new lambda.Function(stack, 'LamDesFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromInline('exports.handler = async () => {};'),
    });
    api.root.addMethod('GET', new apigateway.LambdaIntegration(fn));

    const messages = SynthUtils.synthesize(stack).messages;

    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[WARN:001]*'),
        }),
      }),
    );
  });
});

describe('Detecte strong cross-stack references ', () => {
  class TestStack extends cdk.Stack {
    readonly testTopic: sns.Topic;
    constructor(scope: Construct, id: string, props: cdk.StackProps) {
      super(scope, id, props);
      this.testTopic = new sns.Topic(this, 'TestTopic', {});
    }
  }
  interface AnotherTestStackProps extends cdk.StackProps {
    testTopic: sns.Topic;
  }
  class AnotherTestStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AnotherTestStackProps) {
      super(scope, id, props);
      const testTopic = props.testTopic;
      const queue = new sqs.Queue(this, 'TestQueue');
      testTopic.addSubscription(new snsSubscriptions.SqsSubscription(queue));
    }
  }
  test('Issue a warning when using strong cross-stack references', () => {
    const app = new cdk.App();
    const testStack = new TestStack(app, 'TestStack', {});
    const anotherStack = new AnotherTestStack(app, 'AnotherStack', { testTopic: testStack.testTopic });

    cdk.Aspects.of(app).add(new CdkMentor());
    const messages = SynthUtils.synthesize(anotherStack).messages;

    expect(messages).toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[WARN:003]*'),
        }),
      }),
    );
  });

  test('No infomation when NOT using strong cross-stack references', () => {
    const app = new cdk.App();
    new TestStack(app, 'TestStack', {});
    const testStack2 = new TestStack(app, 'TestStack2', {});

    cdk.Aspects.of(app).add(new CdkMentor());
    const messages = SynthUtils.synthesize(testStack2).messages;

    expect(messages).not.toContainEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          data: expect.stringMatching('.*[WARN:003]*'),
        }),
      }),
    );
  });
});

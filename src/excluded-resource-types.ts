// Exclude AWS resources that contain non-PascalCase paths.
export const EXCLUDED_RESOURCE_TYPES = new Set([
  'AWS::ApiGateway::Stage',
  'AWS::ApiGateway::Method',
  'AWS::ApiGateway::Resource',
  'AWS::Lambda::EventSourceMapping',
  'AWS::EC2::EIP',
  'AWS::EC2::InternetGateway',
  'AWS::EC2::VPCGatewayAttachment',
  'AWS::AutoScaling::AutoScalingGroup',
  'AWS::EC2::SecurityGroupIngress',
  'AWS::EC2::SecurityGroupEgress',
  'AWS::CloudFormation::Stack',
  'AWS::CloudFront::Distribution',
  'AWS::SNS::Subscription',
  // ↓ No Test Added
  'AWS::ApiGatewayV2::Integration',
  'AWS::ApiGatewayV2::Route',
  'AWS::Lambda::Permission',
  'AWS::AppConfig::Deployment',
]);

export const EXCLUDED_PREFIX_NAMES = [
  'Custom::',
  // KubectlV24Layer Only
  'framework-',
  'waiter-state-machine',
];

interface RESOURCE_AND_NAME_PATTERN {
  resourceType: string;
  namePattern: string;
}

export const EXCLUDED_RESOURCE_AND_NAME_PATTERNS: RESOURCE_AND_NAME_PATTERN[] = [
  // ecs-patterns
  {
    resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
    namePattern: 'LB',
  },
  // cognito
  {
    resourceType: 'AWS::IAM::Role',
    namePattern: 'smsRole',
  },
];

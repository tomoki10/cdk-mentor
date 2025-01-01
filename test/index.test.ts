import { SynthUtils } from '@aws-cdk/assert';

import * as cdk from 'aws-cdk-lib';

// MEMO: We'll use SNS to test, as it requires actual resources in the Cfn template.
import { Stack, aws_sns as sns, aws_sqs as sqs } from 'aws-cdk-lib';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
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
      testTopic.addSubscription(new SqsSubscription(queue));
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

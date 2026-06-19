import { Stack, CfnOutput, Duration } from 'aws-cdk-lib';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Rule } from 'aws-cdk-lib/aws-events';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Topic, CfnSubscription } from 'aws-cdk-lib/aws-sns';

export class SharedResourcesStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const { githubConnectionArn } = props;

    new CfnOutput(this, 'GitHubConnectionArn', {
      value: githubConnectionArn,
      exportName: 'GlobalGitHubConnectionArn',
    });

    const deploymentNotificationTopic = new Topic(this, 'DeploymentNotification', {
      topicName: 'deployment-notification',
    });

    const slackBotTokenSecret = Secret.fromSecretNameV2(
      this,
      'SlackBotToken',
      'slackBotToken'
    );

    const processPipelineStates = new NodejsFunction(this, 'ProcessPipelineStates', {
      functionName: 'process-pipeline-states',
      entry: 'lambda/process-pipeline-states/index.js',
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
      environment: {
        SLACK_BOT_TOKEN_SECRET_NAME: slackBotTokenSecret.secretName,
      },
    });

    slackBotTokenSecret.grantRead(processPipelineStates);

    processPipelineStates.addPermission('AllowSnsSubscription', {
      principal: new ServicePrincipal('sns.amazonaws.com'),
      sourceArn: deploymentNotificationTopic.topicArn,
    });

    new CfnSubscription(this, 'ProcessPipelineStatesDeploymentNotification', {
      topicArn: deploymentNotificationTopic.topicArn,
      protocol: 'lambda',
      endpoint: processPipelineStates.functionArn,
    });

    const codePipelineExecutionStateChangeRule = new Rule(
      this,
      'CodePipelineExecutionStateChangeRule',
      {
        description:
          'Routes all CodePipeline pipeline execution state changes to deployment-notification',
        eventPattern: {
          source: ['aws.codepipeline'],
          detailType: ['CodePipeline Pipeline Execution State Change'],
        },
      }
    );

    deploymentNotificationTopic.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AllowEventBridgePublish',
        principals: [new ServicePrincipal('events.amazonaws.com')],
        actions: ['sns:Publish'],
        resources: [deploymentNotificationTopic.topicArn],
        conditions: {
          ArnEquals: {
            'aws:SourceArn': codePipelineExecutionStateChangeRule.ruleArn,
          },
        },
      })
    );

    codePipelineExecutionStateChangeRule.addTarget({
      bind: () => ({ arn: deploymentNotificationTopic.topicArn }),
    });
  }
}

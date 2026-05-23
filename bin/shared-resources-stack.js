import { Stack, CfnOutput } from 'aws-cdk-lib';

export class SharedResourcesStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const { githubConnectionArn } = props;

    new CfnOutput(this, 'GitHubConnectionArn', {
      value: githubConnectionArn,
      exportName: 'GlobalGitHubConnectionArn',
    });
  }
}

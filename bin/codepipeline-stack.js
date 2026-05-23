import { Stack, pipelines } from 'aws-cdk-lib';
import { ProductionStage } from './production-stage.js';

const { CodePipeline, CodePipelineSource, ShellStep } = pipelines;

export class CodepipelineStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const githubConnectionArn =
      'arn:aws:codeconnections:us-east-1:010273536955:connection/f0bd2be2-0bc1-4bb1-8843-1f0148e0bba3';

    const pipeline = new CodePipeline(this, 'shared-resources-pipeline', {
      pipelineName: 'SharedResourcesPipeline',
      selfMutation: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('bnreine/shared-resources', 'main', {
          connectionArn: githubConnectionArn,
          triggerOnPush: true, // Automatically runs on git push
        }),
        commands: ['npm install', 'npx cdk synth'],
      }),
    });

    pipeline.addStage(
      new ProductionStage(this, 'production-stage', {
        ...props,
        githubConnectionArn,
      })
    );
    pipeline.buildPipeline();
  }
}

import { App } from 'aws-cdk-lib';
import { CodepipelineStack } from './codepipeline-stack.js';

const app = new App();

new CodepipelineStack(app, 'shared-resources-pipeline', {});

app.synth();

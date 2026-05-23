import { Stage } from 'aws-cdk-lib';
import { SharedResourcesStack } from './shared-resources-stack.js';

export class ProductionStage extends Stage {
  constructor(scope, id, props) {
    super(scope, id, props);

    new SharedResourcesStack(this, 'shared-resources-stack', props);
  }
}
